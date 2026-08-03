import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Plane, Radio, ChevronRight, ChevronDown, X, Play, Pause, RotateCcw, Wifi, WifiOff, Navigation2,
  Route, MapPin, Waypoints, Signpost, Layers, Map as MapIcon, CloudSun, Gauge, Fuel, FileText,
  Settings as SettingsIcon, Sun, Moon, User, Star, Edit3, Share2, ArrowLeftRight, Trash2, Plus,
  ZoomIn, ZoomOut, Maximize2, ChevronsUpDown, Save, FolderOpen, Check,
} from "lucide-react";

import RFD_DATA from "./data/index.js";

// ---------- helpers ----------

function normalizeAirports() {
  const list = [{ icao: "IRFD", name: "New Rockford Intl" }];
  RFD_DATA.airports.forEach((a) => {
    if (a.icao !== "IRFD") list.push({ icao: a.icao, name: a.name || a.icao });
  });
  return list;
}
const AIRPORTS = normalizeAirports();
const AIRPORTS_WITH_DATA = Object.keys(RFD_DATA.sids); // airports that have any procedure data at all
function runwaysFor(icao) {
  return (RFD_DATA.runwaysByAirport && RFD_DATA.runwaysByAirport[icao]) || [];
}

// some charts (e.g. WNNDY3) give one universal instruction with no per-runway
// breakdown - stored as rwys:['ALL'], which should match any selected runway.
function rwysMatch(rwys, rwy) {
  return rwys.includes("ALL") || rwys.includes(rwy);
}

function sidsForRunway(icao, rwy) {
  const list = (RFD_DATA.sids && RFD_DATA.sids[icao]) || [];
  return list.filter((s) => s.rwyProcs.some((rp) => rwysMatch(rp.rwys, rwy)));
}
function starsForRunway(icao, rwy) {
  const list = (RFD_DATA.stars && RFD_DATA.stars[icao]) || [];
  return list.filter((s) => s.rwyProcs.some((rp) => rwysMatch(rp.rwys, rwy)));
}

// turn a raw token stream [{t:'F',n,alt}|{t:'T',d}|{t:'H',n}] into ordered nodes
function tokensToNodes(tokens, phase) {
  const nodes = [];
  let pendingTrack = null;
  let pendingHold = null;
  (tokens || []).forEach((tok) => {
    if (tok.t === "T") pendingTrack = tok.d;
    else if (tok.t === "H") pendingHold = tok.n;
    else if (tok.t === "F") {
      nodes.push({
        name: tok.n,
        trackIn: pendingTrack,
        alt: tok.alt || null,
        phase,
        hold: pendingHold === tok.n ? true : false,
      });
      pendingTrack = null;
      pendingHold = null;
    }
  });
  return nodes;
}

// dedupe consecutive nodes with the same fix name (keep the richer one)
function dedupeNodes(nodes) {
  const out = [];
  for (const n of nodes) {
    const prev = out[out.length - 1];
    if (prev && prev.name === n.name) {
      if (n.trackIn != null && prev.trackIn == null) prev.trackIn = n.trackIn;
      if (n.alt && !prev.alt) prev.alt = n.alt;
      continue;
    }
    out.push({ ...n });
  }
  return out;
}

function buildRoute(cfg) {
  const {
    adep, adepRwy, sidIdx, sidTransIdx,
    enrouteFixes,
    starIdx, starTransIdx,
    ades, adesRwy,
  } = cfg;

  let nodes = [];
  let sidCodeStr = null;
  let starCodeStr = null;

  if (RFD_DATA.sids[adep] && sidIdx != null) {
    const sid = RFD_DATA.sids[adep][sidIdx];
    const rp = sid.rwyProcs.find((r) => rwysMatch(r.rwys, adepRwy));
    const rpNodes = tokensToNodes(rp ? rp.legs : [], "SID");
    nodes.push({ name: adep, trackIn: null, alt: null, phase: "DEP", isAirport: true });
    nodes.push(...rpNodes);
    if (sidTransIdx != null) {
      const trans = sid.transitions[sidTransIdx];
      nodes.push(...tokensToNodes(trans.legs, "SID"));
      sidCodeStr = trans.code;
    } else {
      sidCodeStr = sid.code;
    }
  } else {
    nodes.push({ name: adep, trackIn: null, alt: null, phase: "DEP", isAirport: true });
  }

  enrouteFixes.forEach((f) => {
    nodes.push({ name: f, trackIn: null, alt: null, phase: "ENROUTE" });
  });

  if (RFD_DATA.stars[ades] && starIdx != null) {
    const star = RFD_DATA.stars[ades][starIdx];
    if (starTransIdx != null && star.entryTransitions[starTransIdx]) {
      const trans = star.entryTransitions[starTransIdx];
      nodes.push(...tokensToNodes(trans.legs, "STAR"));
      starCodeStr = trans.code;
    } else {
      starCodeStr = star.code;
    }
    const rp = star.rwyProcs.find((r) => rwysMatch(r.rwys, adesRwy));
    nodes.push(...tokensToNodes(rp ? rp.legs : [], "STAR"));
  }
  nodes.push({ name: ades, trackIn: null, alt: null, phase: "ARR", isAirport: true });

  nodes = dedupeNodes(nodes);

  const enrouteNames = enrouteFixes.length ? enrouteFixes.join(" DCT ") : null;
  const parts = [
    `${adep}/${adepRwy || "?"}`,
    sidCodeStr,
    enrouteNames,
    starCodeStr,
    `${adesRwy ? adesRwy + "/" : ""}${ades}`,
  ].filter(Boolean);

  return { nodes, routeString: parts.join(" ") };
}

// find which leg (index of the *arriving* node) best matches a live heading/altitude
function matchCurrentLegIndex(nodes, heading, altitude) {
  let best = -1;
  let bestScore = Infinity;
  for (let i = 1; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.trackIn == null) continue;
    let diff = Math.abs(((heading - n.trackIn + 540) % 360) - 180);
    best === -1 && (bestScore = diff);
    if (diff <= bestScore) {
      bestScore = diff;
      best = i;
    }
  }
  return best === -1 ? Math.min(1, nodes.length - 1) : best;
}

const PHASE_COLOR = {
  DEP: "var(--text-dim)",
  SID: "var(--amber)",
  ENROUTE: "var(--text)",
  STAR: "var(--cyan)",
  ARR: "var(--text-dim)",
};

// ---------- schematic 2D layout ----------
// We don't have real stud coordinates, and most legs only give a heading (no
// distance), so this lays fixes out at the CORRECT relative angle from each
// other using a fixed arbitrary leg length. It's schematic, not to scale -
// same spirit as the source charts themselves (one of which literally says
// "NOT TO SCALE"). Legs with no known heading (freely-chosen enroute fixes)
// just continue the previous heading in a straight line.
const SEGMENT_LEN = 46;
function computeSchematicPositions(nodes) {
  let x = 0, y = 0, lastHeading = 0;
  return nodes.map((n, i) => {
    if (i === 0) return { ...n, x: 0, y: 0 };
    const heading = n.trackIn != null ? n.trackIn : lastHeading;
    lastHeading = heading;
    const rad = (heading * Math.PI) / 180;
    x += Math.sin(rad) * SEGMENT_LEN;
    y -= Math.cos(rad) * SEGMENT_LEN;
    return { ...n, x, y };
  });
}

function Select({ value, onChange, options, placeholder, disabled }) {
  return (
    <div className="gw-select-wrap">
      <select
        className="gw-select"
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={13} className="gw-select-chevron" />
    </div>
  );
}

function FixPicker({ fixes, onAdd, onRemove }) {
  const [q, setQ] = useState("");
  const all = useMemo(() => {
    const wp = RFD_DATA.waypoints.map((w) => ({ name: w, kind: "FIX" }));
    const nv = RFD_DATA.navaids.map((n) => ({ name: n.ident, kind: n.type, full: n.name }));
    return [...nv, ...wp];
  }, []);
  const matches = useMemo(() => {
    if (!q.trim()) return [];
    const qq = q.trim().toUpperCase();
    return all.filter((f) => f.name.startsWith(qq)).slice(0, 8);
  }, [q, all]);

  return (
    <div className="gw-fixpicker">
      <div className="gw-chips">
        {fixes.map((f, i) => (
          <span className="gw-chip" key={f + i}>
            {f}
            <X size={11} className="gw-chip-x" onClick={() => onRemove(i)} />
          </span>
        ))}
      </div>
      <div className="gw-fixinput-wrap">
        <input
          className="gw-input"
          placeholder="Add enroute fix / navaid…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && q.trim()) {
              onAdd(q.trim().toUpperCase());
              setQ("");
            }
          }}
        />
        {matches.length > 0 && (
          <div className="gw-suggest">
            {matches.map((m) => (
              <div
                key={m.name}
                className="gw-suggest-row"
                onClick={() => { onAdd(m.name); setQ(""); }}
              >
                <span className="gw-suggest-name">{m.name}</span>
                <span className="gw-suggest-kind">{m.kind}{m.full ? ` · ${m.full}` : ""}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="gw-field">
      <label className="gw-field-label">{label}</label>
      {children}
    </div>
  );
}

// ---------- sidebar shell ----------

const NAV_SECTIONS = [
  { id: "flightplan", label: "Flight Plan", icon: Route, active: true },
  { id: "routes", label: "Routes", icon: Waypoints, active: false },
  { id: "airports", label: "Airports", icon: MapPin, active: false },
  { id: "sidstar", label: "SID / STAR", icon: Signpost, active: false },
  { id: "approach", label: "Approach", icon: Navigation2, active: false },
  { id: "airspace", label: "Airspace", icon: Layers, active: false },
  { id: "map", label: "Map", icon: MapIcon, active: false },
  { id: "weather", label: "Weather", icon: CloudSun, active: false },
  { id: "performance", label: "Performance", icon: Gauge, active: false },
  { id: "fuel", label: "Fuel", icon: Fuel, active: false },
  { id: "documents", label: "Documents", icon: FileText, active: false },
];

function Sidebar({ section, setSection }) {
  return (
    <aside className="gw-sidebar">
      <div className="gw-sidebar-brand">
        <Navigation2 size={20} strokeWidth={2.4} className="gw-brand-mark" />
        <span className="gw-brand-word">GATEWAY</span>
      </div>
      <nav className="gw-sidebar-nav">
        {NAV_SECTIONS.map((item) => {
          const Icon = item.icon;
          const isActive = section === item.id;
          return (
            <button
              key={item.id}
              className={"gw-navitem" + (isActive ? " active" : "") + (!item.active ? " dimmed" : "")}
              onClick={() => setSection(item.id)}
            >
              <Icon size={16} strokeWidth={2} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="gw-sidebar-status">
        <div className="gw-status-title">MVP DATA</div>
        <div className="gw-status-row"><span className="gw-status-dot live" />Rockford · Tokyo · Perth</div>
        <div className="gw-status-sub">12 SIDs · 12 STARs digitized</div>
      </div>
      <button
        className={"gw-navitem gw-settings-btn" + (section === "settings" ? " active" : "")}
        onClick={() => setSection("settings")}
      >
        <SettingsIcon size={16} strokeWidth={2} />
        <span>Settings</span>
      </button>
    </aside>
  );
}

function TopBar() {
  return (
    <header className="gw-topbar">
      <div className="gw-topbar-spacer" />
      <div className="gw-topbar-right">
        <span className="gw-network-pill">PTFS ATC24 <ChevronDown size={13} /></span>
        <button className="gw-iconbtn-ghost" title="Toggle theme (dark only, for now)"><Moon size={15} /></button>
        <button className="gw-iconbtn-ghost" title="Account"><User size={15} /></button>
      </div>
    </header>
  );
}

function PlaceholderPage({ label, icon: Icon, blurb }) {
  return (
    <div className="gw-placeholder">
      <div className="gw-placeholder-icon"><Icon size={26} strokeWidth={1.6} /></div>
      <div className="gw-placeholder-title">{label}</div>
      <div className="gw-placeholder-blurb">{blurb}</div>
      <div className="gw-placeholder-tag">Not built yet</div>
    </div>
  );
}

const PLACEHOLDER_BLURBS = {
  routes: "Save and reuse your own flight plans across sessions. Right now, use Save on the Flight Plan page - a dedicated library view is next.",
  airports: "Browse every airport in ATC24 with its runways, navaids, and which procedures are published. Rockford, Tokyo, and Perth already have full data behind the scenes.",
  sidstar: "A searchable library of every digitized SID and STAR, independent of building a specific route. Pick departure/arrival on Flight Plan for now.",
  approach: "Approach plates haven't been digitized yet - none have been uploaded so far.",
  airspace: "Sector boundaries and controller positions, pulled live from 24data's /controllers endpoint.",
  map: "A live traffic overview across all of ATC24, not tied to one flight plan. The Flight Plan page already has a route-specific map.",
  weather: "Live ATIS per airport, pulled from 24data's /atis endpoint - the data exists, this view doesn't yet.",
  performance: "Real aircraft performance numbers aren't available for ATC24's aircraft yet, so this stays empty rather than showing made-up figures.",
  fuel: "Same as Performance - no real fuel burn data to show yet, so nothing here is invented.",
  documents: "Chart images and reference documents per airport. We have some raw chart uploads from this session; not wired into the app as viewable assets yet.",
};

// ---------- route header ----------

function RouteHeader({ adep, ades, adepName, adesName, onReverse, onClear, onSave, onShare, savedRoutes, onLoad }) {
  const [showLoad, setShowLoad] = useState(false);
  return (
    <div className="gw-routeheader">
      <div className="gw-routeheader-title">
        <span>{adep || "????"}</span>
        <ChevronRight size={22} strokeWidth={2.5} />
        <span>{ades || "????"}</span>
        <Star size={16} className="gw-routeheader-star" />
      </div>
      <div className="gw-routeheader-sub">
        {adepName || "—"} <ChevronRight size={11} /> {adesName || "—"}
      </div>
      <div className="gw-routeheader-actions">
        <button className="gw-btn-ghost" onClick={onReverse}><ArrowLeftRight size={13} /> Reverse</button>
        <button className="gw-btn-ghost" onClick={onClear}><Trash2 size={13} /> Clear</button>
        <div className="gw-savewrap">
          <button className="gw-btn-outline" onClick={() => setShowLoad((s) => !s)}>
            <FolderOpen size={13} /> Load <ChevronDown size={12} />
          </button>
          {showLoad && (
            <div className="gw-loadmenu">
              {savedRoutes.length === 0 && <div className="gw-loadmenu-empty">No saved routes yet</div>}
              {savedRoutes.map((r) => (
                <div key={r} className="gw-loadmenu-row" onClick={() => { onLoad(r); setShowLoad(false); }}>{r}</div>
              ))}
            </div>
          )}
        </div>
        <button className="gw-btn-outline" onClick={onSave}><Save size={13} /> Save</button>
        <button className="gw-btn-primary" onClick={onShare}><Share2 size={13} /> Share</button>
      </div>
    </div>
  );
}

// ---------- waypoint table (honest columns - no fabricated distance/EET) ----------

function WaypointTable({ nodes, currentIdx }) {
  if (!nodes.length) {
    return <div className="gw-table-empty">Configure a route below to see your waypoint sequence here.</div>;
  }
  return (
    <div className="gw-wptable">
      <div className="gw-wptable-head">
        <span>#</span><span>WAYPOINT</span><span>ALT</span><span>TRACK</span><span>PHASE</span>
      </div>
      <div className="gw-wptable-body">
        {nodes.map((n, i) => (
          <div key={i} className={"gw-wprow" + (i === currentIdx ? " current" : i < currentIdx ? " past" : "")}>
            <span className="gw-wprow-idx">{i + 1}</span>
            <span className="gw-wprow-name">{n.name}{n.hold ? <span className="gw-holdtag">HOLD</span> : null}</span>
            <span className="gw-wprow-alt">{n.alt || "—"}</span>
            <span className="gw-wprow-track">{n.trackIn != null ? String(n.trackIn).padStart(3, "0") + "°" : "—"}</span>
            <span className="gw-wprow-phase" style={{ color: PHASE_COLOR[n.phase] }}>{n.phase}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- schematic map (signature element) ----------

function SchematicMap({ nodes, currentIdx, showChartNote }) {
  const [zoom, setZoom] = useState(1);
  const [showAlt, setShowAlt] = useState(true);
  const positioned = useMemo(() => computeSchematicPositions(nodes), [nodes]);

  const bounds = useMemo(() => {
    if (!positioned.length) return { minX: -100, maxX: 100, minY: -100, maxY: 100 };
    const xs = positioned.map((p) => p.x), ys = positioned.map((p) => p.y);
    return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
  }, [positioned]);

  const pad = 60;
  const rawW = Math.max(bounds.maxX - bounds.minX, 40) + pad * 2;
  const rawH = Math.max(bounds.maxY - bounds.minY, 40) + pad * 2;
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;
  const vw = rawW / zoom, vh = rawH / zoom;
  const viewBox = `${cx - vw / 2} ${cy - vh / 2} ${vw} ${vh}`;

  const current = positioned[currentIdx];
  const planeHeading = current && current.trackIn != null ? current.trackIn : 0;

  return (
    <div className="gw-map">
      <div className="gw-map-toolbar">
        <button className="gw-maptool" onClick={() => setShowAlt((s) => !s)}>
          <Layers size={13} /> Layers
        </button>
        <div className="gw-map-toolbar-spacer" />
        <button className="gw-mapzoom" onClick={() => setZoom((z) => Math.min(z * 1.4, 6))}><ZoomIn size={14} /></button>
        <button className="gw-mapzoom" onClick={() => setZoom((z) => Math.max(z / 1.4, 0.4))}><ZoomOut size={14} /></button>
        <button className="gw-mapzoom" onClick={() => setZoom(1)}><Maximize2 size={13} /></button>
      </div>

      {!positioned.length ? (
        <div className="gw-map-empty">No route to show yet.</div>
      ) : (
        <svg viewBox={viewBox} className="gw-map-svg" preserveAspectRatio="xMidYMid meet">
          <defs>
            <pattern id="gwgrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--map-grid)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect x={cx - vw} y={cy - vh} width={vw * 2} height={vh * 2} fill="url(#gwgrid)" />

          {positioned.slice(1).map((n, i) => {
            const prev = positioned[i];
            const idx = i + 1;
            const isPast = idx <= currentIdx;
            const isCurrentSeg = idx === currentIdx;
            const color = isCurrentSeg ? "var(--magenta)" : isPast ? "var(--green)" : PHASE_COLOR[n.phase];
            return (
              <line
                key={"l" + i}
                x1={prev.x} y1={prev.y} x2={n.x} y2={n.y}
                stroke={color} strokeWidth={isCurrentSeg ? 3 : 2}
                opacity={isPast || isCurrentSeg ? 1 : 0.55}
                strokeDasharray={n.phase === "ENROUTE" ? "6 4" : undefined}
              />
            );
          })}

          {positioned.map((n, i) => {
            const isPast = i < currentIdx;
            const isCurrent = i === currentIdx;
            const color = isPast ? "var(--green)" : isCurrent ? "var(--magenta)" : PHASE_COLOR[n.phase];
            return (
              <g key={i}>
                <circle
                  cx={n.x} cy={n.y} r={n.isAirport ? 6 : 4}
                  fill={n.isAirport ? "var(--panel)" : color}
                  stroke={color} strokeWidth={2}
                />
                <text x={n.x + 9} y={n.y - 8} className="gw-map-label">{n.name}</text>
                {showAlt && n.alt && <text x={n.x + 9} y={n.y + 14} className="gw-map-alt">{n.alt}</text>}
              </g>
            );
          })}

          {current && (
            <g transform={`translate(${current.x},${current.y}) rotate(${planeHeading})`}>
              <path d="M 0 -11 L 7 9 L 0 5 L -7 9 Z" fill="var(--magenta)" stroke="var(--bg)" strokeWidth={1} />
            </g>
          )}
        </svg>
      )}

      <div className="gw-map-caption">Schematic route view — angles are real, spacing is not to scale.</div>
    </div>
  );
}

// ---------- summary cards (only real data - no fabricated numbers) ----------

function SummaryCards({ cfg, built, mode, simPlaying, liveStatus, liveAircraft, currentNode, nextNode }) {
  const phaseCounts = useMemo(() => {
    if (!built) return {};
    const c = {};
    built.nodes.forEach((n) => { c[n.phase] = (c[n.phase] || 0) + 1; });
    return c;
  }, [built]);

  return (
    <div className="gw-cards">
      <div className="gw-card">
        <div className="gw-card-title">FLIGHT INFO</div>
        <div className="gw-card-row"><span>Departure</span><span>{cfg.adep}{cfg.adepRwy ? ` / ${cfg.adepRwy}` : ""}</span></div>
        <div className="gw-card-row"><span>Arrival</span><span>{cfg.ades}{cfg.adesRwy ? ` / ${cfg.adesRwy}` : ""}</span></div>
        <div className="gw-card-row"><span>SID</span><span>{cfg.sidName || "—"}</span></div>
        <div className="gw-card-row"><span>STAR</span><span>{cfg.starName || "—"}</span></div>
      </div>

      <div className="gw-card">
        <div className="gw-card-title">ROUTE SUMMARY</div>
        <div className="gw-card-row"><span>Total waypoints</span><span>{built ? built.nodes.length : "—"}</span></div>
        <div className="gw-card-row"><span>SID legs</span><span>{phaseCounts.SID || 0}</span></div>
        <div className="gw-card-row"><span>Enroute fixes</span><span>{phaseCounts.ENROUTE || 0}</span></div>
        <div className="gw-card-row"><span>STAR legs</span><span>{phaseCounts.STAR || 0}</span></div>
        <div className="gw-card-footnote">Distance/EET not shown — the charts don't give real leg distances yet.</div>
      </div>

      <div className="gw-card">
        <div className="gw-card-title">PROGRESS</div>
        <div className="gw-card-row"><span>Mode</span><span>{mode === "live" ? "LIVE" : "SIMULATE"}{mode === "sim" && simPlaying ? " · playing" : ""}</span></div>
        <div className="gw-card-row"><span>At</span><span>{currentNode ? currentNode.name : "—"}</span></div>
        <div className="gw-card-row"><span>Next</span><span>{nextNode ? nextNode.name : "—"}</span></div>
        {mode === "live" && <div className="gw-card-row"><span>Link</span><span className={liveStatus === "live" ? "gw-live-ok" : ""}>{liveStatus.toUpperCase()}</span></div>}
      </div>

      <div className="gw-card">
        <div className="gw-card-title">LIVE AIRCRAFT</div>
        {mode === "live" && liveAircraft ? (
          <>
            <div className="gw-card-row"><span>Callsign</span><span>{liveAircraft.callsign || "—"}</span></div>
            <div className="gw-card-row"><span>Heading</span><span>{liveAircraft.heading != null ? Math.round(liveAircraft.heading) + "°" : "—"}</span></div>
            <div className="gw-card-row"><span>Altitude</span><span>{liveAircraft.altitude != null ? Math.round(liveAircraft.altitude) + " ft" : "—"}</span></div>
            <div className="gw-card-row"><span>Ground spd</span><span>{liveAircraft.groundSpeed != null ? Math.round(liveAircraft.groundSpeed) + " kt" : "—"}</span></div>
          </>
        ) : (
          <div className="gw-card-footnote">Connect in Settings and switch to LIVE to see your real aircraft here.</div>
        )}
      </div>
    </div>
  );
}

// ---------- settings page ----------

function SettingsPage({ robloxName, setRobloxName, backendUrl, setBackendUrl, liveStatus }) {
  return (
    <div className="gw-settings">
      <div className="gw-panel-title">LIVE TRACKING</div>
      <p className="gw-settings-blurb">
        The browser can't reach 24data directly, so LIVE mode polls your own backend relay instead.
        Run <code>gateway-backend/server.js</code> and point this at it.
      </p>
      <Field label="ROBLOX USERNAME">
        <input className="gw-input" placeholder="Your Roblox username" value={robloxName} onChange={(e) => setRobloxName(e.target.value)} />
      </Field>
      <Field label="BACKEND URL">
        <input className="gw-input" placeholder="https://two4graph.onrender.com" value={backendUrl} onChange={(e) => setBackendUrl(e.target.value)} />
      </Field>
      <div className="gw-settings-status">
        Status: <span className={liveStatus === "live" ? "gw-live-ok" : ""}>{liveStatus.toUpperCase()}</span>
      </div>
    </div>
  );
}

// ---------- flight plan page ----------

function FlightPlanPage(props) {
  const {
    adep, setAdep, adepRwy, setAdepRwy, sidIdx, setSidIdx, sidTransIdx, setSidTransIdx,
    enrouteFixes, setEnrouteFixes, ades, setAdes, adesRwy, setAdesRwy, starIdx, setStarIdx, starTransIdx, setStarTransIdx,
    built, handleBuild, availableSids, availableStars,
    mode, setMode, simPlaying, setSimPlaying, simIdx, setSimIdx, currentIdx, currentNode, nextNode,
    liveStatus, liveAircraft,
    onReverse, onClear, onSave, onShare, savedRoutes, onLoad,
    cfgForCards,
  } = props;

  const [setupOpen, setSetupOpen] = useState(true);
  const adepName = AIRPORTS.find((a) => a.icao === adep)?.name;
  const adesName = AIRPORTS.find((a) => a.icao === ades)?.name;

  return (
    <>
      <RouteHeader
        adep={adep} ades={ades} adepName={adepName} adesName={adesName}
        onReverse={onReverse} onClear={onClear} onSave={onSave} onShare={onShare}
        savedRoutes={savedRoutes} onLoad={onLoad}
      />

      <div className="gw-tabs">
        <span className="gw-tab active">FLIGHT PLAN</span>
        <span className="gw-tab dimmed">PERFORMANCE</span>
        <span className="gw-tab dimmed">NAV LOG</span>
        <span className="gw-tab dimmed">DOCUMENTS</span>
      </div>

      <button className="gw-setup-toggle" onClick={() => setSetupOpen((s) => !s)}>
        <ChevronsUpDown size={13} /> {setupOpen ? "Hide" : "Show"} route setup
      </button>

      {setupOpen && (
        <div className="gw-panel gw-setup">
          <div className="gw-setup-grid">
            <Field label="DEPARTURE">
              <Select value={adep} onChange={setAdep} options={AIRPORTS.map((a) => ({ value: a.icao, label: `${a.icao}${a.name ? " · " + a.name : ""}` }))} placeholder="Airport" />
            </Field>
            <Field label="RWY">
              <Select value={adepRwy} onChange={setAdepRwy} options={runwaysFor(adep).map((r) => ({ value: r, label: r }))} placeholder="—" disabled={runwaysFor(adep).length === 0} />
            </Field>
            {RFD_DATA.sids[adep] ? (
              <>
                <Field label="SID">
                  <Select
                    value={sidIdx}
                    onChange={(v) => { setSidIdx(v === null ? null : Number(v)); setSidTransIdx(null); }}
                    options={availableSids.map((s) => ({ value: RFD_DATA.sids[adep].indexOf(s), label: s.name }))}
                    placeholder="No SID (vectors)"
                  />
                </Field>
                {sidIdx != null && RFD_DATA.sids[adep][sidIdx].transitions.length > 0 && (
                  <Field label="SID TRANSITION">
                    <Select
                      value={sidTransIdx}
                      onChange={(v) => setSidTransIdx(v === null ? null : Number(v))}
                      options={RFD_DATA.sids[adep][sidIdx].transitions.map((t, i) => ({ value: i, label: t.name }))}
                      placeholder="Select transition"
                    />
                  </Field>
                )}
              </>
            ) : (
              <div className="gw-note gw-span2">No published SID data for {adep} yet — direct routing only.</div>
            )}

            <Field label="ARRIVAL">
              <Select value={ades} onChange={setAdes} options={AIRPORTS.map((a) => ({ value: a.icao, label: `${a.icao}${a.name ? " · " + a.name : ""}` }))} placeholder="Airport" />
            </Field>
            <Field label="RWY">
              <Select value={adesRwy} onChange={setAdesRwy} options={runwaysFor(ades).map((r) => ({ value: r, label: r }))} placeholder="—" disabled={runwaysFor(ades).length === 0} />
            </Field>
            {RFD_DATA.stars[ades] ? (
              <>
                <Field label="STAR">
                  <Select
                    value={starIdx}
                    onChange={(v) => { setStarIdx(v === null ? null : Number(v)); setStarTransIdx(null); }}
                    options={availableStars.map((s) => ({ value: RFD_DATA.stars[ades].indexOf(s), label: s.name }))}
                    placeholder="No STAR (vectors)"
                  />
                </Field>
                {starIdx != null && RFD_DATA.stars[ades][starIdx].entryTransitions.length > 0 && (
                  <Field label="STAR TRANSITION">
                    <Select
                      value={starTransIdx}
                      onChange={(v) => setStarTransIdx(v === null ? null : Number(v))}
                      options={RFD_DATA.stars[ades][starIdx].entryTransitions.map((t, i) => ({ value: i, label: t.name }))}
                      placeholder="Select transition"
                    />
                  </Field>
                )}
              </>
            ) : (
              <div className="gw-note gw-span2">No published STAR data for {ades} yet — direct routing only.</div>
            )}
          </div>

          <Field label="ENROUTE FIXES (free route — no fixed airways in ATC24)">
            <FixPicker fixes={enrouteFixes} onAdd={(f) => setEnrouteFixes((arr) => [...arr, f])} onRemove={(i) => setEnrouteFixes((arr) => arr.filter((_, idx) => idx !== i))} />
          </Field>

          <button className="gw-buildbtn" onClick={handleBuild}>BUILD ROUTE <ChevronRight size={14} /></button>
        </div>
      )}

      <div className="gw-split">
        <div className="gw-panel gw-split-left">
          <div className="gw-panel-title-row">
            <span className="gw-panel-title">WAYPOINTS</span>
            {built && (
              <div className="gw-simctl">
                <button className="gw-modechip" onClick={() => setMode("sim")} data-active={mode === "sim"}>SIM</button>
                <button className="gw-modechip" onClick={() => setMode("live")} data-active={mode === "live"}>LIVE</button>
                {mode === "sim" && (
                  <>
                    <button className="gw-iconbtn" onClick={() => setSimPlaying((p) => !p)}>{simPlaying ? <Pause size={13} /> : <Play size={13} />}</button>
                    <button className="gw-iconbtn" onClick={() => { setSimIdx(0); setSimPlaying(false); }}><RotateCcw size={13} /></button>
                  </>
                )}
              </div>
            )}
          </div>
          <WaypointTable nodes={built ? built.nodes : []} currentIdx={currentIdx} />
          <div className="gw-routestring">
            <div className="gw-routestring-label">ROUTE STRING</div>
            <div className="gw-routestring-text">{built ? built.routeString : "— build a route to see it here —"}</div>
          </div>
        </div>
        <div className="gw-panel gw-split-right">
          <SchematicMap nodes={built ? built.nodes : []} currentIdx={currentIdx} />
        </div>
      </div>

      <SummaryCards
        cfg={cfgForCards} built={built} mode={mode} simPlaying={simPlaying}
        liveStatus={liveStatus} liveAircraft={liveAircraft}
        currentNode={currentNode} nextNode={nextNode}
      />
    </>
  );
}

// ---------- main app ----------

const ROUTE_INDEX_KEY = "gateway:route-names";

export default function Gateway() {
  const [section, setSection] = useState("flightplan");

  const [adep, setAdep] = useState("IRFD");
  const [adepRwy, setAdepRwy] = useState("25L");
  const [sidIdx, setSidIdx] = useState(null);
  const [sidTransIdx, setSidTransIdx] = useState(null);
  const [enrouteFixes, setEnrouteFixes] = useState([]);
  const [ades, setAdes] = useState("IRFD");
  const [adesRwy, setAdesRwy] = useState("07L");
  const [starIdx, setStarIdx] = useState(null);
  const [starTransIdx, setStarTransIdx] = useState(null);
  const [built, setBuilt] = useState(null);

  const [mode, setMode] = useState("sim");
  const [simPlaying, setSimPlaying] = useState(false);
  const [simIdx, setSimIdx] = useState(0);
  const [robloxName, setRobloxName] = useState("");
  const [backendUrl, setBackendUrl] = useState("https://two4graph.onrender.com");
  const [liveStatus, setLiveStatus] = useState("idle");
  const [liveAircraft, setLiveAircraft] = useState(null);
  const [savedRoutes, setSavedRoutes] = useState([]);
  const [toast, setToast] = useState(null);

  const availableSids = useMemo(() => sidsForRunway(adep, adepRwy), [adep, adepRwy]);
  const availableStars = useMemo(() => (RFD_DATA.stars[ades] ? starsForRunway(ades, adesRwy) : []), [ades, adesRwy]);

  useEffect(() => { const r = runwaysFor(adep); setAdepRwy(r[0] || null); setSidIdx(null); setSidTransIdx(null); }, [adep]);
  useEffect(() => { const r = runwaysFor(ades); setAdesRwy(r[0] || null); setStarIdx(null); setStarTransIdx(null); }, [ades]);
  useEffect(() => { setSidIdx(null); setSidTransIdx(null); }, [adepRwy]);
  useEffect(() => { setStarIdx(null); setStarTransIdx(null); }, [adesRwy]);

  // load saved-route index on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(ROUTE_INDEX_KEY);
        if (res) setSavedRoutes(JSON.parse(res.value));
      } catch (e) { /* no saved routes yet */ }
    })();
  }, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  const handleBuild = () => {
    const result = buildRoute({ adep, adepRwy, sidIdx, sidTransIdx, enrouteFixes, starIdx, starTransIdx, ades, adesRwy });
    setBuilt(result);
    setSimIdx(0);
    setSimPlaying(false);
  };

  const handleReverse = () => {
    const cfg = { adep: ades, adepRwy: adesRwy, ades: adep, adesRwy: adepRwy };
    setAdep(cfg.adep); setAdes(cfg.ades);
    setEnrouteFixes((f) => [...f].reverse());
    setSidIdx(null); setSidTransIdx(null); setStarIdx(null); setStarTransIdx(null);
    setBuilt(null);
  };
  const handleClear = () => {
    setSidIdx(null); setSidTransIdx(null); setStarIdx(null); setStarTransIdx(null);
    setEnrouteFixes([]); setBuilt(null); setSimIdx(0); setSimPlaying(false);
  };
  const handleShare = async () => {
    if (!built) { showToast("Build a route first"); return; }
    try {
      await navigator.clipboard.writeText(built.routeString);
      showToast("Route string copied");
    } catch (e) { showToast("Couldn't copy — copy it manually from the panel"); }
  };
  const handleSave = async () => {
    if (!built) { showToast("Build a route first"); return; }
    const name = window.prompt("Name this route:", `${adep}-${ades}`);
    if (!name) return;
    const cfg = { adep, adepRwy, sidIdx, sidTransIdx, enrouteFixes, ades, adesRwy, starIdx, starTransIdx };
    try {
      await window.storage.set(`route:${name}`, JSON.stringify(cfg));
      const names = Array.from(new Set([...savedRoutes, name]));
      setSavedRoutes(names);
      await window.storage.set(ROUTE_INDEX_KEY, JSON.stringify(names));
      showToast(`Saved "${name}"`);
    } catch (e) { showToast("Save failed"); }
  };
  const handleLoad = async (name) => {
    try {
      const res = await window.storage.get(`route:${name}`);
      if (!res) return;
      const cfg = JSON.parse(res.value);
      setAdep(cfg.adep); setAdepRwy(cfg.adepRwy); setSidIdx(cfg.sidIdx); setSidTransIdx(cfg.sidTransIdx);
      setEnrouteFixes(cfg.enrouteFixes || []);
      setAdes(cfg.ades); setAdesRwy(cfg.adesRwy); setStarIdx(cfg.starIdx); setStarTransIdx(cfg.starTransIdx);
      setBuilt(null);
      showToast(`Loaded "${name}"`);
    } catch (e) { showToast("Load failed"); }
  };

  useEffect(() => {
    if (!simPlaying || !built) return;
    const id = setInterval(() => {
      setSimIdx((i) => { if (i >= built.nodes.length - 1) { setSimPlaying(false); return i; } return i + 1; });
    }, 2200);
    return () => clearInterval(id);
  }, [simPlaying, built]);

  useEffect(() => {
    if (mode !== "live" || !robloxName || !backendUrl) return;
    let cancelled = false;
    setLiveStatus("connecting");
    const poll = async () => {
      try {
        const res = await fetch(`${backendUrl.replace(/\/$/, "")}/aircraft/${encodeURIComponent(robloxName)}`, { mode: "cors" });
        if (!res.ok) throw new Error("not found");
        const data = await res.json();
        if (cancelled) return;
        setLiveAircraft(data); setLiveStatus("live");
      } catch (e) { if (!cancelled) setLiveStatus("error"); }
    };
    poll();
    const id = setInterval(poll, 3000);
    return () => { cancelled = true; clearInterval(id); };
  }, [mode, robloxName, backendUrl]);

  const currentIdx = useMemo(() => {
    if (!built) return 0;
    if (mode === "live" && liveAircraft && liveStatus === "live") {
      return matchCurrentLegIndex(built.nodes, liveAircraft.heading, liveAircraft.altitude);
    }
    return simIdx;
  }, [built, mode, liveAircraft, liveStatus, simIdx]);

  const currentNode = built ? built.nodes[currentIdx] : null;
  const nextNode = built ? built.nodes[currentIdx + 1] : null;

  const cfgForCards = {
    adep, adepRwy, ades, adesRwy,
    sidName: adep && RFD_DATA.sids[adep] && sidIdx != null ? RFD_DATA.sids[adep][sidIdx].name : null,
    starName: ades && RFD_DATA.stars[ades] && starIdx != null ? RFD_DATA.stars[ades][starIdx].name : null,
  };

  return (
    <div className="gw-root">
      <style>{CSS}</style>
      <Sidebar section={section} setSection={setSection} />
      <div className="gw-main">
        <TopBar />
        <div className="gw-content">
          {section === "flightplan" && (
            <FlightPlanPage
              adep={adep} setAdep={setAdep} adepRwy={adepRwy} setAdepRwy={setAdepRwy}
              sidIdx={sidIdx} setSidIdx={setSidIdx} sidTransIdx={sidTransIdx} setSidTransIdx={setSidTransIdx}
              enrouteFixes={enrouteFixes} setEnrouteFixes={setEnrouteFixes}
              ades={ades} setAdes={setAdes} adesRwy={adesRwy} setAdesRwy={setAdesRwy}
              starIdx={starIdx} setStarIdx={setStarIdx} starTransIdx={starTransIdx} setStarTransIdx={setStarTransIdx}
              built={built} handleBuild={handleBuild} availableSids={availableSids} availableStars={availableStars}
              mode={mode} setMode={setMode} simPlaying={simPlaying} setSimPlaying={setSimPlaying}
              simIdx={simIdx} setSimIdx={setSimIdx} currentIdx={currentIdx} currentNode={currentNode} nextNode={nextNode}
              liveStatus={liveStatus} liveAircraft={liveAircraft}
              onReverse={handleReverse} onClear={handleClear} onSave={handleSave} onShare={handleShare}
              savedRoutes={savedRoutes} onLoad={handleLoad}
              cfgForCards={cfgForCards}
            />
          )}
          {section === "settings" && (
            <SettingsPage robloxName={robloxName} setRobloxName={setRobloxName} backendUrl={backendUrl} setBackendUrl={setBackendUrl} liveStatus={liveStatus} />
          )}
          {section !== "flightplan" && section !== "settings" && (
            <PlaceholderPage
              label={NAV_SECTIONS.find((s) => s.id === section)?.label || section}
              icon={NAV_SECTIONS.find((s) => s.id === section)?.icon || FileText}
              blurb={PLACEHOLDER_BLURBS[section] || "Not built yet."}
            />
          )}
        </div>
      </div>
      {toast && <div className="gw-toast">{toast}</div>}
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

.gw-root {
  --bg: #0A0D13;
  --sidebar-bg: #0B0E15;
  --panel: #11151D;
  --panel-2: #171C26;
  --border: #222836;
  --text: #E6EAF2;
  --text-dim: #7C8598;
  --blue: #3E7BFA;
  --blue-dim: rgba(62,123,250,0.14);
  --amber: #F2A93B;
  --cyan: #49C7E8;
  --magenta: #F0529E;
  --magenta-dim: rgba(240,82,158,0.16);
  --green: #22C55E;
  --green-dim: rgba(34,197,94,0.14);
  --red: #EF4444;
  --map-grid: rgba(255,255,255,0.035);

  display: flex;
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-family: 'IBM Plex Sans', sans-serif;
}
.gw-root * { box-sizing: border-box; }
.gw-root code { font-family: 'IBM Plex Mono', monospace; background: var(--panel-2); padding: 1px 5px; border-radius: 3px; font-size: 0.9em; }

/* ---- sidebar ---- */
.gw-sidebar {
  width: 216px; flex-shrink: 0; background: var(--sidebar-bg); border-right: 1px solid var(--border);
  display: flex; flex-direction: column; padding: 16px 10px; gap: 4px; position: sticky; top: 0; height: 100vh;
}
.gw-sidebar-brand { display: flex; align-items: center; gap: 8px; padding: 6px 8px 16px 8px; color: var(--blue); }
.gw-brand-word { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 15px; letter-spacing: 0.06em; color: var(--text); }
.gw-sidebar-nav { display: flex; flex-direction: column; gap: 1px; flex: 1; overflow-y: auto; }
.gw-navitem {
  display: flex; align-items: center; gap: 10px; background: transparent; border: none; color: var(--text-dim);
  font-family: 'IBM Plex Sans', sans-serif; font-size: 13px; font-weight: 500; padding: 9px 10px; border-radius: 6px;
  cursor: pointer; text-align: left; width: 100%;
}
.gw-navitem:hover { background: var(--panel-2); color: var(--text); }
.gw-navitem.active { background: var(--blue-dim); color: var(--blue); }
.gw-navitem.dimmed { opacity: 0.62; }
.gw-sidebar-status { margin: 10px 4px; padding: 12px; background: var(--panel); border: 1px solid var(--border); border-radius: 8px; }
.gw-status-title { font-family: 'IBM Plex Mono', monospace; font-size: 9.5px; letter-spacing: 0.08em; color: var(--text-dim); margin-bottom: 8px; }
.gw-status-row { display: flex; align-items: center; gap: 7px; font-size: 12px; color: var(--text); margin-bottom: 5px; }
.gw-status-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--text-dim); flex-shrink: 0; }
.gw-status-dot.live { background: var(--green); box-shadow: 0 0 6px var(--green); }
.gw-status-sub { font-size: 11px; color: var(--text-dim); }
.gw-settings-btn { border-top: 1px solid var(--border); margin-top: 6px; padding-top: 12px; }

/* ---- topbar / main ---- */
.gw-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.gw-topbar { display: flex; align-items: center; padding: 12px 24px; border-bottom: 1px solid var(--border); }
.gw-topbar-spacer { flex: 1; }
.gw-topbar-right { display: flex; align-items: center; gap: 10px; }
.gw-network-pill { display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--text-dim); background: var(--panel); border: 1px solid var(--border); padding: 6px 11px; border-radius: 999px; }
.gw-iconbtn-ghost { background: transparent; border: none; color: var(--text-dim); padding: 6px; border-radius: 6px; cursor: pointer; display: flex; }
.gw-iconbtn-ghost:hover { background: var(--panel-2); color: var(--text); }
.gw-content { padding: 24px 28px 40px 28px; overflow-y: auto; }

/* ---- placeholder page ---- */
.gw-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 90px 20px; color: var(--text-dim); max-width: 440px; margin: 0 auto; }
.gw-placeholder-icon { color: var(--text-dim); margin-bottom: 16px; opacity: 0.7; }
.gw-placeholder-title { font-family: 'Space Grotesk', sans-serif; font-size: 19px; color: var(--text); margin-bottom: 10px; }
.gw-placeholder-blurb { font-size: 13px; line-height: 1.6; margin-bottom: 16px; }
.gw-placeholder-tag { font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.08em; color: var(--text-dim); border: 1px dashed var(--border); padding: 4px 10px; border-radius: 999px; }

/* ---- route header ---- */
.gw-routeheader { margin-bottom: 6px; display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 14px; }
.gw-routeheader-title { display: flex; align-items: center; gap: 12px; font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 28px; color: var(--text); }
.gw-routeheader-star { color: var(--text-dim); margin-left: 4px; cursor: pointer; }
.gw-routeheader-sub { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--text-dim); margin-top: 2px; }
.gw-routeheader-actions { display: flex; gap: 8px; flex-wrap: wrap; position: relative; }
.gw-btn-ghost, .gw-btn-outline, .gw-btn-primary {
  display: flex; align-items: center; gap: 6px; font-family: 'IBM Plex Sans', sans-serif; font-size: 12.5px; font-weight: 500;
  padding: 8px 13px; border-radius: 6px; cursor: pointer;
}
.gw-btn-ghost { background: transparent; border: 1px solid transparent; color: var(--text-dim); }
.gw-btn-ghost:hover { background: var(--panel-2); color: var(--text); }
.gw-btn-outline { background: var(--panel); border: 1px solid var(--border); color: var(--text); }
.gw-btn-outline:hover { border-color: var(--blue); }
.gw-btn-primary { background: var(--blue); border: 1px solid var(--blue); color: #fff; }
.gw-btn-primary:hover { background: #5A8FFF; }
.gw-savewrap { position: relative; }
.gw-loadmenu { position: absolute; top: calc(100% + 4px); right: 0; min-width: 180px; background: var(--panel); border: 1px solid var(--border); border-radius: 8px; box-shadow: 0 10px 24px rgba(0,0,0,0.5); z-index: 30; overflow: hidden; }
.gw-loadmenu-empty { padding: 12px; font-size: 12px; color: var(--text-dim); }
.gw-loadmenu-row { padding: 10px 12px; font-size: 12.5px; cursor: pointer; font-family: 'IBM Plex Mono', monospace; }
.gw-loadmenu-row:hover { background: var(--panel-2); }

/* ---- tabs ---- */
.gw-tabs { display: flex; gap: 22px; border-bottom: 1px solid var(--border); margin: 18px 0 20px 0; }
.gw-tab { font-family: 'IBM Plex Mono', monospace; font-size: 11.5px; letter-spacing: 0.05em; color: var(--text-dim); padding-bottom: 11px; border-bottom: 2px solid transparent; cursor: default; }
.gw-tab.active { color: var(--blue); border-bottom-color: var(--blue); }
.gw-tab.dimmed { opacity: 0.45; cursor: not-allowed; }

/* ---- panels / fields (shared) ---- */
.gw-panel { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 16px; }
.gw-panel-title { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.09em; color: var(--text-dim); }
.gw-panel-title-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.gw-setup-toggle { display: flex; align-items: center; gap: 6px; background: transparent; border: none; color: var(--text-dim); font-size: 12px; font-family: 'IBM Plex Mono', monospace; cursor: pointer; margin-bottom: 10px; padding: 0; }
.gw-setup-toggle:hover { color: var(--text); }
.gw-setup { margin-bottom: 18px; }
.gw-setup-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 14px; }
.gw-span2 { grid-column: span 4; }
@media (max-width: 900px) { .gw-setup-grid { grid-template-columns: repeat(2, 1fr); } .gw-span2 { grid-column: span 2; } }

.gw-field { display: flex; flex-direction: column; }
.gw-field-label { font-size: 10px; letter-spacing: 0.06em; color: var(--text-dim); margin-bottom: 5px; font-family: 'IBM Plex Mono', monospace; }
.gw-select-wrap { position: relative; }
.gw-select { width: 100%; background: var(--panel-2); border: 1px solid var(--border); color: var(--text); font-family: 'IBM Plex Sans', sans-serif; font-size: 12.5px; padding: 8px 26px 8px 9px; border-radius: 6px; appearance: none; cursor: pointer; }
.gw-select:disabled { opacity: 0.4; cursor: not-allowed; }
.gw-select-chevron { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); pointer-events: none; color: var(--text-dim); }
.gw-input { width: 100%; background: var(--panel-2); border: 1px solid var(--border); color: var(--text); font-family: 'IBM Plex Mono', monospace; font-size: 12px; padding: 8px 9px; border-radius: 6px; }
.gw-input::placeholder { color: var(--text-dim); font-family: 'IBM Plex Sans', sans-serif; }
.gw-note { font-size: 11.5px; color: var(--text-dim); line-height: 1.5; padding: 10px 12px; background: var(--panel-2); border-radius: 6px; border: 1px dashed var(--border); }

.gw-fixpicker { }
.gw-chips { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 6px; }
.gw-chip { display: inline-flex; align-items: center; gap: 5px; background: var(--panel-2); border: 1px solid var(--border); color: var(--text); font-family: 'IBM Plex Mono', monospace; font-size: 11px; padding: 4px 6px 4px 9px; border-radius: 999px; }
.gw-chip-x { cursor: pointer; color: var(--text-dim); }
.gw-chip-x:hover { color: var(--red); }
.gw-fixinput-wrap { position: relative; }
.gw-suggest { position: absolute; z-index: 20; top: calc(100% + 3px); left: 0; right: 0; background: var(--panel-2); border: 1px solid var(--border); border-radius: 6px; overflow: hidden; box-shadow: 0 10px 24px rgba(0,0,0,0.5); }
.gw-suggest-row { display: flex; justify-content: space-between; padding: 7px 9px; cursor: pointer; font-size: 12px; }
.gw-suggest-row:hover { background: var(--bg); }
.gw-suggest-name { font-family: 'IBM Plex Mono', monospace; color: var(--text); }
.gw-suggest-kind { color: var(--text-dim); font-size: 10.5px; }

.gw-buildbtn { width: 100%; background: var(--blue); color: #fff; border: none; border-radius: 7px; padding: 11px; font-family: 'IBM Plex Sans', sans-serif; font-weight: 600; font-size: 12.5px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; margin-top: 6px; }
.gw-buildbtn:hover { background: #5A8FFF; }

/* ---- split: table + map ---- */
.gw-split { display: grid; grid-template-columns: 1fr 1.15fr; gap: 16px; align-items: start; margin-bottom: 18px; }
@media (max-width: 980px) { .gw-split { grid-template-columns: 1fr; } }
.gw-split-left, .gw-split-right { padding: 14px; }

.gw-simctl { display: flex; align-items: center; gap: 6px; }
.gw-modechip { font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.05em; background: var(--panel-2); border: 1px solid var(--border); color: var(--text-dim); padding: 4px 9px; border-radius: 999px; cursor: pointer; }
.gw-modechip[data-active="true"] { background: var(--blue-dim); border-color: var(--blue); color: var(--blue); }
.gw-iconbtn { background: var(--panel-2); border: 1px solid var(--border); color: var(--text); border-radius: 6px; padding: 5px 7px; cursor: pointer; display: flex; }

.gw-table-empty { padding: 30px 0; text-align: center; color: var(--text-dim); font-size: 12.5px; }
.gw-wptable { border: 1px solid var(--border); border-radius: 8px; overflow: hidden; margin-bottom: 14px; }
.gw-wptable-head { display: grid; grid-template-columns: 26px 1fr 90px 60px 70px; background: var(--panel-2); padding: 8px 10px; font-family: 'IBM Plex Mono', monospace; font-size: 9.5px; letter-spacing: 0.06em; color: var(--text-dim); }
.gw-wptable-body { max-height: 320px; overflow-y: auto; }
.gw-wprow { display: grid; grid-template-columns: 26px 1fr 90px 60px 70px; padding: 8px 10px; font-size: 11.5px; border-top: 1px solid var(--border); font-family: 'IBM Plex Mono', monospace; align-items: center; }
.gw-wprow-idx { color: var(--text-dim); }
.gw-wprow.current { background: var(--magenta-dim); }
.gw-wprow.current .gw-wprow-name { color: var(--magenta); font-weight: 600; }
.gw-wprow.past { opacity: 0.5; }
.gw-wprow-alt { color: var(--text-dim); font-size: 10.5px; }
.gw-holdtag { font-size: 8.5px; background: var(--amber); color: #1A1200; padding: 1px 5px; border-radius: 4px; margin-left: 6px; letter-spacing: 0.04em; }

.gw-routestring { border-top: 1px solid var(--border); padding-top: 12px; }
.gw-routestring-label { font-family: 'IBM Plex Mono', monospace; font-size: 9.5px; letter-spacing: 0.08em; color: var(--text-dim); margin-bottom: 6px; }
.gw-routestring-text { font-family: 'IBM Plex Mono', monospace; font-size: 13px; color: var(--cyan); line-height: 1.7; word-break: break-word; }

/* ---- map ---- */
.gw-map { display: flex; flex-direction: column; height: 100%; }
.gw-map-toolbar { display: flex; align-items: center; gap: 6px; margin-bottom: 10px; }
.gw-map-toolbar-spacer { flex: 1; }
.gw-maptool { display: flex; align-items: center; gap: 5px; background: var(--panel-2); border: 1px solid var(--border); color: var(--text-dim); font-size: 11px; font-family: 'IBM Plex Sans', sans-serif; padding: 5px 10px; border-radius: 6px; cursor: pointer; }
.gw-mapzoom { background: var(--panel-2); border: 1px solid var(--border); color: var(--text); padding: 5px 7px; border-radius: 6px; cursor: pointer; display: flex; }
.gw-map-empty { flex: 1; display: flex; align-items: center; justify-content: center; color: var(--text-dim); font-size: 12.5px; min-height: 260px; }
.gw-map-svg { width: 100%; min-height: 340px; flex: 1; background: #0D111A; border-radius: 8px; border: 1px solid var(--border); }
.gw-map-label { font-family: 'IBM Plex Mono', monospace; font-size: 9px; fill: var(--text); }
.gw-map-alt { font-family: 'IBM Plex Mono', monospace; font-size: 7.5px; fill: var(--text-dim); }
.gw-map-caption { font-size: 10.5px; color: var(--text-dim); margin-top: 8px; text-align: center; }

/* ---- summary cards ---- */
.gw-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
@media (max-width: 980px) { .gw-cards { grid-template-columns: repeat(2, 1fr); } }
.gw-card { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 15px; }
.gw-card-title { font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.08em; color: var(--text-dim); margin-bottom: 12px; }
.gw-card-row { display: flex; justify-content: space-between; font-size: 12px; padding: 5px 0; border-top: 1px solid var(--border); }
.gw-card-row:first-of-type { border-top: none; }
.gw-card-row span:first-child { color: var(--text-dim); }
.gw-card-row span:last-child { font-family: 'IBM Plex Mono', monospace; color: var(--text); }
.gw-card-footnote { font-size: 10.5px; color: var(--text-dim); line-height: 1.5; margin-top: 8px; }
.gw-live-ok { color: var(--green) !important; }

/* ---- settings ---- */
.gw-settings { max-width: 460px; }
.gw-settings-blurb { font-size: 12.5px; color: var(--text-dim); line-height: 1.6; margin: 10px 0 18px 0; }
.gw-settings-status { font-size: 12px; color: var(--text-dim); margin-top: 12px; font-family: 'IBM Plex Mono', monospace; }
.gw-settings .gw-field { margin-bottom: 14px; }

/* ---- toast ---- */
.gw-toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: var(--panel); border: 1px solid var(--blue); color: var(--text); font-size: 12.5px; padding: 10px 18px; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); z-index: 100; }
`;

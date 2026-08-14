// 24graph backend relay
// Connects ONCE to 24data (REST poll + WebSocket), caches aircraft state in memory,
// and serves it to the 24graph frontend over plain HTTP+CORS.
//
// Why this has to exist: browsers can't call 24data directly (its Allow-Origin
// header blocks 3rd-party clients, and 24data's WSS explicitly requires the
// Origin header to be absent/empty - something only a non-browser client can do).
// This process is the "server" 24data's docs tell you to put in front of your app.
//
// Run:
//   npm install
//   node server.js
// Then point the 24graph frontend's "Backend URL" field at http://localhost:8420

import express from "express";
import cors from "cors";
import WebSocket from "ws";
import { saveRoute, listRoutes, getRoute, deleteRoute } from "./storage.js";

const PORT = process.env.PORT || 8420;
const REST_BASE = "https://24data.ptfs.app";
const WSS_URL = "wss://24data.ptfs.app/wss";

// aircraft cache: callsign -> { ...AircraftData, callsign, updatedAt }
// playerIndex: lowercased roblox username -> callsign
const aircraftCache = new Map();
const playerIndex = new Map();

// atis cache: airport ICAO -> { ...ATIS, updatedAt }
const atisCache = new Map();

function ingestAircraftData(dataObj, isEvent = false) {
  const now = Date.now();
  for (const [callsign, ac] of Object.entries(dataObj || {})) {
    const record = { ...ac, callsign, event: isEvent, updatedAt: now };
    aircraftCache.set(callsign, record);
    if (ac.playerName) {
      playerIndex.set(ac.playerName.toLowerCase(), callsign);
    }
  }
}

function ingestAtis(atisObj) {
  if (!atisObj || !atisObj.airport) return;
  atisCache.set(atisObj.airport, { ...atisObj, updatedAt: Date.now() });
}
function ingestAtisList(list) {
  (list || []).forEach(ingestAtis);
}

// ---- WebSocket connection (primary, near-real-time) ----
let lastWsMessageAt = 0;
const WS_STALE_MS = 10000; // no WS message in 10s (~10x its normal ~1s cadence) = treat as stale

function connectWs() {
  // IMPORTANT: do not set an Origin header here - 24data requires it be absent.
  const ws = new WebSocket(WSS_URL);

  ws.on("open", () => console.log("[24data] websocket connected"));
  ws.on("message", (raw) => {
    lastWsMessageAt = Date.now();
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.t === "ACFT_DATA") ingestAircraftData(msg.d, false);
      else if (msg.t === "EVENT_ACFT_DATA") ingestAircraftData(msg.d, true);
      else if (msg.t === "ATIS") ingestAtis(msg.d);
      // CONTROLLERS / FLIGHT_PLAN could be cached here too if you need them later
    } catch (e) {
      console.error("[24data] bad message", e.message);
    }
  });
  ws.on("close", () => {
    console.log("[24data] websocket closed, reconnecting in 5s");
    setTimeout(connectWs, 5000);
  });
  ws.on("error", (e) => console.error("[24data] websocket error", e.message));
}
connectWs();

// ---- REST poll: TRUE fallback now, not always-on redundancy. Only actually
// hits the network when the WS has gone quiet for a while - staleness-based
// rather than raw ws.readyState, since a socket can stay "open" while
// silently not delivering messages. Still checks every 3s so it reacts fast
// once it IS needed. ----
async function pollRest() {
  const wsStale = Date.now() - lastWsMessageAt > WS_STALE_MS;
  if (wsStale) {
    try {
      const res = await fetch(`${REST_BASE}/acft-data`);
      if (res.ok) ingestAircraftData(await res.json(), false);
    } catch (e) {
      console.error("[24data] rest poll failed", e.message);
    }
  }
  setTimeout(pollRest, 3000);
}
pollRest();

// ---- ATIS REST poll (10 req/min suggested rate = every 6s) ----
// Docs note this can 503 if ATC24 Bot is offline and 24data has since restarted -
// that's expected/transient, not an error worth logging loudly.
async function pollAtis() {
  try {
    const res = await fetch(`${REST_BASE}/atis`);
    if (res.ok) ingestAtisList(await res.json());
    // 503 = bot offline, just skip this cycle and try again
  } catch (e) {
    console.error("[24data] atis poll failed", e.message);
  }
  setTimeout(pollAtis, 6000);
}
pollAtis();

// ---- HTTP API for the 24graph frontend ----
const app = express();
// ALLOWED_ORIGINS env var: comma-separated list, e.g.
//   ALLOWED_ORIGINS=https://24graph.vercel.app,http://localhost:5173
// Falls back to the current known origins if the env var isn't set, so local
// `node server.js` still works without any extra setup.
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
  : ["https://24graph.vercel.app", "http://localhost:5173"];
app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json());

app.get("/aircraft/:playerName", (req, res) => {
  const callsign = playerIndex.get(req.params.playerName.toLowerCase());
  if (!callsign) return res.status(404).json({ error: "not found - is the player currently flying?" });
  const ac = aircraftCache.get(callsign);
  if (!ac || Date.now() - ac.updatedAt > 30000) {
    return res.status(404).json({ error: "stale - no recent data for this player" });
  }
  res.json({
    callsign: ac.callsign,
    playerName: ac.playerName,
    heading: ac.heading,
    altitude: ac.altitude,
    groundSpeed: ac.groundSpeed,
    speed: ac.speed,
    aircraftType: ac.aircraftType,
    isOnGround: ac.isOnGround ?? null,
    position: ac.position,
    updatedAt: ac.updatedAt,
  });
});

app.get("/atis/:icao", (req, res) => {
  const atis = atisCache.get(req.params.icao.toUpperCase());
  if (!atis) return res.status(404).json({ error: "no ATIS cached for this airport yet" });
  res.json(atis);
});

app.get("/atis", (req, res) => {
  res.json(Array.from(atisCache.values()));
});

app.get("/health", (req, res) => {
  const wsAgoMs = lastWsMessageAt ? Date.now() - lastWsMessageAt : null;
  res.json({
    ok: true,
    cachedAircraft: aircraftCache.size,
    trackedPlayers: playerIndex.size,
    cachedAtis: atisCache.size,
    wsLastMessageMsAgo: wsAgoMs,
    wsStale: wsAgoMs == null ? true : wsAgoMs > WS_STALE_MS,
  });
});

// ---- saved flight plans, scoped per Roblox username ----
const MAX_NAME_LEN = 60;
const MAX_USER_LEN = 40;
const MAX_ENROUTE_FIXES = 30;
const VALID_ROUTE_KEYS = new Set(["adep", "adepRwy", "sidIdx", "sidTransIdx", "enrouteFixes", "ades", "adesRwy", "starIdx", "starTransIdx"]);

function validRouteName(name) {
  return typeof name === "string" && name.length > 0 && name.length <= MAX_NAME_LEN;
}
function validUsername(user) {
  return typeof user === "string" && user.length > 0 && user.length <= MAX_USER_LEN;
}
function validConfig(config) {
  if (!config || typeof config !== "object" || Array.isArray(config)) return "config must be an object";
  for (const key of Object.keys(config)) {
    if (!VALID_ROUTE_KEYS.has(key)) return `unexpected config key: ${key}`;
  }
  if (config.enrouteFixes != null) {
    if (!Array.isArray(config.enrouteFixes)) return "enrouteFixes must be an array";
    if (config.enrouteFixes.length > MAX_ENROUTE_FIXES) return `too many enroute fixes (max ${MAX_ENROUTE_FIXES})`;
    if (!config.enrouteFixes.every((f) => typeof f === "string")) return "enrouteFixes must all be strings";
  }
  if (config.adep != null && typeof config.adep !== "string") return "adep must be a string";
  if (config.ades != null && typeof config.ades !== "string") return "ades must be a string";
  return null; // valid
}

app.post("/routes/:user", (req, res) => {
  if (!validUsername(req.params.user)) {
    return res.status(400).json({ error: `username must be 1-${MAX_USER_LEN} characters` });
  }
  const { name, config } = req.body || {};
  if (!validRouteName(name)) {
    return res.status(400).json({ error: `route name must be 1-${MAX_NAME_LEN} characters` });
  }
  const configError = validConfig(config);
  if (configError) return res.status(400).json({ error: configError });
  saveRoute(req.params.user, name, config);
  res.json({ ok: true });
});

app.get("/routes/:user", (req, res) => {
  res.json({ routes: listRoutes(req.params.user) });
});

app.get("/routes/:user/:name", (req, res) => {
  const config = getRoute(req.params.user, req.params.name);
  if (!config) return res.status(404).json({ error: "not found" });
  res.json({ config });
});

app.delete("/routes/:user/:name", (req, res) => {
  deleteRoute(req.params.user, req.params.name);
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`24graph backend listening on :${PORT}`));
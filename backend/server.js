// Gateway backend relay
// Connects ONCE to 24data (REST poll + WebSocket), caches aircraft state in memory,
// and serves it to the Gateway frontend over plain HTTP+CORS.
//
// Why this has to exist: browsers can't call 24data directly (its Allow-Origin
// header blocks 3rd-party clients, and 24data's WSS explicitly requires the
// Origin header to be absent/empty - something only a non-browser client can do).
// This process is the "server" 24data's docs tell you to put in front of your app.
//
// Run:
//   npm install
//   node server.js
// Then point the Gateway frontend's "Backend URL" field at http://localhost:8420

import express from "express";
import cors from "cors";
import WebSocket from "ws";

const PORT = process.env.PORT || 8420;
const REST_BASE = "https://24data.ptfs.app";
const WSS_URL = "wss://24data.ptfs.app/wss";

// aircraft cache: callsign -> { ...AircraftData, callsign, updatedAt }
// playerIndex: lowercased roblox username -> callsign
const aircraftCache = new Map();
const playerIndex = new Map();

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

// ---- WebSocket connection (primary, near-real-time) ----
function connectWs() {
  // IMPORTANT: do not set an Origin header here - 24data requires it be absent.
  const ws = new WebSocket(WSS_URL);

  ws.on("open", () => console.log("[24data] websocket connected"));
  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.t === "ACFT_DATA") ingestAircraftData(msg.d, false);
      else if (msg.t === "EVENT_ACFT_DATA") ingestAircraftData(msg.d, true);
      // CONTROLLERS / ATIS / FLIGHT_PLAN could be cached here too if you need them later
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

// ---- REST poll (fallback / redundancy, matches suggested 20 req/min rate) ----
async function pollRest() {
  try {
    const res = await fetch(`${REST_BASE}/acft-data`);
    if (res.ok) ingestAircraftData(await res.json(), false);
  } catch (e) {
    console.error("[24data] rest poll failed", e.message);
  }
  setTimeout(pollRest, 3000); // every 3s = 20 req/min, matches 24data's suggested rate
}
pollRest();

// ---- HTTP API for the Gateway frontend ----
const app = express();
app.use(cors()); // dev-friendly; lock this down to your real frontend origin in production

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

app.get("/health", (req, res) => {
  res.json({ ok: true, cachedAircraft: aircraftCache.size, trackedPlayers: playerIndex.size });
});

app.listen(PORT, () => console.log(`Gateway backend listening on :${PORT}`));

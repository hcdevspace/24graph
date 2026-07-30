# Gateway backend relay

Small relay server that does what 24data's docs ask any 3rd-party app to do:
connect to 24data **once** from a real server (not a browser), cache the data,
and serve it onward to your own clients.

## Why this exists

Browsers can't call 24data directly — its `Allow-Origin` header blocks
cross-origin requests from 3rd-party web clients, and its WebSocket requires
the `Origin` header to be absent, which only a non-browser client can do.
The Gateway frontend (the React artifact) runs in your browser, so it can't
reach 24data on its own. This server sits in between.

## Run it

```bash
npm install
node server.js
```

It will:
- Open one WebSocket connection to `wss://24data.ptfs.app/wss` for near-real-time aircraft data
- Also poll `GET /acft-data` every 3s as a fallback (20 req/min, matching 24data's suggested rate)
- Cache the latest data per callsign, indexed by Roblox username (`playerName`)
- Expose `GET /aircraft/:playerName` for the frontend to poll

Then in the Gateway artifact, switch to **LIVE** mode, enter your Roblox
username and `http://localhost:8420` as the backend URL.

## Notes / next steps

- This only republishes `ACFT_DATA` / `EVENT_ACFT_DATA`. `CONTROLLERS` and
  `ATIS` come through the same WebSocket message stream if you want to cache
  those too — just add cases in `ws.on("message")`.
- `cors()` is wide open here for local dev. Lock it to your real frontend's
  origin before deploying anywhere public.
- If you deploy this somewhere (Render, Fly.io, a VPS, etc.), that single
  deployed instance can serve everyone using the app — 24data's docs
  specifically ask for this pattern instead of every client connecting
  individually, since only 3 WebSocket connections are allowed total.

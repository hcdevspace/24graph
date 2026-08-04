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
- Save/load flight plans per username (see below)

Then in the Gateway app, switch to **LIVE** mode, enter your Roblox
username and your backend URL (`http://localhost:8420` locally).

## Saved routes

The frontend's Save/Load buttons hit these, scoped by Roblox username so
different people using the same deployed backend don't see each other's routes:

- `POST /routes/:user` — body `{ name, config }` — save a route
- `GET /routes/:user` — list saved route names for that user
- `GET /routes/:user/:name` — fetch one route's config
- `DELETE /routes/:user/:name` — delete one

Storage lives in `storage.js`, currently a JSON file on local disk
(`routes-store.json`, gitignored).

**Important if you're deployed on Render's free tier (or similar)**: that
filesystem is ephemeral — it resets on every redeploy, and isn't guaranteed
to survive restarts either. Saved routes will work fine day-to-day, but
expect them to disappear next time you push an update to the backend. If
that becomes a real problem, swap `storage.js` for a client against a free
hosted KV store (Upstash Redis is a good fit — same four exported functions,
different implementation, nothing in `server.js` needs to change).

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
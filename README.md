# 24Graph — ATC 24 route planning

Two independent apps, run separately:

```
24data-gateway/
  frontend/    Vite + React app (the 24Graph UI)
  backend/     Node relay that connects to 24data and serves live aircraft data
```

## Prerequisites

* Node.js 18+ (`node -v` to check — get it from https://nodejs.org if needed)
* VS Code (optional but recommended: install the "ES7+ React/Redux/React-Native
  snippets" and "ESLint" extensions for a smoother time editing the frontend)

## 1. Open the project

In VS Code: `File -> Open Folder...` -> select the `24data-gateway` folder.
You'll want **two terminals** open side by side (VS Code: `` Ctrl+` `` / `` Cmd+` ``
then click the `+` to split) — one for the frontend, one for the backend.

## 2. Run the backend

```bash
cd backend
npm install
node server.js
```

You should see:

```
[24data] websocket connected
24Graph backend listening on :8420
```

Check it's alive: open `http://localhost:8420/health` in a browser — should
return JSON with a `cachedAircraft` count.

If it *doesn't* say "websocket connected," that's worth debugging before
moving on — see the troubleshooting note at the bottom.

## 3. Run the frontend

In the second terminal:

```bash
cd frontend
npm install
npm run dev
```

Vite will print a local URL, normally `http://localhost:5173`. Open it in
your browser — that's the 24Graph app.

## 4. Try it

* **SIMULATE** mode works immediately, no backend needed — build a route
  and hit play on the progress panel.
* **LIVE** mode needs the backend running (step 2). Switch to LIVE, enter
  your Roblox username (you need to actually be flying in ATC 24 for it to
  find you) and `http://localhost:8420` as the backend URL.

## Editing

* `frontend/src/App.jsx` is the entire frontend (data + logic + UI + styles
  in one file, same structure it had as a Claude artifact). Vite hot-reloads
  on save.
* `backend/server.js` is the whole relay. Restart `node server.js` after
  editing it (or run `npx nodemon server.js` instead of `node server.js` for
  auto-restart — `npm install -D nodemon` first).

## Troubleshooting the backend's 24data connection

I couldn't test `backend/server.js` against the real 24data server myself —
it was built from their public docs but not run live. If `node server.js`
doesn't log "websocket connected," things to check:

* Confirm `wss://24data.ptfs.app/wss` is reachable at all from your network
  (no corporate proxy/firewall blocking it).
* 24data caps WebSocket connections at 3 total — if you've got other tools
  or multiple copies of this server running, you may be hitting that limit.
* Check the terminal for the actual error message from the `ws` library and
  we can adjust `server.js` from there.

## Next steps / known gaps

* Only IRFD (Rockford) has real SID/STAR data — everything else falls back
  to direct routing in the UI.
* No persistence — routes reset on page refresh (would need `window.storage`
  if staying inside a Claude artifact, or a real DB/localStorage outside it).
* No real geographic coordinates yet, so the "map" is the schematic route
  tape rather than a true moving map — see the chat history with Claude for the
  plan on sourcing real stud coordinates later.

# 24Graph

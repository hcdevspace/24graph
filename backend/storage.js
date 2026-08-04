// Simple file-backed store for saved flight plans, scoped per Roblox username.
//
// CAVEAT: this writes to a JSON file on local disk. That's genuinely
// persistent while the server process stays up, but most free hosts
// (including Render's free tier) give you an EPHEMERAL filesystem - it
// resets on every redeploy and isn't guaranteed to survive restarts either.
// Fine for now / low-stakes use; if losing saved routes on a redeploy
// becomes a real problem, swap this file for a small client against a
// free hosted KV store (e.g. Upstash Redis) - same four functions below,
// different implementation underneath. Nothing in server.js would need to change.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "routes-store.json");

function readStore() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch (e) {
    return {}; // no file yet, or unreadable - start fresh
  }
}

function writeStore(store) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
}

export function saveRoute(user, name, config) {
  const store = readStore();
  if (!store[user]) store[user] = {};
  store[user][name] = { config, savedAt: Date.now() };
  writeStore(store);
}

export function listRoutes(user) {
  const store = readStore();
  return Object.entries(store[user] || {})
    .sort((a, b) => b[1].savedAt - a[1].savedAt)
    .map(([name]) => name);
}

export function getRoute(user, name) {
  const store = readStore();
  return store[user]?.[name]?.config ?? null;
}

export function deleteRoute(user, name) {
  const store = readStore();
  if (store[user]) delete store[user][name];
  writeStore(store);
}
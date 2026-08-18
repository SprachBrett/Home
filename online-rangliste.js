// ============================================================
// online-rangliste.js — Echte, geräteübergreifende Rangliste
//
// Läuft über dieselbe Supabase-Instanz wie das Account-System
// (auth.js). Kein zweites Backend, keine zweite Anmeldung mehr
// nötig — XP hängt direkt am eingeloggten Account (Spalte "xp" in
// sprachbrett_players).
//
// Sicherheit: Ein Datenbank-Trigger (siehe
// supabase-schema-leaderboard.sql) verhindert serverseitig, dass XP
// sinkt oder pro Sync um mehr als 40 steigt (eine Lektion gibt
// maximal 25 XP) — außer beim bewussten Zurücksetzen auf exakt 0
// (siehe supabase-schema-leaderboard-fix.sql). Zusätzlich werden
// hier nur Datensätze hochgeladen, deren lokale Prüfsumme gültig
// ist (siehe storage.js) — manipulierte lokale Daten werden also
// gar nicht erst an die Online-Rangliste gesendet.
//
// Zeigt nur die Top 20 + die eigene Position (falls außerhalb der
// Top 20), statt beliebig viele Zeilen zu laden.
//
// Live-Updates laufen per Polling, solange die Rangliste-Ansicht
// offen UND der Tab/die App sichtbar ist (pausiert automatisch im
// Hintergrund, um unnötige Anfragen zu sparen) — kein
// Realtime-Websocket nötig für eine Hobby-Rangliste.
// ============================================================

import { isConfigured } from "./auth.js?v=1787038118";

const SUPABASE_URL = 'https://vxxgzstcyfbtalgyspia.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_IQG5cqOPBc8kslXPXpqNIA_HnurwsNe';
const POLL_INTERVAL_MS = 8000;
const TOP_N = 20;

async function sb(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: opts.method || 'GET',
    body: opts.body,
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': opts.prefer || 'return=representation',
      ...(opts.headers || {})
    }
  });
  if (!res.ok) {
    let msg = res.statusText;
    try { const j = await res.json(); msg = j.message || msg; } catch (e) {}
    throw new Error(`Server-Fehler (${res.status}): ${msg}`);
  }
  return res;
}

async function sbJson(path, opts = {}) {
  const res = await sb(path, opts);
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function isOnlineAvailable() {
  return isConfigured();
}

// Schreibt den eigenen Punktestand in die Online-Rangliste.
// Wird verweigert, wenn die lokalen Daten als manipuliert markiert sind.
export async function syncScoreOnline(user) {
  if (user.everTampered) {
    console.warn(
      "Online-Rangliste: Synchronisierung übersprungen — everTampered=true. " +
      "Dein XP-Stand bleibt lokal sichtbar, wird aber NICHT an Supabase gesendet, " +
      "bis dieses Flag zurückgesetzt wird (siehe storage.js computeSig)."
    );
    return false;
  }
  if (!isConfigured() || !user.name) return false;

  try {
    await sbJson(`sprachbrett_players?username_lower=eq.${encodeURIComponent(user.name.trim().toLowerCase())}`, {
      method: "PATCH",
      body: JSON.stringify({ xp: user.xp }),
      prefer: "return=minimal"
    });
    return true;
  } catch (e) {
    // Meist der Anti-Cheat-Trigger, z.B. weil der XP-Sprung seit dem
    // letzten Sync > 40 war oder XP gesunken ist.
    console.error("Online-Rangliste: Synchronisierung fehlgeschlagen.", e.message || e);
    return false;
  }
}

// Zählt, wie viele (nicht gesperrte) Spieler mehr XP haben als der
// übergebene Wert — per HEAD-Request mit "count=exact", ohne die
// eigentlichen Zeilen zu laden. Ergibt direkt den eigenen Rang - 1.
async function countPlayersAbove(xp) {
  const res = await sb(`sprachbrett_players?select=id&banned=eq.false&xp=gt.${xp}`, {
    method: "HEAD",
    headers: { "Prefer": "count=exact" }
  });
  const range = res.headers.get("content-range"); // z.B. "*/7"
  if (!range) return null;
  const total = range.split("/")[1];
  return total && total !== "*" ? parseInt(total, 10) : null;
}

async function fetchLeaderboard(ownUsername) {
  const rows = await sbJson(`sprachbrett_players?select=id,username,xp&banned=eq.false&order=xp.desc&limit=${TOP_N}`);
  const ownLower = (ownUsername || "").trim().toLowerCase();
  const entries = rows.map((p) => ({
    id: p.id,
    name: p.username,
    xp: p.xp || 0,
    isUser: p.username.trim().toLowerCase() === ownLower
  }));
  entries.forEach((e, i) => (e.rank = i + 1));

  if (!ownLower || entries.some((e) => e.isUser)) return entries;

  // Eigener Account nicht in den Top 20 -> separat nachladen und mit
  // einer Trennzeile anhängen, statt die ganze Tabelle zu laden.
  const ownRows = await sbJson(`sprachbrett_players?username_lower=eq.${encodeURIComponent(ownLower)}&select=id,username,xp,banned&limit=1`);
  if (!ownRows || !ownRows.length || ownRows[0].banned) return entries;

  const own = ownRows[0];
  const above = await countPlayersAbove(own.xp || 0);
  entries.push({ divider: true });
  entries.push({
    id: own.id, name: own.username, xp: own.xp || 0,
    isUser: true, rank: above !== null ? above + 1 : null
  });
  return entries;
}

// Abonniert Live-Updates der globalen Rangliste per Polling. Pausiert
// automatisch, wenn der Tab/die App im Hintergrund ist. Gibt eine
// Unsubscribe-Funktion zurück, die beim Verlassen der Ansicht
// aufgerufen werden sollte.
export async function subscribeLeaderboardOnline(callback, ownUsername) {
  if (!isConfigured()) return () => {};

  let cancelled = false;
  let intervalId = null;

  async function tick() {
    if (document.hidden) return; // im Hintergrund nicht unnötig pollen
    try {
      const entries = await fetchLeaderboard(ownUsername);
      if (!cancelled) callback(entries);
    } catch (e) {
      console.error("Online-Rangliste: Konnte nicht geladen werden.", e.message || e);
      if (!cancelled) callback(null);
    }
  }

  function onVisibilityChange() {
    if (!document.hidden) tick(); // beim Zurückkehren sofort auffrischen
  }

  await tick(); // sofort einmal laden, nicht erst nach dem ersten Intervall
  intervalId = setInterval(tick, POLL_INTERVAL_MS);
  document.addEventListener("visibilitychange", onVisibilityChange);

  return () => {
    cancelled = true;
    clearInterval(intervalId);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}

export const ONLINE_LEADERBOARD_ENABLED = true;

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
// maximal 25 XP). Zusätzlich werden hier nur Datensätze
// hochgeladen, deren lokale Prüfsumme gültig ist (siehe
// storage.js) — manipulierte lokale Daten werden also gar nicht
// erst an die Online-Rangliste gesendet.
//
// Live-Updates laufen per Polling (alle 4s), solange die
// Rangliste-Ansicht offen ist — kein Realtime-Websocket nötig für
// eine Hobby-Rangliste.
// ============================================================

import { isConfigured } from "./auth.js?v=1787037339";

const SUPABASE_URL = 'https://vxxgzstcyfbtalgyspia.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_IQG5cqOPBc8kslXPXpqNIA_HnurwsNe';
const POLL_INTERVAL_MS = 4000;

async function sb(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: opts.method || 'GET',
    body: opts.body,
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': opts.prefer || 'return=representation'
    }
  });
  if (!res.ok) {
    let msg = res.statusText;
    try { const j = await res.json(); msg = j.message || msg; } catch (e) {}
    throw new Error(`Server-Fehler (${res.status}): ${msg}`);
  }
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
    await sb(`sprachbrett_players?username_lower=eq.${encodeURIComponent(user.name.trim().toLowerCase())}`, {
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

async function fetchLeaderboard(ownUsername) {
  const rows = await sb(`sprachbrett_players?select=id,username,xp&banned=eq.false&order=xp.desc&limit=50`);
  const ownLower = (ownUsername || "").trim().toLowerCase();
  const entries = rows.map((p) => ({
    id: p.id,
    name: p.username,
    xp: p.xp || 0,
    isUser: p.username.trim().toLowerCase() === ownLower
  }));
  entries.forEach((e, i) => (e.rank = i + 1));
  return entries;
}

// Abonniert Live-Updates der globalen Rangliste per Polling. Gibt
// eine Unsubscribe-Funktion zurück, die beim Verlassen der Ansicht
// aufgerufen werden sollte.
export async function subscribeLeaderboardOnline(callback, ownUsername) {
  if (!isConfigured()) return () => {};

  let cancelled = false;

  async function tick() {
    try {
      const entries = await fetchLeaderboard(ownUsername);
      if (!cancelled) callback(entries);
    } catch (e) {
      console.error("Online-Rangliste: Konnte nicht geladen werden.", e.message || e);
      if (!cancelled) callback(null);
    }
  }

  await tick(); // sofort einmal laden, nicht erst nach 4s
  const intervalId = setInterval(tick, POLL_INTERVAL_MS);

  return () => {
    cancelled = true;
    clearInterval(intervalId);
  };
}

export const ONLINE_LEADERBOARD_ENABLED = true;

// ============================================================
// rangliste.js — Rangliste
//
// Hinweis zur Realität: SprachBrett läuft rein statisch auf GitHub Pages
// ohne eigenen Server, es gibt also keine echte globale Datenbank.
// Um trotzdem eine lebendige Rangliste zu bieten, simuliert dieses Modul
// eine Liga aus Mitspielern, deren XP mit der Zeit plausibel weiterwächst
// (deterministisch pro Gerät, gespeichert in localStorage). Der Nutzer
// wird korrekt nach seinem echten XP-Stand einsortiert.
// ============================================================

import { loadRangliste, saveRangliste } from "./storage.js?v=1786965190";

const BOT_NAMES = [
  "Lena.exe", "Max_Speed", "Nova", "Kilian_B", "Pixel_Wolf", "Sara_K",
  "TigerTom", "Mira", "Jonas_dev", "Yuki", "Bretti_Fan", "Elian",
  "Sunny", "Theo_R", "Ines", "Rocket_Rae", "Finn", "Aiko"
];

const LEAGUES = ["Bronze", "Silber", "Gold", "Saphir", "Smaragd", "Diamant"];

function seedFromString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

// Einfacher, deterministischer Pseudo-Zufallsgenerator (mulberry32)
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function ensureBots() {
  let data = loadRangliste();
  const nowIso = new Date().toISOString();

  if (!data) {
    const rng = mulberry32(seedFromString("sprachbrett-liga-v1"));
    data = {
      lastTick: nowIso,
      bots: BOT_NAMES.map((name) => ({
        name,
        xp: Math.floor(rng() * 250) + 20,
        // XP-Wachstum pro Stunde, individuell verschieden -> realistische Streuung
        growthPerHour: +(rng() * 3 + 0.4).toFixed(2)
      }))
    };
    saveRangliste(data);
  }

  // Bots seit letztem Besuch "weiterspielen" lassen, gedeckelt auf 14 Tage
  // damit lange Abwesenheit die Liga nicht komplett verzerrt.
  const hoursPassed = Math.min(
    (Date.now() - new Date(data.lastTick).getTime()) / 3600000,
    14 * 24
  );
  if (hoursPassed > 0.05) {
    data.bots.forEach((bot) => {
      bot.xp = Math.round(bot.xp + bot.growthPerHour * hoursPassed);
    });
    data.lastTick = nowIso;
    saveRangliste(data);
  }
  return data;
}

// Gibt sortierte Rangliste inkl. eingefügtem Nutzer zurück
export function getRangliste(user) {
  const data = ensureBots();
  const entries = data.bots.map((b) => ({ name: b.name, xp: b.xp, isUser: false }));
  entries.push({ name: user.name || "Du", xp: user.xp, isUser: true });
  entries.sort((a, b) => b.xp - a.xp);
  entries.forEach((e, i) => (e.rank = i + 1));
  return entries;
}

// Grobe "Liga" basierend auf Gesamt-XP, rein kosmetisch
export function getLeague(xp) {
  const idx = Math.min(LEAGUES.length - 1, Math.floor(xp / 300));
  return LEAGUES[idx];
}

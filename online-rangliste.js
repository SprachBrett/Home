// ============================================================
// online-rangliste.js — Echte, geräteübergreifende Rangliste
//
// Wird nur aktiv, wenn firebase-config.js ausgefüllt und
// FIREBASE_ENABLED = true gesetzt ist. Bis dahin liefert dieses
// Modul einfach "nicht verfügbar" und workspace.js fällt automatisch
// auf die lokale, simulierte Rangliste (rangliste.js) zurück.
//
// Sicherheit: Die Firebase-Regeln (firebase-rules.json) erzwingen
// serverseitig, dass jeder Nutzer nur seinen eigenen Eintrag
// schreiben kann, XP nie sinken kann und pro Schreibvorgang höchstens
// um 40 steigen darf (eine Lektion gibt maximal 25 XP). Zusätzlich
// werden hier nur Datensätze hochgeladen, deren lokale Prüfsumme
// gültig ist (siehe storage.js) — manipulierte lokale Daten werden
// also gar nicht erst an die Online-Rangliste gesendet.
// ============================================================

import { FIREBASE_CONFIG, FIREBASE_ENABLED } from "./firebase-config.js?v=1786965190";

const SDK_BASE = "https://www.gstatic.com/firebasejs/12.17.1";

let app = null;
let auth = null;
let db = null;
let uid = null;
let initPromise = null;

function init() {
  if (!FIREBASE_ENABLED) return Promise.resolve(false);
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const [{ initializeApp }, { getAuth, signInAnonymously, onAuthStateChanged }, { getDatabase }] =
        await Promise.all([
          import(/* webpackIgnore: true */ `${SDK_BASE}/firebase-app.js`),
          import(/* webpackIgnore: true */ `${SDK_BASE}/firebase-auth.js`),
          import(/* webpackIgnore: true */ `${SDK_BASE}/firebase-database.js`)
        ]);

      app = initializeApp(FIREBASE_CONFIG);
      auth = getAuth(app);
      db = getDatabase(app);

      await new Promise((resolve, reject) => {
        const unsub = onAuthStateChanged(auth, (user) => {
          if (user) {
            uid = user.uid;
            unsub();
            resolve();
          }
        }, reject);
        signInAnonymously(auth).catch(reject);
      });

      return true;
    } catch (e) {
      console.error("Online-Rangliste: Firebase konnte nicht initialisiert werden.", e);
      return false;
    }
  })();

  return initPromise;
}

export async function isOnlineAvailable() {
  return init();
}

// Schreibt den eigenen Punktestand in die Online-Rangliste.
// Wird verweigert, wenn die lokalen Daten als manipuliert markiert sind.
export async function syncScoreOnline(user) {
  if (user.everTampered) {
    console.warn(
      "Online-Rangliste: Synchronisierung übersprungen — everTampered=true. " +
      "Dein XP-Stand bleibt lokal sichtbar, wird aber NICHT an Firebase gesendet, " +
      "bis dieses Flag zurückgesetzt wird (siehe storage.js computeSig)."
    );
    return false;
  }
  const ok = await init();
  if (!ok || !uid) {
    console.warn("Online-Rangliste: Sync übersprungen — Firebase nicht initialisiert oder nicht authentifiziert.");
    return false;
  }

  try {
    const { ref, set, serverTimestamp } = await import(/* webpackIgnore: true */ `${SDK_BASE}/firebase-database.js`);
    await set(ref(db, `leaderboard/${uid}`), {
      name: (user.name || "Lerner").slice(0, 24),
      xp: user.xp,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (e) {
    // Meist eine PERMISSION_DENIED von den Firebase-Regeln, z.B. weil der
    // XP-Sprung seit dem letzten Sync > 40 war oder XP gesunken ist.
    console.error("Online-Rangliste: Synchronisierung fehlgeschlagen.", e.code || e.message || e);
    return false;
  }
}

// Abonniert Live-Updates der globalen Rangliste. Gibt eine
// Unsubscribe-Funktion zurück, die beim Verlassen der Ansicht
// aufgerufen werden sollte.
export async function subscribeLeaderboardOnline(callback) {
  const ok = await init();
  if (!ok) return () => {};

  try {
    const { ref, onValue } = await import(/* webpackIgnore: true */ `${SDK_BASE}/firebase-database.js`);
    const listRef = ref(db, "leaderboard");
    return onValue(listRef, (snap) => {
      const val = snap.val() || {};
      const entries = Object.entries(val).map(([id, v]) => ({
        id,
        name: v.name || "Anonym",
        xp: v.xp || 0,
        isUser: id === uid
      }));
      entries.sort((a, b) => b.xp - a.xp);
      entries.forEach((e, i) => (e.rank = i + 1));
      callback(entries);
    }, (err) => {
      console.error("Online-Rangliste: Live-Abonnement fehlgeschlagen.", err);
      callback(null);
    });
  } catch (e) {
    console.error("Online-Rangliste: Konnte nicht abonniert werden.", e);
    return () => {};
  }
}

export { FIREBASE_ENABLED };

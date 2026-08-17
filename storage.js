// ============================================================
// storage.js — Zentrale localStorage-Schicht
// Alles, was der Nutzer an Fortschritt hat, läuft durch dieses Modul.
//
// INTEGRITÄTSPRÜFUNG:
// Beim Speichern wird eine Prüfsumme (_sig) über die spielrelevanten
// Felder (XP, Streak, abgeschlossene Lektionen, Abzeichen …) gebildet
// und mitgespeichert. Beim Laden/Importieren wird sie neu berechnet
// und verglichen. Weicht sie ab, wurde der Datensatz von außen
// verändert (z.B. Text-Editor oder Konsole).
//
// Ehrlicher Hinweis: Das ist eine leichte, clientseitige Prüfung —
// kein kryptografisches Geheimnis, da der gesamte Code offen im
// Browser liegt. Sie verhindert zuverlässig "mal eben die Zahl im
// JSON ändern", hält aber niemanden auf, der den Algorithmus hier
// im Quelltext liest und nachbaut. Echte Fälschungssicherheit gibt
// es nur mit serverseitiger Prüfung (siehe online-rangliste.js).
// ============================================================

const KEY = "sprachbrett_user";
const RANG_KEY = "sprachbrett_rangliste";
const SIG_SALT = "sprachbrett-integrity-v1-8f3d21";

const DEFAULT_USER = {
  name: "Lerner",
  currentLanguage: "en",
  xp: 0,
  hearts: 5,
  maxHearts: 5,
  lastHeartRegenAt: null, // ISO-Zeitstempel der letzten Herz-Regeneration
  streak: 0,
  lastActiveDate: null, // ISO Datum (YYYY-MM-DD)
  dailyGoalXp: 30,
  xpToday: 0,
  xpTodayDate: null,
  completedLessons: { en: [], fr: [], es: [] }, // lessonId[]
  lessonStars: {}, // lessonId -> 1..3
  badges: [], // badge ids
  settings: {
    sound: true,
    volume: 80,
    dailyGoal: 30
  },
  everTampered: false, // permanentes Flag, sobald einmal eine ungültige Signatur erkannt wurde
  createdAt: new Date().toISOString()
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// ---- Integrität ----

function djb2(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16);
}

// Nur die spielrelevanten Felder fließen in die Prüfsumme ein.
function computeSig(user) {
  const core = {
    xp: user.xp,
    streak: user.streak,
    hearts: user.hearts,
    xpToday: user.xpToday,
    completedLessons: user.completedLessons,
    lessonStars: user.lessonStars,
    badges: user.badges,
    everTampered: !!user.everTampered
  };
  return djb2(JSON.stringify(core) + SIG_SALT);
}

function mergeWithDefaults(data) {
  return {
    ...structuredClone(DEFAULT_USER),
    ...data,
    settings: { ...DEFAULT_USER.settings, ...(data.settings || {}) }
  };
}

export function loadUser() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const fresh = structuredClone(DEFAULT_USER);
      saveUser(fresh);
      return fresh;
    }
    const parsed = JSON.parse(raw);
    const merged = mergeWithDefaults(parsed);

    if (parsed._sig) {
      const mismatch = computeSig(merged) !== parsed._sig;
      if (mismatch) merged.everTampered = true;
    }
    // Kein _sig vorhanden = Altbestand vor Einführung dieser Prüfung -> nicht bestrafen.

    return merged;
  } catch (e) {
    console.error("Fehler beim Laden des Nutzerstands:", e);
    return structuredClone(DEFAULT_USER);
  }
}

export function saveUser(user) {
  try {
    user._sig = computeSig(user);
    localStorage.setItem(KEY, JSON.stringify(user));
  } catch (e) {
    console.error("Fehler beim Speichern des Nutzerstands:", e);
  }
}

export function resetUser() {
  localStorage.removeItem(KEY);
  return loadUser();
}

export function exportUser() {
  const user = loadUser();
  user._sig = computeSig(user); // frische, gültige Signatur für die Exportdatei
  const blob = new Blob([JSON.stringify(user, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sprachbrett-fortschritt.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Importierte Dateien werden strikt geprüft: fehlt die Signatur oder
// stimmt sie nicht mit dem Inhalt überein, wird der Import verweigert.
export function importUserFromFile(file, onDone) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);

      if (!data._sig) {
        onDone(null, "Diese Datei enthält keine gültige Prüfsumme und kann nicht importiert werden.");
        return;
      }
      const merged = mergeWithDefaults(data);
      if (computeSig(merged) !== data._sig) {
        onDone(null, "Diese Datei wurde nachträglich verändert und wird deshalb nicht importiert.");
        return;
      }

      saveUser(merged);
      onDone(merged, null);
    } catch (e) {
      onDone(null, "Datei konnte nicht gelesen werden — ist es eine gültige SprachBrett-Exportdatei?");
    }
  };
  reader.onerror = () => onDone(null, "Datei konnte nicht gelesen werden.");
  reader.readAsText(file);
}

// ---- Rangliste (lokaler Fallback, siehe rangliste.js) ----
export function loadRangliste() {
  try {
    const raw = localStorage.getItem(RANG_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function saveRangliste(data) {
  localStorage.setItem(RANG_KEY, JSON.stringify(data));
}

export { todayISO, DEFAULT_USER };

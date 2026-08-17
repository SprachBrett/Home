// ============================================================
// auth.js — Account-System für SprachBrett (nur Anmeldung/Registrierung)
//
// Nutzt dieselbe Supabase-Instanz wie NACHRICHTENBRETT, aber eine
// eigene Tabelle "sprachbrett_players", die NICHTS mit dem
// Mail-System zu tun hat — kein Chat, kein Posteingang, nur:
//   username (eindeutig, wird 1:1 in der Rangliste angezeigt)
//   password_hash (SHA-256, clientseitig gehasht)
//   created_at
//
// SICHERHEIT: password_hash wird NIE an den Client zurückgegeben
// (Spaltenrecht in Supabase entzogen, siehe supabase-schema-security.sql).
// Login, Passwort ändern, Konto löschen und Admin-Aktionen laufen
// über Postgres-Funktionen (RPC), die den Hash nur serverseitig
// vergleichen.
//
// WICHTIG (ehrlicher Hinweis):
// Das ist ein einfacher, clientseitiger SHA-256-Hash ohne Salt/Pfeffer
// pro Nutzer — für ein Hobby-Projekt ausreichend, aber kein Ersatz für
// eine "echte" Auth-Lösung (z.B. Supabase Auth mit bcrypt serverseitig),
// falls das je wichtig werden sollte.
//
// TABELLEN/FUNKTIONEN (in Supabase SQL-Editor einmalig anlegen):
//   1. supabase-schema.sql
//   2. supabase-schema-admin.sql
//   3. supabase-schema-security.sql
// ============================================================

const SUPABASE_URL = 'https://vxxgzstcyfbtalgyspia.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_IQG5cqOPBc8kslXPXpqNIA_HnurwsNe';

const SESSION_KEY = "sprachbrett_session"; // { username }

// In-memory (NICHT localStorage) gecachter Passwort-Hash der aktuell
// eingeloggten Person, ausschließlich für diese Browser-Session.
// Nötig, um "Passwort ändern", "Konto löschen" (eigenes) und
// Admin-Aktionen erneut serverseitig autorisieren zu können, ohne
// den Hash dauerhaft zu speichern. Geht beim Neuladen der Seite
// verloren -> dann wird bei Bedarf einmal neu nach dem Passwort gefragt.
let currentHash = null;
let currentUsernameLower = null;

export function cacheCredentials(usernameLower, hash) {
  currentUsernameLower = usernameLower;
  currentHash = hash;
}
export function hasCachedCredentials() {
  return !!currentHash;
}
export function clearCachedCredentials() {
  currentHash = null;
  currentUsernameLower = null;
}

function isConfigured() {
  return SUPABASE_URL && !SUPABASE_URL.includes('DEIN-PROJEKT') &&
         SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes('DEIN-ANON-KEY');
}

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
    if (res.status === 409 || /duplicate key|already exists/i.test(msg)) {
      throw new Error("Dieser Benutzername ist bereits vergeben.");
    }
    throw new Error(`Server-Fehler (${res.status}): ${msg}`);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function rpc(fn, args) {
  return sb(`rpc/${fn}`, { method: 'POST', body: JSON.stringify(args), prefer: 'return=representation' });
}

// Erzeugt einen gut lesbaren Wiederherstellungscode (keine
// verwechselbaren Zeichen wie 0/O oder 1/I/L).
function generateRecoveryCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const raw = Array.from(bytes).map((b) => chars[b % chars.length]).join("");
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

async function hashPassword(pw) {
  const enc = new TextEncoder().encode(pw);
  const digest = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function normalize(name) {
  return name.trim();
}

function validateUsername(name) {
  if (name.length < 3 || name.length > 20) {
    return "Der Benutzername muss zwischen 3 und 20 Zeichen lang sein.";
  }
  if (!/^[a-zA-Z0-9_.\-äöüÄÖÜß ]+$/.test(name)) {
    return "Erlaubt sind nur Buchstaben, Zahlen, Leerzeichen, Punkt, Binde- und Unterstrich.";
  }
  return null;
}

function isBanned(v) {
  return v === true || v === "true";
}

// ---- Verfügbarkeit prüfen ----
export async function usernameExists(username) {
  const lower = username.trim().toLowerCase();
  const rows = await sb(`sprachbrett_players?username_lower=eq.${encodeURIComponent(lower)}&select=id`);
  return rows.length > 0;
}

// ---- Registrierung ----
// Prüft zuerst clientseitig (schnelles Feedback), dann serverseitig
// nochmal per Insert — die Datenbank-Unique-Constraint auf
// username_lower ist die eigentliche, verlässliche Sperre gegen
// doppelte Namen (z.B. bei zwei gleichzeitigen Registrierungen).
// Die Antwort enthält bewusst nur unkritische Spalten (kein Hash).
// Gibt zusätzlich den KLARTEXT-Wiederherstellungscode zurück — das
// ist der einzige Moment, in dem er je sichtbar ist. Danach ist nur
// noch sein Hash in der Datenbank gespeichert.
export async function registerPlayer(username, password) {
  const name = normalize(username);
  const err = validateUsername(name);
  if (err) throw new Error(err);
  if (password.length < 4) throw new Error("Das Passwort muss mindestens 4 Zeichen lang sein.");

  if (await usernameExists(name)) {
    throw new Error(`Der Benutzername „${name}" ist bereits vergeben. Bitte wähle einen anderen.`);
  }

  const hash = await hashPassword(password);
  const recoveryCode = generateRecoveryCode();
  const recoveryHash = await hashPassword(recoveryCode);
  try {
    const rows = await sb('sprachbrett_players?select=id,username,is_admin,banned,created_at', {
      method: 'POST',
      body: JSON.stringify({
        username: name, username_lower: name.toLowerCase(),
        password_hash: hash, recovery_code_hash: recoveryHash
      })
    });
    cacheCredentials(name.toLowerCase(), hash);
    return { player: rows[0], recoveryCode };
  } catch (e) {
    // Falls zwei Registrierungen zeitgleich passieren, greift hier die
    // Datenbank-Unique-Constraint statt der Vorabprüfung oben.
    throw new Error(/bereits vergeben|duplicate/i.test(e.message)
      ? `Der Benutzername „${name}" ist bereits vergeben. Bitte wähle einen anderen.`
      : e.message);
  }
}

// ---- Login ----
// Läuft über eine Postgres-Funktion (verify_login), damit der
// Passwort-Hash nie über die API zum Client geschickt wird — nur
// das Ergebnis "stimmt überein ja/nein" kommt zurück. Aus demselben
// Grund gibt es absichtlich EINE gemeinsame Fehlermeldung für
// "Benutzername existiert nicht" und "falsches Passwort".
export async function loginPlayer(username, password) {
  const name = normalize(username);
  const lower = name.toLowerCase();
  const hash = await hashPassword(password);
  const rows = await rpc('verify_login', { p_username_lower: lower, p_hash: hash });
  if (!rows || !rows.length) throw new Error("Benutzername oder Passwort falsch.");
  if (isBanned(rows[0].banned)) throw new Error("Dieses Konto wurde gesperrt.");
  cacheCredentials(lower, hash);
  return rows[0];
}

// ---- Stiller Re-Check bei bestehender Session (z.B. Bann seit letztem Besuch) ----
export async function refreshPlayer(username) {
  const rows = await sb(`sprachbrett_players?username_lower=eq.${encodeURIComponent(username.trim().toLowerCase())}&select=id,username,banned,is_admin`);
  if (!rows.length) throw new Error("Dieses Konto existiert nicht mehr.");
  if (isBanned(rows[0].banned)) throw new Error("Dieses Konto wurde gesperrt.");
  return rows[0];
}

// ---- Eigenes Passwort ändern ----
// Braucht das aktuelle Passwort erneut (Sicherheitsabfrage), nicht
// den in-memory gecachten Hash — falls jemand am offenen Gerät sitzt,
// soll er trotzdem das Passwort kennen müssen, um es zu ändern.
export async function changeOwnPassword(username, oldPassword, newPassword) {
  if (newPassword.length < 4) throw new Error("Das neue Passwort muss mindestens 4 Zeichen lang sein.");
  const lower = username.trim().toLowerCase();
  const oldHash = await hashPassword(oldPassword);
  const newHash = await hashPassword(newPassword);
  const ok = await rpc('change_password', { p_username_lower: lower, p_old_hash: oldHash, p_new_hash: newHash });
  if (!ok) throw new Error("Das aktuelle Passwort ist falsch.");
  cacheCredentials(lower, newHash);
  return true;
}

// ---- Eigenes Konto löschen ----
export async function deleteOwnAccount(username, password) {
  const lower = username.trim().toLowerCase();
  const hash = await hashPassword(password);
  const ok = await rpc('delete_own_account', { p_username_lower: lower, p_hash: hash });
  if (!ok) throw new Error("Passwort falsch — Konto wurde nicht gelöscht.");
  clearCachedCredentials();
  return true;
}

// ---- Passwort vergessen: mit Wiederherstellungscode zurücksetzen ----
export async function resetPasswordWithRecoveryCode(username, recoveryCode, newPassword) {
  if (newPassword.length < 4) throw new Error("Das neue Passwort muss mindestens 4 Zeichen lang sein.");
  const lower = username.trim().toLowerCase();
  const recoveryHash = await hashPassword(recoveryCode.trim().toUpperCase());
  const newHash = await hashPassword(newPassword);
  const ok = await rpc('reset_password_with_recovery_code', {
    p_username_lower: lower, p_recovery_hash: recoveryHash, p_new_password_hash: newHash
  });
  if (!ok) throw new Error("Benutzername oder Wiederherstellungscode falsch (oder Code schon benutzt).");
  cacheCredentials(lower, newHash);
  return true;
}

// ---- Neuen Wiederherstellungscode erzeugen (braucht aktuelles Passwort) ----
// z.B. im Profil, falls der alte Code verloren ging oder schon
// benutzt wurde. Gibt den neuen Klartext-Code einmalig zurück.
export async function regenerateRecoveryCode(username, currentPassword) {
  const lower = username.trim().toLowerCase();
  const hash = await hashPassword(currentPassword);
  const newCode = generateRecoveryCode();
  const newRecoveryHash = await hashPassword(newCode);
  const ok = await rpc('set_recovery_code', {
    p_username_lower: lower, p_password_hash: hash, p_new_recovery_hash: newRecoveryHash
  });
  if (!ok) throw new Error("Passwort falsch.");
  return newCode;
}

// ---- Admin: alle Spieler auflisten (nie inkl. Passwort-Hash) ----
export async function listPlayers() {
  return sb(`sprachbrett_players?select=id,username,banned,is_admin,created_at&order=created_at.desc`);
}

// ---- Admin: Nutzer sperren/entsperren ----
// Serverseitig ist per Spaltenrecht nur "banned" überhaupt änderbar
// (siehe supabase-schema-admin.sql) — is_admin/password_hash lassen
// sich über diesen Weg nicht anfassen.
export async function setBanned(id, banned) {
  await sb(`sprachbrett_players?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ banned }),
    prefer: "return=minimal"
  });
}

// ---- Admin: Passwort eines Nutzers zurücksetzen ----
// Braucht das eigene Admin-Passwort zur Autorisierung (wird
// serverseitig in admin_reset_password geprüft). Gibt das neue,
// zufällig generierte Klartext-Passwort zurück, damit der Admin es
// dem Nutzer mitteilen kann — danach ist es nirgends mehr gespeichert.
export async function adminResetPassword(adminUsername, adminPassword, targetId) {
  const adminLower = adminUsername.trim().toLowerCase();
  const adminHash = await hashPassword(adminPassword);
  const tempPassword = Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 4);
  const newHash = await hashPassword(tempPassword);
  const ok = await rpc('admin_reset_password', {
    p_admin_username_lower: adminLower, p_admin_hash: adminHash,
    p_target_id: targetId, p_new_hash: newHash
  });
  if (!ok) throw new Error("Nicht autorisiert — Admin-Passwort falsch?");
  return tempPassword;
}

// ---- Admin: Konto löschen ----
export async function adminDeleteAccount(adminUsername, adminPassword, targetId) {
  const adminLower = adminUsername.trim().toLowerCase();
  const adminHash = await hashPassword(adminPassword);
  const ok = await rpc('admin_delete_account', {
    p_admin_username_lower: adminLower, p_admin_hash: adminHash, p_target_id: targetId
  });
  if (!ok) throw new Error("Nicht autorisiert oder Konto ist selbst ein Admin-Konto.");
  return true;
}

// ---- Session (lokal, "eingeloggt bleiben" auf diesem Gerät) ----
export function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); }
  catch (e) { return null; }
}
export function setSession(username) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ username }));
}
export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  clearCachedCredentials();
}

export { isConfigured, validateUsername };

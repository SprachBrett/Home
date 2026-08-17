// ============================================================
// auth-ui.js — Verdrahtet den Auth-Screen (index.html) mit auth.js
// ============================================================

import {
  isConfigured,
  usernameExists,
  registerPlayer,
  loginPlayer,
  getSession,
  setSession,
  clearSession,
  refreshPlayer,
  validateUsername,
  resetPasswordWithRecoveryCode
} from "./auth.js?v=1786965190";

let debounceTimer = null;

// Fügt zu jedem type="password"-Feld mit [data-toggle] einen kleinen
// Augen-Button zum Ein-/Ausblenden hinzu. Wiederverwendbar für Login,
// Registrierung und später das Passwort-ändern-Formular im Profil.
export function wirePasswordToggles(scope = document) {
  scope.querySelectorAll('input[type="password"][data-toggle]').forEach((input) => {
    if (input.dataset.toggled) return; // nicht doppelt verdrahten
    input.dataset.toggled = "1";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pw-toggle";
    btn.textContent = "👁";
    btn.setAttribute("aria-label", "Passwort anzeigen");
    input.insertAdjacentElement("afterend", btn);
    const wrapper = document.createElement("div");
    wrapper.className = "pw-field";
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);
    wrapper.appendChild(btn);
    btn.addEventListener("click", () => {
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.textContent = show ? "🙈" : "👁";
    });
  });
}

export async function initAuthScreen(onAuthenticated) {
  const authScreen = document.getElementById("auth-screen");

  if (!isConfigured()) {
    authScreen.innerHTML = `
      <div class="auth-card">
        <div class="auth-brand">✦ SPRACHBRETT</div>
        <div class="auth-error" style="display:block;">
          Das Konto-System ist nicht konfiguriert (SUPABASE_URL/ANON_KEY in js/auth.js fehlen).
        </div>
      </div>`;
    return;
  }

  // Bereits angemeldet (Session auf diesem Gerät) -> serverseitig kurz
  // bestätigen (Konto könnte inzwischen gesperrt/gelöscht worden sein),
  // dann direkt starten statt erneut nach dem Passwort zu fragen.
  const existing = getSession();
  if (existing && existing.username) {
    authScreen.innerHTML = `<div class="auth-card"><div class="auth-brand">✦ SPRACHBRETT</div><div class="auth-sub">Melde an…</div></div>`;
    try {
      const player = await refreshPlayer(existing.username);
      onAuthenticated(player);
      return;
    } catch (err) {
      clearSession();
      // Weiter unten zum normalen Login-Screen durchfallen.
      location.reload();
      return;
    }
  }

  wirePasswordToggles();

  const tabLogin = document.getElementById("auth-tab-login");
  const tabRegister = document.getElementById("auth-tab-register");
  const formLogin = document.getElementById("auth-form-login");
  const formRegister = document.getElementById("auth-form-register");
  const formForgot = document.getElementById("auth-form-forgot");
  const authTabs = document.querySelector(".auth-tabs");

  tabLogin.addEventListener("click", () => switchView("login"));
  tabRegister.addEventListener("click", () => switchView("register"));
  document.getElementById("auth-forgot-link").addEventListener("click", () => switchView("forgot"));
  document.getElementById("auth-back-to-login").addEventListener("click", () => switchView("login"));

  function switchView(which) {
    tabLogin.classList.toggle("active", which === "login");
    tabRegister.classList.toggle("active", which === "register");
    formLogin.hidden = which !== "login";
    formRegister.hidden = which !== "register";
    formForgot.hidden = which !== "forgot";
    authTabs.hidden = which === "forgot";
  }

  // ---- Login ----
  formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;
    const errorBox = document.getElementById("login-error");
    const btn = document.getElementById("login-submit");
    errorBox.textContent = "";
    if (!username.trim() || !password) {
      errorBox.textContent = "Bitte Benutzername und Passwort eingeben.";
      return;
    }
    btn.disabled = true;
    btn.textContent = "Prüfe…";
    try {
      const player = await loginPlayer(username, password);
      setSession(player.username);
      onAuthenticated(player);
    } catch (err) {
      errorBox.textContent = err.message;
      btn.disabled = false;
      btn.textContent = "Anmelden";
    }
  });

  // ---- Registrierung: Live-Prüfung ob Benutzername schon existiert ----
  const regUsername = document.getElementById("register-username");
  const regStatus = document.getElementById("register-username-status");

  regUsername.addEventListener("input", () => {
    const name = regUsername.value.trim();
    clearTimeout(debounceTimer);
    if (!name) { regStatus.textContent = ""; regStatus.className = "username-status"; return; }
    const invalid = validateUsername(name);
    if (invalid) {
      regStatus.textContent = invalid;
      regStatus.className = "username-status bad";
      return;
    }
    regStatus.textContent = "Prüfe Verfügbarkeit…";
    regStatus.className = "username-status checking";
    debounceTimer = setTimeout(async () => {
      try {
        const taken = await usernameExists(name);
        if (regUsername.value.trim() !== name) return; // Eingabe hat sich zwischenzeitlich geändert
        regStatus.textContent = taken
          ? `„${name}" ist bereits vergeben.`
          : `„${name}" ist verfügbar.`;
        regStatus.className = "username-status " + (taken ? "bad" : "ok");
      } catch (err) {
        regStatus.textContent = "Verfügbarkeit konnte nicht geprüft werden: " + err.message;
        regStatus.className = "username-status bad";
      }
    }, 400);
  });

  // ---- Registrierung: Absenden ----
  formRegister.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = regUsername.value;
    const password = document.getElementById("register-password").value;
    const password2 = document.getElementById("register-password2").value;
    const errorBox = document.getElementById("register-error");
    const btn = document.getElementById("register-submit");
    errorBox.textContent = "";

    const invalid = validateUsername(username.trim());
    if (invalid) { errorBox.textContent = invalid; return; }
    if (password.length < 4) { errorBox.textContent = "Das Passwort muss mindestens 4 Zeichen lang sein."; return; }
    if (password !== password2) { errorBox.textContent = "Die Passwörter stimmen nicht überein."; return; }

    btn.disabled = true;
    btn.textContent = "Erstelle Konto…";
    try {
      // Serverseitige, verbindliche Prüfung + Anlage — der Live-Check
      // oben ist nur Komfort, hier wird nochmal sauber abgelehnt, falls
      // der Name inzwischen (z.B. durch einen anderen Nutzer) vergeben wurde.
      const { player, recoveryCode } = await registerPlayer(username, password);
      setSession(player.username);
      showRecoveryCodeOnce(recoveryCode, () => onAuthenticated(player));
    } catch (err) {
      errorBox.textContent = err.message;
      btn.disabled = false;
      btn.textContent = "Konto erstellen";
    }
  });

  // ---- Passwort vergessen: Absenden ----
  formForgot.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("forgot-username").value;
    const code = document.getElementById("forgot-code").value;
    const newPassword = document.getElementById("forgot-password").value;
    const errorBox = document.getElementById("forgot-error");
    const btn = document.getElementById("forgot-submit");
    errorBox.textContent = "";
    if (!username.trim() || !code.trim() || !newPassword) {
      errorBox.textContent = "Bitte alle Felder ausfüllen.";
      return;
    }
    btn.disabled = true;
    btn.textContent = "Setze zurück…";
    try {
      await resetPasswordWithRecoveryCode(username, code, newPassword);
      showToastLike("Passwort wurde zurückgesetzt. Du kannst dich jetzt anmelden.");
      document.getElementById("login-username").value = username.trim();
      switchView("login");
      e.target.reset();
    } catch (err) {
      errorBox.textContent = err.message;
    } finally {
      btn.disabled = false;
      btn.textContent = "Passwort zurücksetzen";
    }
  });
}

// Zeigt den einmaligen Wiederherstellungscode blockierend an, bevor
// die App startet — der Code ist danach nirgends mehr abrufbar.
function showRecoveryCodeOnce(code, onContinue) {
  const authScreen = document.getElementById("auth-screen");
  authScreen.innerHTML = `
    <div class="auth-card">
      <div class="auth-brand">✦ SPRACHBRETT</div>
      <div class="auth-sub">Konto erstellt! Speichere diesen Wiederherstellungscode gut — er wird nur JETZT angezeigt und ersetzt ein "Passwort vergessen" per E-Mail.</div>
      <div class="recovery-code-box">${escapeHtmlLocal(code)}</div>
      <div class="auth-sub" style="margin-top:0;">Notiere ihn z.B. in deinem Passwort-Manager. Ohne ihn ist der Zugang bei vergessenem Passwort nicht wiederherstellbar (außer über einen Admin).</div>
      <button type="button" class="btn btn-primary auth-submit" id="recovery-continue">Code gespeichert — weiter</button>
    </div>
  `;
  document.getElementById("recovery-continue").addEventListener("click", onContinue);
}

function escapeHtmlLocal(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// Minimaler Toast-Ersatz, solange wir noch auf dem Auth-Screen sind
// (das eigentliche Toast-System aus toast.js läuft erst in der App).
function showToastLike(msg) {
  const el = document.createElement("div");
  el.textContent = msg;
  el.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--bg-panel);border:1px solid var(--accent);color:var(--text);padding:10px 16px;border-radius:8px;font-size:13px;z-index:999;";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

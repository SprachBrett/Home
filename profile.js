// ============================================================
// profile.js — Profil-Ansicht, Einstellungen, Datenaktionen
// (Export / Import / Zurücksetzen — analog zu "Speichern/Öffnen"
// im Zeichenprogramm-Vorbild)
// ============================================================

import { LANGUAGES, getFlatLessons } from "./data.js?v=1786965190";
import { exportUser, importUserFromFile, resetUser, saveUser } from "./storage.js?v=1786965190";
import { levelFromXp } from "./streak.js?v=1786965190";
import { BADGES } from "./badges.js?v=1786965190";
import { showToast } from "./toast.js?v=1786965190";
import { clearSession, changeOwnPassword, deleteOwnAccount, regenerateRecoveryCode } from "./auth.js?v=1786965190";
import { wirePasswordToggles } from "./auth-ui.js?v=1786965190";

export function renderProfil(root, user, persist) {
  const { level, xpIntoLevel, xpForNextLevel } = levelFromXp(user.xp);
  const totalDone = Object.values(user.completedLessons).reduce((s, a) => s + a.length, 0);
  const totalLessons = Object.keys(LANGUAGES).reduce((s, id) => s + getFlatLessons(id).length, 0);

  root.innerHTML = `
    <div class="view-header">
      <div>
        <div class="view-title">Profil</div>
        <div class="view-subtitle">Deine Lernstatistik im Überblick</div>
      </div>
    </div>

    <div class="panel" style="margin-bottom:18px;">
      <div class="param-row" style="grid-template-columns:100px 1fr;">
        <div class="param-label">KONTO</div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
          <span style="font-weight:600;">${escapeAttr(user.name)}</span>
          <button class="btn" id="profile-logout" type="button">Abmelden</button>
        </div>
      </div>
      <div class="view-subtitle" style="margin-top:6px;">
        Dein Benutzername ist mit deinem Konto verknüpft und wird so in der Rangliste angezeigt. Er kann hier nicht geändert werden.
      </div>

      <details style="margin-top:14px;">
        <summary style="cursor:pointer;font-weight:600;color:var(--text-dim);font-size:13px;">Passwort ändern</summary>
        <form id="pw-change-form" style="display:flex;flex-direction:column;gap:10px;margin-top:12px;max-width:340px;">
          <div class="field">
            <label>Aktuelles Passwort</label>
            <input class="text-field" type="password" id="pw-old" data-toggle autocomplete="current-password" />
          </div>
          <div class="field">
            <label>Neues Passwort</label>
            <input class="text-field" type="password" id="pw-new" data-toggle autocomplete="new-password" placeholder="Mindestens 4 Zeichen" />
          </div>
          <div class="field">
            <label>Neues Passwort bestätigen</label>
            <input class="text-field" type="password" id="pw-new2" data-toggle autocomplete="new-password" />
          </div>
          <div class="auth-error" id="pw-change-error"></div>
          <button type="submit" class="btn" id="pw-change-submit" style="align-self:flex-start;">Passwort speichern</button>
        </form>
      </details>

      <details style="margin-top:14px;">
        <summary style="cursor:pointer;font-weight:600;color:var(--text-dim);font-size:13px;">Wiederherstellungscode neu erzeugen</summary>
        <div style="margin-top:12px;max-width:340px;">
          <div class="view-subtitle" style="margin-bottom:10px;">
            Erzeugt einen neuen "Passwort vergessen"-Code und macht den alten ungültig — nützlich, falls du den ursprünglichen Code verloren hast oder er schon benutzt wurde.
          </div>
          <div class="field" style="margin-bottom:10px;">
            <label>Aktuelles Passwort zur Bestätigung</label>
            <input class="text-field" type="password" id="recovery-regen-password" data-toggle autocomplete="current-password" />
          </div>
          <div class="auth-error" id="recovery-regen-error"></div>
          <div id="recovery-regen-result"></div>
          <button class="btn" id="recovery-regen-btn">Neuen Code erzeugen</button>
        </div>
      </details>

      <details style="margin-top:14px;">
        <summary style="cursor:pointer;font-weight:600;color:var(--danger);font-size:13px;">Konto löschen</summary>
        <div style="margin-top:12px;max-width:340px;">
          <div class="view-subtitle" style="margin-bottom:10px;">
            Löscht dein Konto unwiderruflich. Dein lokaler Lernfortschritt auf diesem Gerät bleibt erhalten, aber dein Rangliste-Login geht verloren.
          </div>
          <div class="field" style="margin-bottom:10px;">
            <label>Passwort zur Bestätigung</label>
            <input class="text-field" type="password" id="delete-account-password" data-toggle autocomplete="current-password" />
          </div>
          <div class="auth-error" id="delete-account-error"></div>
          <button class="btn" id="delete-account-btn" style="border-color:var(--danger);color:#fca5a5;">🗑️ Konto endgültig löschen</button>
        </div>
      </details>
    </div>

    <div class="stat-row">
      <div class="stat-card"><div class="stat-icon">🏅</div><div class="stat-value">${level}</div><div class="stat-label">STUFE</div></div>
      <div class="stat-card"><div class="stat-icon">⭐</div><div class="stat-value">${user.xp}</div><div class="stat-label">GESAMT-XP</div></div>
      <div class="stat-card"><div class="stat-icon">🔥</div><div class="stat-value">${user.streak}</div><div class="stat-label">STREAK</div></div>
      <div class="stat-card"><div class="stat-icon">📚</div><div class="stat-value">${totalDone}/${totalLessons}</div><div class="stat-label">LEKTIONEN GESAMT</div></div>
    </div>

    <div class="view-title" style="font-size:16px;margin-bottom:10px;">Fortschritt je Sprache</div>
    <div class="grid" style="margin-bottom:22px;">
      ${Object.values(LANGUAGES).map((l) => {
        const d = (user.completedLessons[l.id] || []).length;
        const total = getFlatLessons(l.id).length;
        const pct = total ? Math.round((d / total) * 100) : 0;
        return `
          <div class="panel">
            <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
              <span>${l.flag} ${l.name}</span><span class="param-value">${d}/${total}</span>
            </div>
            <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
          </div>`;
      }).join("")}
    </div>

    <div class="view-title" style="font-size:16px;margin-bottom:10px;">Neueste Abzeichen</div>
    <div class="badge-grid">
      ${(user.badges.length ? user.badges.slice(-4) : []).map((id) => {
        const b = BADGES.find((x) => x.id === id);
        if (!b) return "";
        return `<div class="badge-card"><div class="b-icon">${b.icon}</div><div class="b-title">${b.title}</div></div>`;
      }).join("") || `<div class="view-subtitle">Noch keine Abzeichen — schließe eine Lektion ab!</div>`}
    </div>
  `;

  document.getElementById("profile-logout").addEventListener("click", () => {
    if (!confirm("Wirklich abmelden? Dein Fortschritt bleibt auf diesem Konto gespeichert.")) return;
    clearSession();
    window.location.reload();
  });

  wirePasswordToggles(root);

  document.getElementById("pw-change-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const oldPw = document.getElementById("pw-old").value;
    const newPw = document.getElementById("pw-new").value;
    const newPw2 = document.getElementById("pw-new2").value;
    const errorBox = document.getElementById("pw-change-error");
    const btn = document.getElementById("pw-change-submit");
    errorBox.textContent = "";
    if (newPw !== newPw2) { errorBox.textContent = "Die neuen Passwörter stimmen nicht überein."; return; }
    btn.disabled = true;
    btn.textContent = "Speichere…";
    try {
      await changeOwnPassword(user.name, oldPw, newPw);
      showToast("Passwort wurde geändert");
      e.target.reset();
    } catch (err) {
      errorBox.textContent = err.message;
    } finally {
      btn.disabled = false;
      btn.textContent = "Passwort speichern";
    }
  });

  document.getElementById("recovery-regen-btn").addEventListener("click", async () => {
    const password = document.getElementById("recovery-regen-password").value;
    const errorBox = document.getElementById("recovery-regen-error");
    const resultBox = document.getElementById("recovery-regen-result");
    errorBox.textContent = "";
    resultBox.innerHTML = "";
    if (!password) { errorBox.textContent = "Bitte Passwort eingeben."; return; }
    try {
      const code = await regenerateRecoveryCode(user.name, password);
      resultBox.innerHTML = `<div class="recovery-code-box">${escapeAttr(code)}</div><div class="view-subtitle">Jetzt sicher speichern — wird nicht nochmal angezeigt.</div>`;
    } catch (err) {
      errorBox.textContent = err.message;
    }
  });

  document.getElementById("delete-account-btn").addEventListener("click", async () => {
    const password = document.getElementById("delete-account-password").value;
    const errorBox = document.getElementById("delete-account-error");
    errorBox.textContent = "";
    if (!password) { errorBox.textContent = "Bitte Passwort eingeben."; return; }
    if (!confirm(`Konto „${user.name}" wirklich unwiderruflich löschen?`)) return;
    try {
      await deleteOwnAccount(user.name, password);
      clearSession();
      showToast("Konto wurde gelöscht");
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      errorBox.textContent = err.message;
    }
  });
}

export function renderEinstellungen(root, user, persist) {
  root.innerHTML = `
    <div class="view-header">
      <div>
        <div class="view-title">Einstellungen</div>
        <div class="view-subtitle">Parameter für dein Lernerlebnis</div>
      </div>
    </div>

    <div class="panel" style="max-width:480px;margin-bottom:18px;">
      <div class="param-row">
        <div class="param-label">TAGESZIEL</div>
        <input type="range" min="10" max="150" step="5" id="set-goal" value="${user.settings.dailyGoal}" />
        <div class="param-value" id="set-goal-val">${user.settings.dailyGoal}</div>
      </div>
      <div class="param-row">
        <div class="param-label">LAUTSTÄRKE</div>
        <input type="range" min="0" max="100" step="5" id="set-volume" value="${user.settings.volume}" />
        <div class="param-value" id="set-volume-val">${user.settings.volume}</div>
      </div>
      <div class="toggle-row">
        <span class="param-label">TON-EFFEKTE</span>
        <div class="switch ${user.settings.sound ? "on" : ""}" id="set-sound"></div>
      </div>
    </div>

    <div class="panel" style="max-width:480px;">
      <div class="param-label" style="margin-bottom:10px;">DATEN</div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        <button class="btn" id="set-export">📦 Fortschritt exportieren</button>
        <button class="btn" id="set-import">📂 Fortschritt importieren</button>
        <button class="btn" style="border-color:var(--danger);color:#fca5a5;" id="set-reset">🗑️ Fortschritt zurücksetzen</button>
      </div>
    </div>
  `;

  const goalSlider = document.getElementById("set-goal");
  const goalVal = document.getElementById("set-goal-val");
  goalSlider.addEventListener("input", () => { goalVal.textContent = goalSlider.value; });
  goalSlider.addEventListener("change", () => {
    user.settings.dailyGoal = Number(goalSlider.value);
    persist();
  });

  const volSlider = document.getElementById("set-volume");
  const volVal = document.getElementById("set-volume-val");
  volSlider.addEventListener("input", () => { volVal.textContent = volSlider.value; });
  volSlider.addEventListener("change", () => {
    user.settings.volume = Number(volSlider.value);
    persist();
  });

  const soundSwitch = document.getElementById("set-sound");
  soundSwitch.addEventListener("click", () => {
    user.settings.sound = !user.settings.sound;
    soundSwitch.classList.toggle("on", user.settings.sound);
    persist();
  });

  document.getElementById("set-export").addEventListener("click", () => exportUser());
  document.getElementById("set-import").addEventListener("click", () => document.getElementById("file-import").click());
  document.getElementById("set-reset").addEventListener("click", () => {
    if (confirm("Wirklich deinen gesamten Lernfortschritt löschen? Das kann nicht rückgängig gemacht werden.")) {
      const fresh = resetUser();
      Object.assign(user, fresh);
      persist();
      showToast("Fortschritt wurde zurückgesetzt");
      renderEinstellungen(root, user, persist);
    }
  });
}

// Verdrahtet die immer sichtbaren Sidebar-Aktionen (unabhängig von der aktuellen Ansicht)
export function initSidebarActions(user, onChange) {
  document.getElementById("btn-export").addEventListener("click", () => exportUser());

  document.getElementById("btn-import").addEventListener("click", () => {
    document.getElementById("file-import").click();
  });

  document.getElementById("file-import").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    importUserFromFile(file, (data, error) => {
      if (error) { showToast("⚠️ " + error); return; }
      showToast("✅ Fortschritt importiert");
      setTimeout(onChange, 500);
    });
    e.target.value = "";
  });

  document.getElementById("btn-reset").addEventListener("click", () => {
    if (confirm("Wirklich deinen gesamten Lernfortschritt löschen? Das kann nicht rückgängig gemacht werden.")) {
      resetUser();
      showToast("Fortschritt wurde zurückgesetzt");
      setTimeout(onChange, 500);
    }
  });
}

function escapeAttr(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

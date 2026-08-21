// ============================================================
// app.js — Einstiegspunkt
// Lädt den Nutzerstand, prüft den Streak, initialisiert die
// Werkzeugleiste/Navigation und verdrahtet globale Aktionen.
// ============================================================

import { loadUser, saveUser, setActiveUser, hasLocalProgress, loadLegacyGlobalUser, clearLegacyGlobalUser, hydrateFromRemote } from "./storage.js?v=1787296657";
import { checkStreakOnLoad, regenerateHearts } from "./streak.js?v=1787296657";
import { initWorkspace } from "./workspace.js?v=1787296657";
import { initSidebarActions } from "./profile.js?v=1787296657";
import { initAuthScreen } from "./auth-ui.js?v=1787296657";

document.addEventListener("DOMContentLoaded", () => {
  initAuthScreen((player) => {
    // Login/Registrierung erfolgreich -> ab jetzt läuft aller
    // Fortschritt unter einem account-eigenen localStorage-Schlüssel,
    // nicht mehr unter einem einzigen, kontounabhängigen Schlüssel
    // (das war der Grund für "fremder Fortschritt beim Kontowechsel").
    setActiveUser(player.username.trim().toLowerCase());

    let user;
    if (player.progress) {
      // Am Account gespeicherter Fortschritt vorhanden (z.B. von einem
      // anderen Gerät) -> das ist die verbindliche Quelle.
      user = hydrateFromRemote(player.progress);
    } else if (!hasLocalProgress()) {
      // Kein Account-Fortschritt UND lokal unter dem neuen,
      // kontogebundenen Schlüssel noch nichts vorhanden -> einmalig
      // den alten, account-unabhängigen Stand übernehmen (Migration
      // für Konten von vor dieser Änderung), sonst ganz frisch starten.
      // ← FIX: Der alte Speicher wird danach GELÖSCHT, sonst würde
      // sich derselbe Alt-Stand auf jedes weitere, neu registrierte
      // Konto im selben Browser "vererben".
      const legacy = loadLegacyGlobalUser();
      if (legacy) {
        user = hydrateFromRemote(legacy);
        clearLegacyGlobalUser();
      } else {
        user = loadUser();
      }
    } else {
      user = loadUser();
    }

    user.name = player.username;
    user.isAdmin = player.is_admin === true || player.is_admin === "true";
    user = checkStreakOnLoad(user);
    user = regenerateHearts(user);
    saveUser(user);

    document.getElementById("auth-screen").style.display = "none";
    const shell = document.getElementById("app-shell");
    shell.hidden = false;
    shell.style.display = "";

    initWorkspace(user);
    initSidebarActions(user, () => window.location.reload());
  });
});

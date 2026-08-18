// ============================================================
// app.js — Einstiegspunkt
// Lädt den Nutzerstand, prüft den Streak, initialisiert die
// Werkzeugleiste/Navigation und verdrahtet globale Aktionen.
// ============================================================

import { loadUser, saveUser } from "./storage.js?v=1787038118";
import { checkStreakOnLoad, regenerateHearts } from "./streak.js?v=1787038118";
import { initWorkspace } from "./workspace.js?v=1787038118";
import { initSidebarActions } from "./profile.js?v=1787038118";
import { initAuthScreen } from "./auth-ui.js?v=1787038118";

document.addEventListener("DOMContentLoaded", () => {
  initAuthScreen((player) => {
    // Login/Registrierung erfolgreich -> App starten und den
    // verifizierten, eindeutigen Kontonamen als Rangliste-Namen setzen.
    let user = loadUser();
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

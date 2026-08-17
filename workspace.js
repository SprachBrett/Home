// ============================================================
// workspace.js — Navigation & Haupt-Ansichten
// Steuert Sidebar-Werkzeugauswahl, View-Wechsel und rendert
// Übersicht, Lektionskarte, Übungssitzung, Rangliste, Abzeichen.
// (Profil & Einstellungen leben in profile.js)
// ============================================================

import { LANGUAGES, getFlatLessons, findLesson } from "./data.js?v=1786965190";
import { saveUser, loadUser } from "./storage.js?v=1786965190";
import { registerActivity, dailyGoalProgress, levelFromXp } from "./streak.js?v=1786965190";
import { evaluateBadges, BADGES } from "./badges.js?v=1786965190";
import { buildExercises, speak, checkAnswer, computeLessonReward } from "./lessons.js?v=1786965190";
import { getRangliste, getLeague } from "./rangliste.js?v=1786965190";
import { isOnlineAvailable, syncScoreOnline, subscribeLeaderboardOnline, FIREBASE_ENABLED } from "./online-rangliste.js?v=1786965190";
import { showToast } from "./toast.js?v=1786965190";
import { renderProfil, renderEinstellungen } from "./profile.js?v=1786965190";
import { listPlayers, setBanned, adminResetPassword, adminDeleteAccount } from "./auth.js?v=1786965190";

let user = null;
let currentView = "dashboard";
let session = null; // aktive Übungssitzung
let unsubLeaderboard = null; // aktives Firebase-Live-Abonnement, falls vorhanden
const root = () => document.getElementById("view-root");

export function initWorkspace(loadedUser) {
  user = loadedUser;
  wireSidebarNav();
  renderLangPalette();
  refreshChrome();
  const adminBtn = document.getElementById("nav-admin");
  adminBtn.hidden = !user.isAdmin;
  setView("dashboard");
}

export function getUser() { return user; }
export function persist() { saveUser(user); refreshChrome(); }

// ---------------------------------------------------------------
// Sidebar-Navigation (Werkzeug-Grid-Verhalten wie im Zeichenprogramm)
// ---------------------------------------------------------------

function wireSidebarNav() {
  document.querySelectorAll(".tool-btn").forEach((btn) => {
    btn.addEventListener("click", () => setView(btn.dataset.view));
  });
}

export function setView(view) {
  currentView = view;
  session = null;
  if (unsubLeaderboard) { unsubLeaderboard(); unsubLeaderboard = null; }
  document.querySelectorAll(".tool-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });
  document.getElementById("topbar-view").textContent = viewLabel(view);

  switch (view) {
    case "dashboard": renderDashboard(); break;
    case "lektionen": renderLektionen(); break;
    case "wiederholen": renderWiederholen(); break;
    case "rangliste": renderRangliste(); break;
    case "abzeichen": renderAbzeichen(); break;
    case "profil": renderProfil(root(), user, persist); break;
    case "einstellungen": renderEinstellungen(root(), user, persist); break;
    case "admin":
      if (!user.isAdmin) { setView("dashboard"); return; }
      renderAdmin();
      break;
    default: renderDashboard();
  }
}

function viewLabel(view) {
  return {
    dashboard: "Übersicht", lektionen: "Lektionen", wiederholen: "Wiederholen",
    rangliste: "Rangliste", abzeichen: "Abzeichen", profil: "Profil", einstellungen: "Einstellungen",
    admin: "Admin", practice: "Übung"
  }[view] || view;
}

function renderLangPalette() {
  const wrap = document.getElementById("lang-palette");
  wrap.innerHTML = "";
  Object.values(LANGUAGES).forEach((lang) => {
    const el = document.createElement("div");
    el.className = "lang-swatch" + (lang.id === user.currentLanguage ? " active" : "");
    el.title = lang.name;
    el.textContent = lang.flag;
    el.addEventListener("click", () => {
      user.currentLanguage = lang.id;
      persist();
      renderLangPalette();
      if (currentView === "dashboard") renderDashboard();
      if (currentView === "lektionen") renderLektionen();
    });
    wrap.appendChild(el);
  });
}

// ---------------------------------------------------------------
// Topbar & Statusbar (immer sichtbar)
// ---------------------------------------------------------------

export function refreshChrome() {
  const lang = LANGUAGES[user.currentLanguage];
  const { level } = levelFromXp(user.xp);

  document.getElementById("topbar-lang").textContent = `${lang.name} ${lang.flag}`;
  document.getElementById("topbar-streak").textContent = user.streak;
  document.getElementById("topbar-hearts").textContent = user.hearts;
  document.getElementById("topbar-xp").textContent = user.xp;

  document.getElementById("status-lang").textContent = lang.name;
  document.getElementById("status-level").textContent = level;
  document.getElementById("status-xp").textContent = user.xp;
  document.getElementById("status-streak").textContent = user.streak;
  document.getElementById("status-hearts").textContent = `${user.hearts}/${user.maxHearts}`;
}

// ---------------------------------------------------------------
// Übersicht (Dashboard)
// ---------------------------------------------------------------

function renderDashboard() {
  const lang = LANGUAGES[user.currentLanguage];
  const flat = getFlatLessons(user.currentLanguage);
  const done = user.completedLessons[user.currentLanguage] || [];
  const nextLesson = flat.find((l) => !done.includes(l.id)) || flat[flat.length - 1];
  const goal = dailyGoalProgress(user);
  const { level, xpIntoLevel, xpForNextLevel } = levelFromXp(user.xp);

  root().innerHTML = `
    <div class="view-header">
      <div>
        <div class="view-title">Willkommen zurück</div>
        <div class="view-subtitle">Du lernst gerade ${lang.name} ${lang.flag} — mach weiter so.</div>
      </div>
    </div>

    ${user.everTampered ? `
      <div class="panel" style="border-color:var(--danger);background:var(--danger-soft);margin-bottom:18px;">
        ⚠️ <strong>Lokale Daten wurden verändert erkannt.</strong> Dein Fortschritt bleibt spielbar, wird aber nicht mehr mit der Online-Rangliste synchronisiert.
      </div>
    ` : ""}

    <div class="dashboard-hero">
      <div class="mascot">🐶</div>
      <div class="hero-text">
        <div class="hero-title">Bretti sagt: ${heroMessage(user)}</div>
        <div class="hero-sub">Stufe ${level} · ${xpIntoLevel}/${xpForNextLevel} XP bis zur nächsten Stufe</div>
        <div class="progress-track" style="width:260px"><div class="progress-fill" style="width:${Math.round((xpIntoLevel/xpForNextLevel)*100)}%"></div></div>
      </div>
    </div>

    <div class="stat-row">
      <div class="stat-card"><div class="stat-icon">🔥</div><div class="stat-value">${user.streak}</div><div class="stat-label">TAGE STREAK</div></div>
      <div class="stat-card"><div class="stat-icon">⭐</div><div class="stat-value">${user.xp}</div><div class="stat-label">GESAMT-XP</div></div>
      <div class="stat-card"><div class="stat-icon">🎖️</div><div class="stat-value">${user.badges.length}</div><div class="stat-label">ABZEICHEN</div></div>
      <div class="stat-card">
        <div class="stat-icon">🎯</div><div class="stat-value">${goal.current}/${goal.goal}</div><div class="stat-label">TAGESZIEL XP</div>
        <div class="progress-track"><div class="progress-fill ${goal.reached ? 'success' : ''}" style="width:${goal.percent}%"></div></div>
      </div>
    </div>

    <div class="continue-card">
      <div class="cc-left">
        <div class="cc-icon">${nextLesson ? nextLesson.unitIcon : "📚"}</div>
        <div>
          <div class="cc-title">${nextLesson ? nextLesson.title : "Alles abgeschlossen!"}</div>
          <div class="cc-sub">${nextLesson ? nextLesson.unitTitle : "Schau in „Wiederholen“ vorbei, um dein Wissen zu festigen."}</div>
        </div>
      </div>
      ${nextLesson ? `<button class="btn btn-primary" id="btn-continue">Weiterlernen →</button>` : ""}
    </div>

    <div class="view-title" style="font-size:17px;margin-bottom:12px;">Deine Sprachen</div>
    <div class="stat-row">
      ${Object.values(LANGUAGES).map((l) => {
        const d = (user.completedLessons[l.id] || []).length;
        const total = getFlatLessons(l.id).length;
        const pct = total ? Math.round((d / total) * 100) : 0;
        return `
          <div class="stat-card" style="cursor:pointer" data-lang="${l.id}">
            <div class="stat-icon">${l.flag}</div>
            <div class="stat-value" style="font-size:15px;">${l.name}</div>
            <div class="stat-label">${d}/${total} LEKTIONEN</div>
            <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
          </div>`;
      }).join("")}
    </div>
  `;

  const cont = document.getElementById("btn-continue");
  if (cont) cont.addEventListener("click", () => startLessonSession(nextLesson.id));

  root().querySelectorAll("[data-lang]").forEach((el) => {
    el.addEventListener("click", () => {
      user.currentLanguage = el.dataset.lang;
      persist(); renderLangPalette(); setView("lektionen");
    });
  });
}

function heroMessage(u) {
  if (u.streak >= 7) return "Starker Streak! Weiter so! 🔥";
  if (u.xpToday === 0) return "Bereit für eine Lektion?";
  if (dailyGoalProgress(u).reached) return "Tagesziel erreicht — großartig!";
  return "Noch ein bisschen üben heute?";
}

// ---------------------------------------------------------------
// Lektionen (Kurskarte je Sprache, in Units gruppiert)
// ---------------------------------------------------------------

function renderLektionen() {
  const lang = LANGUAGES[user.currentLanguage];
  const done = user.completedLessons[user.currentLanguage] || [];
  const flat = getFlatLessons(user.currentLanguage);
  const firstUnfinishedIdx = flat.findIndex((l) => !done.includes(l.id));

  root().innerHTML = `
    <div class="view-header">
      <div>
        <div class="view-title">Lektionen — ${lang.name} ${lang.flag}</div>
        <div class="view-subtitle">${done.length}/${flat.length} Lektionen abgeschlossen</div>
      </div>
    </div>
    ${lang.units.map((unit) => `
      <div class="unit-block">
        <div class="unit-heading"><span class="unit-icon">${unit.icon}</span> ${unit.title}</div>
        <div class="lesson-row">
          ${unit.lessons.map((lesson) => {
            const idx = flat.findIndex((l) => l.id === lesson.id);
            const isDone = done.includes(lesson.id);
            const isLocked = !isDone && idx > firstUnfinishedIdx && firstUnfinishedIdx !== -1;
            const stars = user.lessonStars[lesson.id] || 0;
            return `
              <div class="lesson-node ${isDone ? "done" : ""} ${isLocked ? "locked" : ""}" data-lesson="${lesson.id}">
                <div class="ln-title">${lesson.title}</div>
                <div class="ln-meta">${lesson.vocab.length} Vokabeln</div>
                <div class="ln-stars">${isDone ? "⭐".repeat(stars) + "☆".repeat(3 - stars) : (isLocked ? "🔒" : "▶ Start")}</div>
              </div>`;
          }).join("")}
        </div>
      </div>
    `).join("")}
  `;

  root().querySelectorAll(".lesson-node:not(.locked)").forEach((el) => {
    el.addEventListener("click", () => startLessonSession(el.dataset.lesson));
  });
}

// ---------------------------------------------------------------
// Wiederholen: gemischte Übung aus bereits gelernten Lektionen
// ---------------------------------------------------------------

function renderWiederholen() {
  const lang = LANGUAGES[user.currentLanguage];
  const done = user.completedLessons[user.currentLanguage] || [];
  const flat = getFlatLessons(user.currentLanguage);
  const doneLessons = flat.filter((l) => done.includes(l.id));

  root().innerHTML = `
    <div class="view-header">
      <div>
        <div class="view-title">Wiederholen</div>
        <div class="view-subtitle">Gemischte Übungen aus bereits gelernten Vokabeln — ${lang.name} ${lang.flag}</div>
      </div>
    </div>
    ${doneLessons.length === 0 ? `
      <div class="panel">Du hast noch keine Lektion in ${lang.name} abgeschlossen. Schließe zuerst eine Lektion ab, um sie hier wiederholen zu können.</div>
    ` : `
      <div class="panel" style="margin-bottom:18px;">
        <div style="margin-bottom:12px;">Wähle aus, wie viele abgeschlossene Lektionen gemischt werden sollen:</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="btn btn-primary" id="btn-review-all">Alle mischen (${doneLessons.length} Lektionen)</button>
        </div>
      </div>
      <div class="lesson-row">
        ${doneLessons.map((l) => `<div class="lesson-node done" data-review="${l.id}"><div class="ln-title">${l.title}</div><div class="ln-meta">${l.unitTitle}</div></div>`).join("")}
      </div>
    `}
  `;

  const btnAll = document.getElementById("btn-review-all");
  if (btnAll) btnAll.addEventListener("click", () => startReviewSession(doneLessons));

  root().querySelectorAll("[data-review]").forEach((el) => {
    el.addEventListener("click", () => {
      const lesson = findLesson(user.currentLanguage, el.dataset.review);
      startReviewSession([lesson]);
    });
  });
}

function startReviewSession(lessons) {
  const exercises = lessons.flatMap((l) => buildExercises(l, user.currentLanguage));
  beginSession({ id: "review", title: "Wiederholung" }, exercises, true);
}

// ---------------------------------------------------------------
// Übungssitzung (Practice)
// ---------------------------------------------------------------

function startLessonSession(lessonId) {
  const lesson = findLesson(user.currentLanguage, lessonId);
  if (!lesson) return;
  const exercises = buildExercises(lesson, user.currentLanguage);
  beginSession(lesson, exercises, false);
}

function beginSession(lesson, exercises, isReview) {
  session = {
    lesson, exercises, isReview,
    index: 0, correct: 0, wrong: 0,
    livesAtStart: user.hearts,
    finished: false
  };
  currentView = "practice";
  document.getElementById("topbar-view").textContent = "Übung";
  document.querySelectorAll(".tool-btn").forEach((b) => b.classList.remove("active"));
  renderExercise();
}

function renderExercise() {
  if (user.hearts <= 0 && !session.isReview) { renderOutOfHearts(); return; }

  const ex = session.exercises[session.index];
  if (!ex) { finishSession(); return; }

  const percent = Math.round((session.index / session.exercises.length) * 100);

  root().innerHTML = `
    <div class="session-wrap">
      <div class="session-progress">
        <button class="btn btn-ghost" id="btn-quit" title="Sitzung verlassen">✕</button>
        <div class="progress-track"><div class="progress-fill" style="width:${percent}%"></div></div>
        <div class="session-hearts">${"❤️".repeat(user.hearts)}${"🖤".repeat(user.maxHearts - user.hearts)}</div>
      </div>
      <div class="exercise-card">
        <div class="exercise-kicker">${session.lesson.title.toUpperCase()} · AUFGABE ${session.index + 1}/${session.exercises.length}</div>
        <div class="exercise-prompt">${ex.prompt}</div>
        ${renderExerciseBody(ex)}
        <div class="feedback-banner" id="feedback"></div>
        <div class="exercise-footer">
          <div></div>
          <button class="btn btn-primary" id="btn-check" disabled>Prüfen</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById("btn-quit").addEventListener("click", () => setView("lektionen"));
  wireExerciseInputs(ex);
}

function renderExerciseBody(ex) {
  if (ex.type === "listen") {
    return `
      <button class="listen-btn" id="btn-speak">🔊 Anhören</button>
      <div class="option-grid" id="options">
        ${ex.options.map((opt) => `<button class="option-btn" data-val="${escapeHtml(opt)}">${escapeHtml(opt)}</button>`).join("")}
      </div>
    `;
  }
  if (ex.type === "choice") {
    return `
      <div class="option-grid" id="options">
        ${ex.options.map((opt) => `<button class="option-btn" data-val="${escapeHtml(opt)}">${escapeHtml(opt)}</button>`).join("")}
      </div>
    `;
  }
  // translate
  return `<input class="translate-input" id="answer-input" type="text" placeholder="Antwort eingeben…" autocomplete="off" autocapitalize="off" spellcheck="false" />`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function wireExerciseInputs(ex) {
  const checkBtn = document.getElementById("btn-check");
  let selected = null;

  if (ex.type === "listen") {
    const speakBtn = document.getElementById("btn-speak");
    const doSpeak = () => speak(ex.audioText, user.currentLanguage, user.settings.volume);
    speakBtn.addEventListener("click", doSpeak);
    setTimeout(doSpeak, 250);
  }

  if (ex.type === "translate") {
    const input = document.getElementById("answer-input");
    input.focus();
    input.addEventListener("input", () => { checkBtn.disabled = input.value.trim().length === 0; });
    input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !checkBtn.disabled) submit(); });
  } else {
    document.querySelectorAll(".option-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".option-btn").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        selected = btn.dataset.val;
        checkBtn.disabled = false;
      });
    });
  }

  checkBtn.addEventListener("click", submit);

  function submit() {
    const userInput = ex.type === "translate" ? document.getElementById("answer-input").value : selected;
    const isCorrect = checkAnswer(ex, userInput);
    showFeedback(ex, isCorrect, userInput);
  }
}

function showFeedback(ex, isCorrect, userInput) {
  const feedback = document.getElementById("feedback");
  const checkBtn = document.getElementById("btn-check");

  if (isCorrect) {
    session.correct += 1;
    feedback.textContent = "✔ Richtig!";
    feedback.className = "feedback-banner show correct";
  } else {
    session.wrong += 1;
    if (!session.isReview) {
      user.hearts = Math.max(0, user.hearts - 1);
      saveUser(user);
      refreshChrome();
    }
    feedback.textContent = `✘ Nicht ganz. Richtige Antwort: „${ex.correct}“`;
    feedback.className = "feedback-banner show wrong";
  }

  // Visuelles Feedback auf Eingabeelementen
  if (ex.type === "translate") {
    document.getElementById("answer-input").classList.add(isCorrect ? "correct" : "wrong");
    document.getElementById("answer-input").disabled = true;
  } else {
    document.querySelectorAll(".option-btn").forEach((btn) => {
      btn.disabled = true;
      if (btn.dataset.val === ex.correct) btn.classList.add("correct");
      else if (btn.classList.contains("selected") && !isCorrect) btn.classList.add("wrong");
    });
  }

  checkBtn.textContent = "Weiter →";
  checkBtn.disabled = false;
  checkBtn.onclick = () => {
    session.index += 1;
    renderExercise();
  };
  // Enter-Taste auch nach Feedback weiterschalten
  document.addEventListener("keydown", enterAdvance);
  function enterAdvance(e) {
    if (e.key === "Enter") { document.removeEventListener("keydown", enterAdvance); checkBtn.onclick(); }
  }
}

function renderOutOfHearts() {
  root().innerHTML = `
    <div class="result-wrap">
      <div class="result-icon">💔</div>
      <div class="result-title">Keine Herzen mehr</div>
      <div class="view-subtitle">Alle ${user.maxHearts} Herzen sind aufgebraucht. Ein neues Herz wächst automatisch alle ${4} Stunden nach — schau also bald wieder vorbei, oder wiederhole in der Zwischenzeit bereits gelernte Vokabeln (kostet keine Herzen).</div>
      <div style="margin-top:22px;display:flex;gap:10px;justify-content:center;">
        <button class="btn" id="btn-review">🔁 Zum Wiederholen</button>
        <button class="btn btn-primary" id="btn-back">Zur Übersicht</button>
      </div>
    </div>
  `;
  document.getElementById("btn-back").addEventListener("click", () => setView("dashboard"));
  document.getElementById("btn-review").addEventListener("click", () => setView("wiederholen"));
}

function finishSession() {
  const total = session.correct + session.wrong;
  const { xp, stars, accuracy } = computeLessonReward(session.correct, total);

  user = registerActivity(user, xp);  // ← KRITISCH: Return-Wert zuweisen!

  if (!session.isReview) {
    const done = user.completedLessons[user.currentLanguage] || [];
    if (!done.includes(session.lesson.id)) done.push(session.lesson.id);
    user.completedLessons[user.currentLanguage] = done;
    const prevStars = user.lessonStars[session.lesson.id] || 0;
    user.lessonStars[session.lesson.id] = Math.max(prevStars, stars);
  }

  const newBadges = evaluateBadges(user);
  saveUser(user);
  refreshChrome();
  syncScoreOnline(user); // im Hintergrund, blockiert die UI nicht

  root().innerHTML = `
    <div class="result-wrap">
      <div class="result-icon">${accuracy >= 0.95 ? "🏆" : accuracy >= 0.75 ? "🎉" : "✅"}</div>
      <div class="result-title">${session.isReview ? "Wiederholung abgeschlossen" : "Lektion abgeschlossen"}</div>
      <div class="result-stats">
        <div class="result-stat"><div class="r-val">+${xp}</div><div class="r-label">XP</div></div>
        <div class="result-stat"><div class="r-val">${session.correct}/${total}</div><div class="r-label">RICHTIG</div></div>
        <div class="result-stat"><div class="r-val">${"⭐".repeat(stars)}</div><div class="r-label">STERNE</div></div>
      </div>
      <div style="display:flex;gap:10px;justify-content:center;">
        <button class="btn" id="btn-to-lektionen">Zu den Lektionen</button>
        <button class="btn btn-primary" id="btn-to-dashboard">Zur Übersicht</button>
      </div>
    </div>
  `;
  document.getElementById("btn-to-lektionen").addEventListener("click", () => setView("lektionen"));
  document.getElementById("btn-to-dashboard").addEventListener("click", () => setView("dashboard"));

  newBadges.forEach((id) => {
    const badge = BADGES.find((b) => b.id === id);
    if (badge) showToast(`${badge.icon} Neues Abzeichen: ${badge.title}`);
  });
}

// ---------------------------------------------------------------
// Rangliste
// ---------------------------------------------------------------

async function renderRangliste() {
  // ← KRITISCH: Lade den aktuellen User mit seinen ECHTEN XP aus localStorage
  const currentUser = loadUser();

  root().innerHTML = `
    <div class="view-header">
      <div>
        <div class="view-title">Rangliste</div>
        <div class="view-subtitle">Lade Rangliste …</div>
      </div>
    </div>
  `;

  const online = await isOnlineAvailable();

  if (!online) {
    paintRangliste(getRangliste(currentUser), false);
    return;
  }

  syncScoreOnline(currentUser);
  unsubLeaderboard = await subscribeLeaderboardOnline((entries) => {
    if (currentView !== "rangliste") return; // Ansicht inzwischen gewechselt
    if (entries === null) { paintRangliste(getRangliste(currentUser), false); return; }
    paintRangliste(reconcileOwnEntry(entries, currentUser), true);
  });
}

// ← FIX: Der eigene Eintrag in der Online-Rangliste zeigt sonst 0 XP (oder
// fehlt ganz), solange der letzte Sync noch nicht durchgelaufen oder
// blockiert ist (z.B. wegen everTampered, fehlgeschlagener Regel-Prüfung
// oder Netzwerk-Timing). Der lokale XP-Stand ist immer die Wahrheit für
// die eigene Zeile — die Werte anderer Nutzer bleiben unangetastet.
function reconcileOwnEntry(entries, currentUser) {
  const fixed = entries.map((e) =>
    e.isUser ? { ...e, name: currentUser.name || "Du", xp: currentUser.xp } : e
  );
  if (!fixed.some((e) => e.isUser)) {
    fixed.push({ name: currentUser.name || "Du", xp: currentUser.xp, isUser: true });
  }
  fixed.sort((a, b) => b.xp - a.xp);
  fixed.forEach((e, i) => (e.rank = i + 1));
  return fixed;
}

function paintRangliste(entries, isOnline) {
  const league = getLeague((entries.find((e) => e.isUser) || user).xp);

  root().innerHTML = `
    <div class="view-header">
      <div>
        <div class="view-title">Rangliste</div>
        <div class="view-subtitle">
          ${isOnline
            ? "🟢 Online — echte, live aktualisierte Rangliste aller SprachBrett-Nutzer."
            : "🟡 Lokal — simulierte Liga auf diesem Gerät."}
        </div>
      </div>
    </div>
    ${!isOnline && !FIREBASE_ENABLED ? `
      <div class="panel" style="margin-bottom:18px;">
        Die echte Online-Rangliste ist noch nicht eingerichtet. Trag deine Firebase-Zugangsdaten in
        <code>js/firebase-config.js</code> ein und setze <code>FIREBASE_ENABLED</code> auf <code>true</code>,
        um dich mit anderen Nutzern zu messen. Bis dahin siehst du hier eine lokale Simulation.
      </div>
    ` : ""}
    ${user.everTampered ? `
      <div class="panel" style="border-color:var(--danger);background:var(--danger-soft);margin-bottom:18px;">
        ⚠️ Deine lokalen Daten wurden als verändert erkannt — dein Stand wird nicht an die Online-Rangliste übertragen.
      </div>
    ` : ""}
    <div class="league-badge">🏆 ${league}-Liga</div>
    <div class="rang-list">
      ${entries.map((e) => `
        <div class="rang-row ${e.isUser ? "me" : ""}">
          <div class="rang-rank">${e.rank}</div>
          <div class="rang-name">${e.isUser ? "👉 " : ""}${e.name}</div>
          <div class="rang-xp">${e.xp} XP</div>
        </div>
      `).join("")}
    </div>
  `;
}

// ---------------------------------------------------------------
// Admin (nur sichtbar/erreichbar für Konten mit is_admin = true)
// ---------------------------------------------------------------

let adminAllPlayers = [];
// Im Speicher gecachtes Admin-Passwort für diese Browser-Session, damit
// nicht bei jedem einzelnen Reset/Löschen erneut danach gefragt wird.
// Geht beim Neuladen der Seite verloren.
let adminPasswordCache = null;

async function askAdminPassword() {
  if (adminPasswordCache) return adminPasswordCache;
  const pw = prompt(`Zur Bestätigung: Passwort von „${user.name}" eingeben`);
  if (!pw) throw new Error("Abgebrochen.");
  adminPasswordCache = pw;
  return pw;
}

async function renderAdmin() {
  root().innerHTML = `
    <div class="view-header">
      <div>
        <div class="view-title">Admin</div>
        <div class="view-subtitle">Nutzerkonten verwalten</div>
      </div>
    </div>
    <div class="panel" style="margin-bottom:14px;max-width:340px;">
      <input class="text-field" id="admin-search" placeholder="🔍 Benutzername suchen…" />
    </div>
    <div class="panel" id="admin-panel">Lade Nutzerliste …</div>
  `;

  try {
    adminAllPlayers = await listPlayers();
  } catch (e) {
    document.getElementById("admin-panel").innerHTML =
      `<div class="empty-state">Fehler beim Laden: ${escapeHtml(e.message)}</div>`;
    return;
  }
  paintAdmin(adminAllPlayers);

  document.getElementById("admin-search").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    const filtered = q ? adminAllPlayers.filter((p) => p.username.toLowerCase().includes(q)) : adminAllPlayers;
    paintAdmin(filtered);
  });
}

function paintAdmin(players) {
  const panel = document.getElementById("admin-panel");
  if (!players.length) {
    panel.innerHTML = `<div class="empty-state">Keine Konten gefunden.</div>`;
    return;
  }
  panel.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr><th>Benutzername</th><th>Erstellt am</th><th>Status</th><th colspan="3"></th></tr>
      </thead>
      <tbody>
        ${players.map((p) => {
          // ← FIX: is_admin/banned kamen in manchen Fällen als String
          // ("false"/"true") statt als echtes Boolean zurück — ein
          // nicht-leerer String ist in JS immer "truthy", daher wurde
          // z.B. "false" fälschlich als true gewertet. Explizit prüfen.
          const isAdmin = p.is_admin === true || p.is_admin === "true";
          const isBanned = p.banned === true || p.banned === "true";
          return `
          <tr data-id="${p.id}" data-username="${escapeHtml(p.username)}">
            <td>${escapeHtml(p.username)}${isAdmin ? ' <span class="admin-badge">ADMIN</span>' : ""}</td>
            <td>${new Date(p.created_at).toLocaleDateString("de-DE")}</td>
            <td>${isBanned ? '<span class="status-banned">Gesperrt</span>' : '<span class="status-ok">Aktiv</span>'}</td>
            <td>${isAdmin ? "" : `<button class="btn small ${isBanned ? "" : "danger"}" data-action="${isBanned ? "unban" : "ban"}">${isBanned ? "Entsperren" : "Sperren"}</button>`}</td>
            <td>${isAdmin ? "" : `<button class="btn small" data-action="reset">Passwort zurücksetzen</button>`}</td>
            <td>${isAdmin ? "" : `<button class="btn small danger" data-action="delete">Löschen</button>`}</td>
          </tr>
        `;
        }).join("")}
      </tbody>
    </table>
  `;

  panel.querySelectorAll("button[data-action]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const row = btn.closest("tr");
      const id = row.dataset.id;
      const username = row.dataset.username;
      const action = btn.dataset.action;

      if (action === "ban" || action === "unban") {
        const wantBan = action === "ban";
        if (wantBan && !confirm(`„${username}" wirklich sperren? Das Konto kann sich danach nicht mehr anmelden.`)) return;
        btn.disabled = true;
        try {
          await setBanned(id, wantBan);
          showToast(wantBan ? `„${username}" wurde gesperrt.` : `„${username}" wurde entsperrt.`);
          renderAdmin();
        } catch (e) {
          showToast("Fehler: " + e.message, true);
          btn.disabled = false;
        }
        return;
      }

      if (action === "reset") {
        if (!confirm(`Neues, zufälliges Passwort für „${username}" erzeugen? Das alte Passwort wird ungültig.`)) return;
        btn.disabled = true;
        try {
          const adminPw = await askAdminPassword();
          const tempPassword = await adminResetPassword(user.name, adminPw, id);
          alert(`Neues Passwort für „${username}":\n\n${tempPassword}\n\nBitte sicher weitergeben — es wird nirgends gespeichert und kann danach nicht erneut angezeigt werden.`);
          showToast("Passwort wurde zurückgesetzt");
        } catch (e) {
          adminPasswordCache = null; // falsches Passwort -> nicht weiter cachen
          showToast("Fehler: " + e.message, true);
        } finally {
          btn.disabled = false;
        }
        return;
      }

      if (action === "delete") {
        if (!confirm(`Konto „${username}" wirklich unwiderruflich löschen?`)) return;
        btn.disabled = true;
        try {
          const adminPw = await askAdminPassword();
          await adminDeleteAccount(user.name, adminPw, id);
          showToast(`„${username}" wurde gelöscht.`);
          renderAdmin();
        } catch (e) {
          adminPasswordCache = null;
          showToast("Fehler: " + e.message, true);
          btn.disabled = false;
        }
      }
    });
  });
}

function renderAbzeichen() {
  root().innerHTML = `
    <div class="view-header">
      <div>
        <div class="view-title">Abzeichen</div>
        <div class="view-subtitle">${user.badges.length}/${BADGES.length} freigeschaltet</div>
      </div>
    </div>
    <div class="badge-grid">
      ${BADGES.map((b) => {
        const unlocked = user.badges.includes(b.id);
        return `
          <div class="badge-card ${unlocked ? "" : "locked"}">
            <div class="b-icon">${b.icon}</div>
            <div class="b-title">${b.title}</div>
            <div class="b-desc">${b.desc}</div>
          </div>`;
      }).join("")}
    </div>
  `;
}

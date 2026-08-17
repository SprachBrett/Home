// ============================================================
// streak.js — Streak- und Tagesziel-Logik
// ============================================================

import { todayISO } from "./storage.js?v=1786965190";

function daysBetween(isoA, isoB) {
  const a = new Date(isoA + "T00:00:00");
  const b = new Date(isoB + "T00:00:00");
  return Math.round((b - a) / 86400000);
}

const HEART_REGEN_HOURS = 4; // ein Herz wächst alle 4 Stunden nach, bis maxHearts erreicht ist

// Füllt Herzen passiv über die Zeit auf (z.B. wenn der Nutzer eine Weile weg war).
export function regenerateHearts(user) {
  if (user.hearts >= user.maxHearts) {
    user.lastHeartRegenAt = new Date().toISOString();
    return user;
  }
  if (!user.lastHeartRegenAt) {
    user.lastHeartRegenAt = new Date().toISOString();
    return user;
  }
  const hoursPassed = (Date.now() - new Date(user.lastHeartRegenAt).getTime()) / 3600000;
  const gained = Math.floor(hoursPassed / HEART_REGEN_HOURS);
  if (gained > 0) {
    user.hearts = Math.min(user.maxHearts, user.hearts + gained);
    user.lastHeartRegenAt = new Date().toISOString();
  }
  return user;
}

// Wird beim App-Start aufgerufen: prüft, ob der Streak noch gültig ist,
// oder ob ein Tag verpasst wurde (Streak wird dann zurückgesetzt).
export function checkStreakOnLoad(user) {
  const today = todayISO();

  if (user.xpTodayDate !== today) {
    user.xpToday = 0;
    user.xpTodayDate = today;
  }

  if (!user.lastActiveDate) {
    return user; // Erster Besuch überhaupt, Streak startet bei 0 bis erste Lektion
  }

  const diff = daysBetween(user.lastActiveDate, today);
  if (diff >= 2) {
    // Mehr als ein Tag verpasst -> Streak bricht
    user.streak = 0;
  }
  return user;
}

// Wird aufgerufen, wenn der Nutzer XP verdient (z.B. Lektion abgeschlossen)
export function registerActivity(user, xpGained) {
  const today = todayISO();

  if (user.xpTodayDate !== today) {
    user.xpToday = 0;
    user.xpTodayDate = today;
  }
  user.xpToday += xpGained;
  user.xp += xpGained;

  if (user.lastActiveDate !== today) {
    const diff = user.lastActiveDate ? daysBetween(user.lastActiveDate, today) : 1;
    if (diff === 1) {
      user.streak += 1;
    } else {
      user.streak = 1; // neuer Streak-Start
    }
    user.lastActiveDate = today;
  }
  return user;
}

export function dailyGoalProgress(user) {
  const goal = user.settings?.dailyGoal || user.dailyGoalXp || 30;
  return {
    current: Math.min(user.xpToday, goal),
    goal,
    percent: Math.min(100, Math.round((user.xpToday / goal) * 100)),
    reached: user.xpToday >= goal
  };
}

// Level aus Gesamt-XP ableiten (einfache Kurve)
export function levelFromXp(xp) {
  let level = 1;
  let need = 100;
  let remaining = xp;
  while (remaining >= need) {
    remaining -= need;
    level += 1;
    need = Math.round(need * 1.18);
  }
  return { level, xpIntoLevel: remaining, xpForNextLevel: need };
}

// ============================================================
// badges.js — Abzeichen-Definitionen und Vergabe-Logik
// ============================================================

import { getFlatLessons, LANGUAGES } from "./data.js?v=1786965190";

export const BADGES = [
  {
    id: "erste-lektion",
    title: "Erster Schritt",
    icon: "🌱",
    desc: "Schließe deine erste Lektion ab.",
    check: (user) => totalCompleted(user) >= 1
  },
  {
    id: "fuenf-lektionen",
    title: "In Fahrt",
    icon: "🚀",
    desc: "Schließe 5 Lektionen ab.",
    check: (user) => totalCompleted(user) >= 5
  },
  {
    id: "alle-lektionen-einer-sprache",
    title: "Sprachprofi",
    icon: "🏅",
    desc: "Schließe alle Lektionen einer Sprache ab.",
    check: (user) => Object.keys(LANGUAGES).some(
      (id) => getFlatLessons(id).length > 0 &&
        (user.completedLessons[id] || []).length >= getFlatLessons(id).length
    )
  },
  {
    id: "streak-3",
    title: "Drei Tage dran",
    icon: "🔥",
    desc: "Erreiche einen Streak von 3 Tagen.",
    check: (user) => user.streak >= 3
  },
  {
    id: "streak-7",
    title: "Eine Woche stark",
    icon: "🔥",
    desc: "Erreiche einen Streak von 7 Tagen.",
    check: (user) => user.streak >= 7
  },
  {
    id: "streak-30",
    title: "Unaufhaltsam",
    icon: "🔥",
    desc: "Erreiche einen Streak von 30 Tagen.",
    check: (user) => user.streak >= 30
  },
  {
    id: "xp-100",
    title: "100 XP",
    icon: "⭐",
    desc: "Sammle insgesamt 100 XP.",
    check: (user) => user.xp >= 100
  },
  {
    id: "xp-500",
    title: "500 XP",
    icon: "⭐",
    desc: "Sammle insgesamt 500 XP.",
    check: (user) => user.xp >= 500
  },
  {
    id: "xp-1000",
    title: "1000 XP",
    icon: "💎",
    desc: "Sammle insgesamt 1000 XP.",
    check: (user) => user.xp >= 1000
  },
  {
    id: "polyglott",
    title: "Polyglott",
    icon: "🌍",
    desc: "Schließe mindestens eine Lektion in jeder Sprache ab.",
    check: (user) => Object.keys(LANGUAGES).every(
      (id) => (user.completedLessons[id] || []).length > 0
    )
  },
  {
    id: "perfektionist",
    title: "Perfektionist",
    icon: "✨",
    desc: "Schließe eine Lektion mit 3 Sternen ab.",
    check: (user) => Object.values(user.lessonStars || {}).some((s) => s >= 3)
  },
  {
    id: "tagesziel",
    title: "Ziel erreicht",
    icon: "🎯",
    desc: "Erreiche dein Tagesziel an XP.",
    check: (user) => user.xpToday >= (user.settings?.dailyGoal || 30)
  }
];

function totalCompleted(user) {
  return Object.values(user.completedLessons || {}).reduce((sum, arr) => sum + arr.length, 0);
}

// Prüft alle Badges gegen den aktuellen Nutzerstand.
// Gibt die Liste NEU freigeschalteter Badge-IDs zurück (für Toasts/Feiern).
export function evaluateBadges(user) {
  const newly = [];
  BADGES.forEach((badge) => {
    const already = user.badges.includes(badge.id);
    if (!already && badge.check(user)) {
      user.badges.push(badge.id);
      newly.push(badge.id);
    }
  });
  return newly;
}

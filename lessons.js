// ============================================================
// lessons.js — Übungsgenerierung & Lektions-Sitzung
//
// Aus den Vokabellisten in data.js werden automatisch Übungen
// dreier Typen erzeugt: choice (Multiple Choice), translate
// (Wort eintippen), listen (Hören & erkennen via Sprachausgabe).
// ============================================================

import { LANGUAGES, SPEECH_LOCALE } from "./data.js?v=1786965190";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickDistractors(vocab, correctIndex, count) {
  const pool = vocab.filter((_, i) => i !== correctIndex).map((v) => v[0]);
  return shuffle(pool).slice(0, count);
}

// Baut eine gemischte Übungsliste für eine Lektion.
export function buildExercises(lesson, langId) {
  const vocab = lesson.vocab;
  const exercises = [];

  vocab.forEach(([de, target], idx) => {
    // 1) Multiple Choice: Zielsprache -> Deutsch
    const distractorsA = pickDistractors(vocab, idx, 3);
    exercises.push({
      type: "choice",
      prompt: `Was bedeutet „${target}“?`,
      audioText: null,
      correct: de,
      options: shuffle([de, ...distractorsA])
    });

    // 2) Tippen: Deutsch -> Zielsprache
    exercises.push({
      type: "translate",
      prompt: `Übersetze: „${de}“`,
      correct: target,
      hint: target
    });

    // 3) Hören: Zielsprache vorlesen -> Deutsch erkennen
    const distractorsB = pickDistractors(vocab, idx, 3);
    exercises.push({
      type: "listen",
      prompt: "Was hast du gehört?",
      audioText: target,
      correct: de,
      options: shuffle([de, ...distractorsB])
    });
  });

  return shuffle(exercises);
}

// Spricht Text in der Zielsprache über die Web Speech API.
export function speak(text, langId, volume = 80) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = SPEECH_LOCALE[langId] || "en-GB";
  utter.volume = Math.max(0, Math.min(1, volume / 100));
  utter.rate = 0.95;
  window.speechSynthesis.speak(utter);
}

// Normalisiert Nutzereingaben für den Textvergleich (Groß/Klein, Leerzeichen, Satzzeichen).
export function normalize(str) {
  return str
    .toLowerCase()
    .trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Akzente entfernen (nachsichtiger Vergleich)
    .replace(/[.!?¡¿]/g, "")
    .replace(/\s+/g, " ");
}

export function checkAnswer(exercise, userInput) {
  if (exercise.type === "translate") {
    return normalize(userInput) === normalize(exercise.correct);
  }
  return userInput === exercise.correct;
}

// Ermittelt XP für eine abgeschlossene Lektion: Basis + Bonus für Genauigkeit.
export function computeLessonReward(correctCount, totalCount) {
  const accuracy = totalCount ? correctCount / totalCount : 0;
  const base = 10;
  const bonus = Math.round(accuracy * 15);
  const xp = base + bonus;
  let stars = 1;
  if (accuracy >= 0.95) stars = 3;
  else if (accuracy >= 0.75) stars = 2;
  return { xp, stars, accuracy };
}

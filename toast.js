// ============================================================
// toast.js — Kurze Benachrichtigungen (z.B. neue Abzeichen)
// ============================================================

export function showToast(message, duration = 3600) {
  const root = document.getElementById("toast-root");
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  root.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transition = "opacity 0.3s";
    setTimeout(() => el.remove(), 300);
  }, duration);
}

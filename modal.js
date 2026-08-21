// ============================================================
// modal.js — Generisches Modal im SprachBrett-Design
// Ersetzt hässliche native confirm()/alert()/prompt()-Fenster.
// ============================================================

import { wirePasswordToggles } from "./auth-ui.js?v=1787297405";

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// Basis-Baustein: zeigt ein Modal mit beliebigem Inhalt und Buttons.
// Löst mit dem overlay-Element auf (truthy), wenn ein Button geklickt
// wurde, oder mit null bei Escape/Klick daneben — außer der geklickte
// Button hat cancel:true gesetzt, dann ebenfalls null.
export function openModal({ title, bodyHtml, buttons }) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal-card">
        <div class="modal-title">${title}</div>
        <div class="modal-body">${bodyHtml}</div>
        <div class="modal-actions">
          ${buttons.map((b) => `<button class="btn ${b.primary ? "btn-primary" : ""} ${b.danger ? "danger" : ""}" data-id="${b.id}">${b.label}</button>`).join("")}
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    wirePasswordToggles(overlay);

    function close(result) {
      overlay.remove();
      document.removeEventListener("keydown", onKey);
      resolve(result);
    }
    function onKey(e) {
      if (e.key === "Escape") close(null);
    }
    document.addEventListener("keydown", onKey);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(null); });
    buttons.forEach((b) => {
      overlay.querySelector(`[data-id="${b.id}"]`).addEventListener("click", () => close(b.cancel ? null : overlay));
    });

    const firstInput = overlay.querySelector("input");
    if (firstInput) {
      firstInput.focus();
      firstInput.addEventListener("keydown", (e) => { if (e.key === "Enter") overlay.querySelector('[data-id="ok"]')?.click(); });
    }
  });
}

// Ersatz für alert(): eine Info mit nur einem "OK"-Button.
export function showInfoModal(title, bodyHtml) {
  return openModal({ title, bodyHtml, buttons: [{ id: "ok", label: "OK", primary: true }] });
}

// Ersatz für confirm(): löst mit true/false auf statt mit einem
// DOM-Element, damit sich bestehendes `if (!confirm(...)) return;`
// eins zu eins in `if (!await confirmModal(...)) return;` übersetzen lässt.
export async function confirmModal(message, { title = "Bitte bestätigen", okLabel = "Ja", danger = false } = {}) {
  const result = await openModal({
    title,
    bodyHtml: `<div class="view-subtitle">${escapeHtml(message)}</div>`,
    buttons: [
      { id: "cancel", label: "Abbrechen", cancel: true },
      { id: "ok", label: okLabel, primary: !danger, danger }
    ]
  });
  return !!result;
}

-- ============================================================
-- SprachBrett — Sicherheitsfix: Benutzername serverseitig validieren
--
-- BUG: Der Zeichen-Filter für Benutzernamen (nur Buchstaben, Zahlen,
-- Leerzeichen, Punkt, Binde-/Unterstrich) existierte bisher NUR im
-- Browser (auth.js validateUsername). Wer die Registrierungs-API
-- direkt anspricht (z.B. per fetch(), wie beim Debuggen), konnte
-- diese Prüfung umgehen und einen Benutzernamen mit HTML/Script-Code
-- registrieren. Da Namen in der Rangliste angezeigt werden, wäre das
-- eine gespeicherte XSS-Lücke gewesen (zusätzlich zum jetzt in
-- workspace.js ergänzten Escaping bei der Anzeige — diese
-- Datenbank-Regel ist die zweite, unabhängige Absicherung).
-- ============================================================

alter table sprachbrett_players
  add constraint sprachbrett_players_username_format
  check (username ~ '^[a-zA-Z0-9_. äöüÄÖÜß-]{3,20}$');

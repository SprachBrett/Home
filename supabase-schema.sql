-- ============================================================
-- SprachBrett — Account-Tabelle
-- Einmal im Supabase SQL-Editor eures Projekts ausführen
-- (dasselbe Projekt wie NACHRICHTENBRETT, aber eigene Tabelle —
-- es wird NICHTS am Mail-System verändert).
-- ============================================================

create table if not exists sprachbrett_players (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  username_lower text not null,
  password_hash text not null,
  created_at timestamptz not null default now(),

  constraint sprachbrett_players_username_lower_key unique (username_lower)
);

-- Row Level Security aktivieren, aber Lesen/Schreiben über den
-- anon-Key erlauben (Passwort-Hash wird nie im Klartext gespeichert,
-- die Prüfung passiert clientseitig anhand des Hash-Vergleichs —
-- genau wie beim bestehenden NACHRICHTENBRETT-System).
alter table sprachbrett_players enable row level security;

create policy "Öffentliches Lesen für Verfügbarkeits-Check/Login"
  on sprachbrett_players for select
  using (true);

create policy "Öffentliche Registrierung"
  on sprachbrett_players for insert
  with check (true);

-- Kein UPDATE/DELETE-Policy -> per REST-API nicht möglich (nur du
-- selbst über die Supabase-Konsole könntest Einträge ändern/löschen).

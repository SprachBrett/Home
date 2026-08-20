-- ============================================================
-- SprachBrett — Herzen & Streak als eigene Spalten am Account
-- Nach den vorigen SQL-Dateien einmalig zusätzlich ausführen.
--
-- Beides steckte bisher schon "versteckt" im progress-Feld (das
-- den kompletten Fortschritt als JSON speichert), aber nicht als
-- eigene, direkt einsehbare/abfragbare Spalte wie xp.
-- ============================================================

alter table sprachbrett_players add column if not exists hearts integer not null default 5;
alter table sprachbrett_players add column if not exists streak integer not null default 0;

alter table sprachbrett_players add constraint sprachbrett_players_hearts_range check (hearts >= 0 and hearts <= 5);
alter table sprachbrett_players add constraint sprachbrett_players_streak_nonneg check (streak >= 0);

grant update (hearts) on sprachbrett_players to anon;
grant update (streak) on sprachbrett_players to anon;

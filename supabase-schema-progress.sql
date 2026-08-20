-- ============================================================
-- SprachBrett — Fortschritt am Account speichern (Bugfix)
-- Nach den vorigen SQL-Dateien einmalig zusätzlich ausführen.
--
-- BUG VORHER: Lektionen, XP, Streak, Herzen usw. lagen NUR in
-- localStorage unter einem einzigen, account-unabhängigen
-- Schlüssel. Meldete man sich im selben Browser mit einem anderen
-- Konto an, sah man weiterhin den Fortschritt des vorherigen
-- Kontos. Ab jetzt hängt der komplette Fortschritt am Account
-- (Spalte "progress") und wird bei jedem Sync mitgeschickt.
-- ============================================================

alter table sprachbrett_players add column if not exists progress jsonb;

-- Wie bei "xp": darf über die API geändert werden, aber nur die
-- Spalte selbst — kein Zugriff auf password_hash o.ä.
grant update (progress) on sprachbrett_players to anon;

-- Login-Funktion um den gespeicherten Fortschritt erweitern, damit
-- er direkt beim Anmelden mitgeliefert wird (kein zweiter Request
-- nötig, und der Passwort-Hash bleibt weiterhin unsichtbar).
-- Rückgabetyp ändert sich (neue Spalte) -> muss erst gelöscht werden,
-- "create or replace" reicht dafür bei Postgres nicht aus.
drop function if exists verify_login(text, text);

create function verify_login(p_username_lower text, p_hash text)
returns table(id uuid, username text, is_admin boolean, banned boolean, progress jsonb)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select p.id, p.username, p.is_admin, p.banned, p.progress
    from sprachbrett_players p
    where p.username_lower = p_username_lower
      and p.password_hash = p_hash;
end;
$$;
grant execute on function verify_login(text, text) to anon;

-- ============================================================
-- EHRLICHER HINWEIS: Wie schon bei "xp" und "banned" ist auch
-- "progress" ohne echte Server-Session frei durch jeden mit dem
-- anon-Key beschreibbar, der die passende username_lower kennt —
-- es gibt keine kryptografische Bindung an "diese Person ist wirklich
-- eingeloggt". Für ein Hobby-Projekt mit überschaubarem Nutzerkreis
-- ein vertretbares Risiko (identisch zum bisherigen Modell), aber
-- kein Schutz auf Bank-Niveau.
-- ============================================================

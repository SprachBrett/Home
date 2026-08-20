-- ============================================================
-- SprachBrett — Sicherheitsfix: Sperren/Entsperren nur mit
-- echter Admin-Prüfung
--
-- BISHER: Die "banned"-Spalte war über eine offene Regel
-- (using(true) with check(true)) beschreibbar — die einzige
-- "Sicherheit" war, dass niemand ohne Admin-Konto den passierenden
-- Button im Frontend sieht. Da der anon-Key aber im Frontend-Code
-- öffentlich sichtbar ist, hätte technisch jeder direkt per API
-- jedes Konto sperren/entsperren können, auch ohne Admin zu sein.
--
-- JETZT: Läuft wie "Passwort zurücksetzen" und "Konto löschen" über
-- eine Funktion, die zuerst das Admin-Passwort prüft.
-- ============================================================

create or replace function admin_set_banned(p_admin_username_lower text, p_admin_hash text, p_target_id uuid, p_banned boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin_ok boolean;
begin
  select true into is_admin_ok from sprachbrett_players
    where username_lower = p_admin_username_lower and password_hash = p_admin_hash and is_admin = true;
  if not coalesce(is_admin_ok, false) then
    return false;
  end if;
  update sprachbrett_players set banned = p_banned where id = p_target_id and is_admin = false;
  return true;
end;
$$;
grant execute on function admin_set_banned(text, text, uuid, boolean) to anon;

-- Die alte, offene Schreibmöglichkeit auf "banned" wird entzogen —
-- ab jetzt geht das nur noch über obige, geprüfte Funktion.
-- WICHTIG: Nur das Spaltenrecht wird entzogen, NICHT die
-- zugrundeliegende Update-Regel selbst — die wird weiterhin von den
-- XP-/Herzen-/Streak-/Progress-Syncs gebraucht (siehe
-- supabase-schema-leaderboard.sql / -hearts-streak.sql /
-- -progress.sql), die dieselbe Zeilen-Regel mitbenutzen.
revoke update (banned) on sprachbrett_players from anon;

-- ============================================================
-- SprachBrett — Sicherheits-Update + neue Funktionen
-- Nach supabase-schema.sql und supabase-schema-admin.sql
-- einmalig zusätzlich ausführen.
--
-- WAS SICH ÄNDERT:
-- 1) password_hash ist ab jetzt für niemanden mehr über die API
--    lesbar — auch nicht über select=*. Login/Passwort-Änderung/
--    Konto löschen laufen stattdessen über Datenbank-Funktionen
--    (SECURITY DEFINER), die den Hash intern vergleichen, ohne
--    ihn je zurückzugeben.
-- 2) Login-Fehler unterscheiden nicht mehr zwischen "Benutzername
--    existiert nicht" und "falsches Passwort" — das ist Absicht
--    (verhindert, dass jemand gezielt existierende Benutzernamen
--    durchprobieren kann).
-- ============================================================

-- ---- 1) password_hash nie mehr auslesbar ----
revoke select (password_hash) on sprachbrett_players from anon;

-- ---- 2) Login ohne Hash-Übertragung an den Client ----
create or replace function verify_login(p_username_lower text, p_hash text)
returns table(id uuid, username text, is_admin boolean, banned boolean)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select p.id, p.username, p.is_admin, p.banned
    from sprachbrett_players p
    where p.username_lower = p_username_lower
      and p.password_hash = p_hash;
end;
$$;
grant execute on function verify_login(text, text) to anon;

-- ---- 3) Eigenes Passwort ändern (alter Hash muss stimmen) ----
create or replace function change_password(p_username_lower text, p_old_hash text, p_new_hash text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  ok boolean := false;
begin
  update sprachbrett_players
    set password_hash = p_new_hash
    where username_lower = p_username_lower and password_hash = p_old_hash;
  ok := found;
  return ok;
end;
$$;
grant execute on function change_password(text, text, text) to anon;

-- ---- 4) Eigenes Konto löschen (Hash muss stimmen) ----
create or replace function delete_own_account(p_username_lower text, p_hash text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  ok boolean := false;
begin
  delete from sprachbrett_players
    where username_lower = p_username_lower and password_hash = p_hash;
  ok := found;
  return ok;
end;
$$;
grant execute on function delete_own_account(text, text) to anon;

-- ---- 5) Admin: Passwort eines Nutzers zurücksetzen ----
create or replace function admin_reset_password(p_admin_username_lower text, p_admin_hash text, p_target_id uuid, p_new_hash text)
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
  update sprachbrett_players set password_hash = p_new_hash where id = p_target_id;
  return true;
end;
$$;
grant execute on function admin_reset_password(text, text, uuid, text) to anon;

-- ---- 6) Admin: Konto löschen (nie ein anderes Admin-Konto) ----
create or replace function admin_delete_account(p_admin_username_lower text, p_admin_hash text, p_target_id uuid)
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
  delete from sprachbrett_players where id = p_target_id and is_admin = false;
  return true;
end;
$$;
grant execute on function admin_delete_account(text, text, uuid) to anon;

-- ============================================================
-- SprachBrett — "Passwort vergessen" per Wiederherstellungscode
-- Nach den vorigen drei SQL-Dateien einmalig zusätzlich ausführen.
--
-- WIE ES FUNKTIONIERT:
-- Da SprachBrett keinen eigenen Mailserver hat, gibt es keinen
-- klassischen "Link per E-Mail"-Reset. Stattdessen bekommt man bei
-- der Registrierung einmalig einen Wiederherstellungscode angezeigt
-- (z.B. "K7M2-9XQP-4RTL"), den man sich selbst sichern muss (Notiz,
-- Passwort-Manager, Screenshot). Mit diesem Code + neuem Passwort
-- kann man später sein Passwort zurücksetzen, ohne das alte zu
-- kennen. Der Code ist ein EINMAL-CODE: nach Benutzung ungültig,
-- man kann sich danach im Profil einen neuen erzeugen.
-- ============================================================

alter table sprachbrett_players add column if not exists recovery_code_hash text;

-- Auch dieser Hash darf niemals über die API auslesbar sein.
revoke select (recovery_code_hash) on sprachbrett_players from anon;

-- ---- Passwort mit Wiederherstellungscode zurücksetzen ----
create or replace function reset_password_with_recovery_code(p_username_lower text, p_recovery_hash text, p_new_password_hash text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update sprachbrett_players
    set password_hash = p_new_password_hash,
        recovery_code_hash = null -- Einmal-Code: nach Nutzung verbraucht
    where username_lower = p_username_lower
      and recovery_code_hash is not null
      and recovery_code_hash = p_recovery_hash;
  return found;
end;
$$;
grant execute on function reset_password_with_recovery_code(text, text, text) to anon;

-- ---- Neuen Wiederherstellungscode setzen (braucht aktuelles Passwort) ----
create or replace function set_recovery_code(p_username_lower text, p_password_hash text, p_new_recovery_hash text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update sprachbrett_players
    set recovery_code_hash = p_new_recovery_hash
    where username_lower = p_username_lower and password_hash = p_password_hash;
  return found;
end;
$$;
grant execute on function set_recovery_code(text, text, text) to anon;

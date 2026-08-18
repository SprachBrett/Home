-- ============================================================
-- SprachBrett — Rangliste in Supabase statt Firebase
-- Nach den vorigen SQL-Dateien einmalig zusätzlich ausführen.
--
-- WARUM: Es gibt jetzt schon Accounts in Supabase — die Rangliste
-- braucht dann keine zweite, komplett getrennte Anmeldung (Firebase
-- Anonymous Auth) mehr. XP hängt einfach direkt am Account.
-- ============================================================

alter table sprachbrett_players add column if not exists xp integer not null default 0;

-- XP darf über die API geändert werden (wie schon "banned"), aber
-- NICHT beliebig: ein Trigger verhindert, dass XP sinkt oder pro
-- Sync um mehr als 40 auf einmal steigt (eine Lektion gibt maximal
-- 25 XP) — dieselbe Schutzlogik wie vorher in den Firebase-Regeln.
grant update (xp) on sprachbrett_players to anon;

create or replace function enforce_xp_rules()
returns trigger
language plpgsql
as $$
begin
  if new.xp < old.xp then
    raise exception 'XP kann nicht sinken';
  end if;
  if new.xp - old.xp > 40 then
    raise exception 'XP-Sprung zu groß (max. 40 pro Sync)';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_xp_rules on sprachbrett_players;
create trigger trg_enforce_xp_rules
  before update of xp on sprachbrett_players
  for each row execute function enforce_xp_rules();

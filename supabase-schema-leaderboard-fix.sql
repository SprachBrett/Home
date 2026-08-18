-- ============================================================
-- SprachBrett — Bugfix: "Zurücksetzen" wirkte nicht auf die Rangliste
--
-- Der Anti-Cheat-Trigger aus supabase-schema-leaderboard.sql
-- verhinderte JEDES Sinken von XP — auch einen bewussten, lokalen
-- Reset über den "Zurücksetzen"-Button im Profil. Diese Version
-- erlaubt zusätzlich den Sonderfall "XP wird auf exakt 0 gesetzt"
-- (= vollständiger Reset), ohne die eigentliche Anti-Cheat-Regel
-- (kein sonstiges Sinken, max. +40 pro Sync) aufzuweichen.
-- ============================================================

create or replace function enforce_xp_rules()
returns trigger
language plpgsql
as $$
begin
  if new.xp = 0 then
    return new; -- vollständiger Reset ist immer erlaubt
  end if;
  if new.xp < old.xp then
    raise exception 'XP kann nicht sinken';
  end if;
  if new.xp - old.xp > 40 then
    raise exception 'XP-Sprung zu groß (max. 40 pro Sync)';
  end if;
  return new;
end;
$$;

-- ============================================================
-- SprachBrett — Admin/Bann-Erweiterung
-- Nach supabase-schema.sql einmalig zusätzlich ausführen.
-- ============================================================

alter table sprachbrett_players add column if not exists is_admin boolean not null default false;
alter table sprachbrett_players add column if not exists banned boolean not null default false;

-- ---- Update erlauben, aber NUR für die Spalte "banned" ----
-- Spaltenrechte in Postgres wirken zusätzlich zur RLS-Policy: selbst wer
-- die Policy "besteht", darf trotzdem nur die freigegebenen Spalten
-- ändern. So kann niemand über die API is_admin oder password_hash
-- verändern — auch nicht das Admin-Panel selbst, das ist Absicht.
revoke update on sprachbrett_players from anon;
grant update (banned) on sprachbrett_players to anon;

create policy "Bann-Status kann geändert werden"
  on sprachbrett_players for update
  using (true)
  with check (true);

-- ============================================================
-- EHRLICHER HINWEIS (wie an anderer Stelle im Projekt üblich):
-- Die Prüfung "ist der aktuell eingeloggte Nutzer wirklich Admin?"
-- passiert nur clientseitig (im Browser), nicht serverseitig, weil
-- dieses Projekt kein echtes Server-Backend hat, sondern nur den
-- öffentlichen anon-Key direkt aus dem Browser heraus benutzt.
-- Das heißt: rein technisch könnte jemand, der den Netzwerk-Traffic
-- der Seite genau liest, auch ohne Admin-Konto einen PATCH-Request
-- gegen die "banned"-Spalte schicken. Für ein Hobby-Projekt mit
-- kleinem, bekanntem Nutzerkreis ist das ein vertretbares Risiko —
-- für "echten" Schutz bräuchte es eine serverseitige Prüfung (z.B.
-- eine Supabase Edge Function), die aktuell nicht existiert.
-- ============================================================

-- ---- Dein Konto zum Admin machen ----
-- ZUERST auf der Seite ganz normal mit dem Benutzernamen "Brett_ADMIN"
-- registrieren, DANACH diese Zeile hier ausführen:
--
-- update sprachbrett_players set is_admin = true where username_lower = 'brett_admin';

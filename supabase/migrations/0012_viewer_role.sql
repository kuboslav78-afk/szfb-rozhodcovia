-- Nová rola "viewer" — člen komisie rozhodcov, ktorý potrebuje vidieť celý systém
-- (všetky kategórie/regióny v prehľade) ale nesmie nič upravovať (žiadne hracie dni,
-- žiadne schvaľovanie žiadostí o zrušenie, žiadna administrácia rozhodcov).
alter table referees drop constraint if exists referees_role_check;
alter table referees add constraint referees_role_check
  check (role in ('admin', 'referee', 'viewer'));

create or replace function is_viewer()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from referees where id = auth.uid() and role = 'viewer'
  );
$$;

-- viewer smie čítať naprieč všetkými kategóriami, ale nemá žiadnu insert/update/delete
-- politiku nikde — zápis je teda na úrovni DB úplne zablokovaný, aj keby v UI niečo chýbalo.
create policy "referees_select_viewer" on referees
  for select using (is_viewer());
create policy "availability_select_viewer" on availability
  for select using (is_viewer());
create policy "referee_categories_select_viewer" on referee_categories
  for select using (is_viewer());

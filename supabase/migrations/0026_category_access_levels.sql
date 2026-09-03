-- Kategóriový prístup má odteraz dve úrovne:
--   can_edit = true  — plné admin práva (doterajší regionálny admin)
--   can_edit = false — len na čítanie (napr. člen KRO, ktorý potrebuje vidieť
--                      celoštátnu súťaž, ale nemá ju obsadzovať)
--
-- Prečo nie existujúca rola 'viewer': tá je celoplošná a odoberá úplne všetko
-- (migrácia 0012 jej nedáva žiadnu write politiku nikde) — vrátane vypĺňania
-- vlastnej dostupnosti. Členovia KRO sú ale často zároveň aktívni rozhodcovia,
-- takže potrebujú nahliadací prístup, ktorý sa k ich rozhodcovskej role pripočíta,
-- nie ju nahradí. Rola 'viewer' zostáva pre čisto prezentačné účty.
alter table category_admins add column if not exists can_edit boolean not null default true;

-- is_category_admin() odteraz znamená "smie v tejto kategórii upravovať".
-- Vďaka tomu všetky doterajšie write politiky (availability, match_days, matches)
-- automaticky prestanú platiť pre read-only prístup a nemusíme sa ich dotknúť.
create or replace function is_category_admin(target_category text)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from category_admins
    where referee_id = auth.uid()
      and category = target_category
      and can_edit
  );
$$;

-- Nová funkcia pre čítanie — platí pre obe úrovne prístupu.
create or replace function has_category_access(target_category text)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from category_admins
    where referee_id = auth.uid() and category = target_category
  );
$$;

-- SELECT politiky sa presúvajú z is_category_admin na has_category_access,
-- aby read-only prístup naozaj videl to, čo má.

drop policy if exists "referees_select_category_admin" on referees;
create policy "referees_select_category_admin" on referees
  for select using (
    exists (
      select 1 from referee_categories rc
      where rc.referee_id = referees.id and has_category_access(rc.category)
    )
  );

drop policy if exists "availability_select_category_admin" on availability;
create policy "availability_select_category_admin" on availability
  for select using (has_category_access(category));

drop policy if exists "referee_categories_select_category_admin" on referee_categories;
create policy "referee_categories_select_category_admin" on referee_categories
  for select using (has_category_access(category));

drop policy if exists "match_days_select_own_category" on match_days;
create policy "match_days_select_own_category" on match_days
  for select using (
    is_admin()
    or is_viewer()
    or has_category_access(category)
    or exists (
      select 1 from referee_categories rc
      where rc.referee_id = auth.uid() and rc.category = match_days.category
    )
  );

drop policy if exists "matches_select_admin" on matches;
create policy "matches_select_admin" on matches
  for select using (is_admin() or has_category_access(category));

-- referee_visible_to_category_admin() (migrácia 0010) sa pozerá do category_admins
-- bez ohľadu na can_edit, takže pre čítanie funguje správne aj naďalej — nechávame ju tak.

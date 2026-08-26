-- Domáci (stály) región rozhodcu — nastaví sa raz pri prvom prihlásení (self-service,
-- len kým je null), potom ho môže meniť už len administrátor.
alter table referees add column if not exists home_region text
  check (home_region is null or home_region in ('vychod', 'stred', 'zapad', 'bratislava'));

create policy "referees_set_own_home_region_once" on referees
  for update
  using (auth.uid() = id and home_region is null)
  with check (auth.uid() = id);

-- Ak kategóriový admin vidí rozhodcu cez zdieľanú kategóriu, nech vidí aj jeho
-- ostatné kategórie (napr. či je zároveň celoštátny) — potrebné pre rozlíšenie
-- domáci / celoštátny / hosťujúci rozhodca v prehľade.
create or replace function referee_visible_to_category_admin(target_referee_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from category_admins ca
    join referee_categories rc on rc.category = ca.category
    where ca.referee_id = auth.uid() and rc.referee_id = target_referee_id
  );
$$;

create policy "referee_categories_select_visible_referee" on referee_categories
  for select using (referee_visible_to_category_admin(referee_id));

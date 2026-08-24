-- Admin práva obmedzené na konkrétnu kategóriu (napr. "admin len pre Východ").
-- Používateľ s role='admin' v tabuľke referees zostáva super-adminom (vidí/spravuje všetko).
create table if not exists category_admins (
  referee_id uuid not null references referees(id) on delete cascade,
  category text not null check (category in ('celostatny', 'vychod', 'stred', 'zapad', 'bratislava')),
  primary key (referee_id, category)
);

alter table category_admins enable row level security;

create policy "category_admins_select" on category_admins
  for select using (auth.uid() = referee_id or is_admin());

-- len super-admin môže prideľovať/odoberať admin práva (nie regionálni admini sami sebe)
create policy "category_admins_admin_write" on category_admins
  for all using (is_admin()) with check (is_admin());

create or replace function is_category_admin(target_category text)
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

-- regionálny admin potrebuje vidieť profily rozhodcov vo "svojej" kategórii
create policy "referees_select_category_admin" on referees
  for select using (
    exists (
      select 1 from referee_categories rc
      where rc.referee_id = referees.id and is_category_admin(rc.category)
    )
  );

-- regionálny admin potrebuje vidieť a spravovať dostupnosť vo "svojej" kategórii
create policy "availability_select_category_admin" on availability
  for select using (is_category_admin(category));
create policy "availability_update_category_admin" on availability
  for update using (is_category_admin(category));
create policy "availability_delete_category_admin" on availability
  for delete using (is_category_admin(category));

-- regionálny admin potrebuje spravovať hracie dni vo "svojej" kategórii
create policy "match_days_insert_category_admin" on match_days
  for insert with check (is_category_admin(category));
create policy "match_days_delete_category_admin" on match_days
  for delete using (is_category_admin(category));

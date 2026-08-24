-- Hracie dni určené administrátorom (rozhodcovia zadávajú dostupnosť len na tieto dni)
create table if not exists match_days (
  id uuid primary key default gen_random_uuid(),
  match_date date not null unique,
  created_at timestamptz not null default now()
);

alter table match_days enable row level security;

-- vidia všetci prihlásení rozhodcovia, upravuje len admin
create policy "match_days_select_authenticated" on match_days
  for select using (auth.uid() is not null);

create policy "match_days_insert_admin" on match_days
  for insert with check (is_admin());
create policy "match_days_delete_admin" on match_days
  for delete using (is_admin());

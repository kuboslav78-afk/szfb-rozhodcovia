-- Kategórie rozhodcov: celoštátny + 4 regióny. Rozhodca môže patriť do viacerých naraz.
create table if not exists referee_categories (
  referee_id uuid not null references referees(id) on delete cascade,
  category text not null check (category in ('celostatny', 'vychod', 'stred', 'zapad', 'bratislava')),
  primary key (referee_id, category)
);

alter table referee_categories enable row level security;

create policy "referee_categories_select" on referee_categories
  for select using (auth.uid() = referee_id or is_admin());

-- admin môže spravovať čokoľvek, vrátane udelenia "celoštátny" štatútu
create policy "referee_categories_admin_write" on referee_categories
  for all using (is_admin()) with check (is_admin());

-- rozhodca si môže sám pridať/odobrať SVOJE regióny (nie "celoštátny" - ten udeľuje len admin)
create policy "referee_categories_self_region_insert" on referee_categories
  for insert with check (auth.uid() = referee_id and category <> 'celostatny');
create policy "referee_categories_self_region_delete" on referee_categories
  for delete using (auth.uid() = referee_id and category <> 'celostatny');

-- existujúcich rozhodcov predvolene zaraď ako celoštátnych
insert into referee_categories (referee_id, category)
select id, 'celostatny' from referees
on conflict do nothing;

-- hracie dni aj dostupnosť teraz patria ku konkrétnej kategórii
alter table match_days add column if not exists category text not null default 'celostatny'
  check (category in ('celostatny', 'vychod', 'stred', 'zapad', 'bratislava'));
alter table match_days drop constraint if exists match_days_match_date_key;
alter table match_days add constraint match_days_date_category_key unique (match_date, category);

alter table availability add column if not exists category text not null default 'celostatny'
  check (category in ('celostatny', 'vychod', 'stred', 'zapad', 'bratislava'));
alter table availability drop constraint if exists availability_referee_id_available_date_key;
alter table availability add constraint availability_referee_date_category_key
  unique (referee_id, available_date, category);

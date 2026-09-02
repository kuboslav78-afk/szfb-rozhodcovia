-- Nominačný modul (interná vec pre KRO) — jednotlivé zápasy naimportované zo szfb.sk,
-- s dvoma slotmi na rozhodcu a samostatným stavom pre každý slot.
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('celostatny', 'vychod', 'stred', 'zapad', 'bratislava')),
  league text not null, -- kód ligy (MEX, ZEX, M1, ...), zodpovedá LEAGUES_BY_CATEGORY
  external_competition_id text not null, -- szfb.sk ID súťaže (napr. "1241")
  external_match_id text not null, -- szfb.sk ID zápasu (napr. "137181") — kľúč na dedup pri re-importe
  round text, -- napr. "1. kolo"
  team_home text not null,
  team_away text not null,
  match_date date not null,
  match_time time,
  venue text,
  referee1_id uuid references referees(id) on delete set null,
  referee1_status text not null default 'draft' check (referee1_status in ('draft', 'sent', 'confirmed', 'rejected')),
  referee2_id uuid references referees(id) on delete set null,
  referee2_status text not null default 'draft' check (referee2_status in ('draft', 'sent', 'confirmed', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (external_competition_id, external_match_id)
);

alter table matches enable row level security;

-- vidí a spravuje len super admin alebo admin danej kategórie (KRO)
create policy "matches_select_admin" on matches
  for select using (is_admin() or is_category_admin(category));

create policy "matches_write_admin" on matches
  for all using (is_admin() or is_category_admin(category))
  with check (is_admin() or is_category_admin(category));

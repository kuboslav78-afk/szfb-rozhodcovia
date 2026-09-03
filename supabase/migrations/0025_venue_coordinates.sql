-- Cache geokódovaných súradníc hál (podľa textu venue z matches), aby sme
-- nemuseli pri každom výpočte kolízie rozhodcu volať geokódovaciu službu
-- (má prísny rate limit) — súradnice hál sa v čase prakticky nemenia.
create table if not exists venue_coordinates (
  venue text primary key,
  lat double precision not null,
  lng double precision not null,
  geocoded_at timestamptz not null default now()
);

alter table venue_coordinates enable row level security;

create policy "venue_coordinates_select_all" on venue_coordinates
  for select using (true);

create policy "venue_coordinates_write_admin" on venue_coordinates
  for all using (is_admin()) with check (is_admin());

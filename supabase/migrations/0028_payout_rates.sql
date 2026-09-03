-- Sadzobnik odmien. Odmena za zapas je dana ligou; typ zmluvy urcuje, ako sa
-- vyplaca, a pri SZCO ci sa pripocita priplatok za cestu mimo mesta bydliska.
--
-- Dobrovolnicka zmluva sa nevyplaca sumou priamo - vykaz dobrovolnickej cinnosti
-- ju sklada z nahrady straty casu (hodiny x minimalna hodinova mzda) a stravneho.
-- Hodiny sa dopocitavaju spatne tak, aby sucet vysiel na volunteer_fee.
create table if not exists league_rates (
  league text primary key,
  -- Hruby/cisty cas je dany predpisom sutaze, nie jednotlivym zapasom. Seed dava
  -- vsade 'hruby' - treba prejst podla predpisov SZFB a opravit, kde sa hra cisty.
  time_type text not null default 'hruby' check (time_type in ('hruby', 'cisty')),
  -- SZCO a ramcova prikazna (suma je pre oba typy rovnaka)
  fee numeric(6, 2),
  -- Len SZCO: priplatok, ked rozhodca cestuje mimo mesta bydliska
  travel_supplement numeric(6, 2),
  -- Dobrovolnicka zmluva
  volunteer_fee numeric(6, 2),
  volunteer_meal numeric(6, 2),
  volunteer_max_per_day integer,
  updated_at timestamptz not null default now()
);

alter table league_rates enable row level security;

create policy "league_rates_select_authenticated" on league_rates
  for select using (auth.uid() is not null);
create policy "league_rates_write_admin" on league_rates
  for all using (is_admin()) with check (is_admin());

create table if not exists payout_settings (
  key text primary key,
  value numeric not null,
  updated_at timestamptz not null default now()
);

alter table payout_settings enable row level security;

create policy "payout_settings_select_authenticated" on payout_settings
  for select using (auth.uid() is not null);
create policy "payout_settings_write_admin" on payout_settings
  for all using (is_admin()) with check (is_admin());

-- 5,259 EUR/hod overene spatne zo vsetkych riadkov vykazu (21,036 / 4 hod atd.).
insert into payout_settings (key, value) values ('min_hourly_wage', 5.259)
on conflict (key) do nothing;

-- Mesto, od ktoreho sa posudzuje cesta "mimo mesta bydliska". Pri SZCO je to
-- sidlo firmy, nie bydlisko - dodava ekonomicky usek. Volna adresa v profile sa
-- na porovnavanie nehodi, preto samostatny stlpec.
alter table referees add column if not exists home_city text;

-- Mesto haly. KRO ho uz priraduje rucne pri geokodovani, len sa doteraz neukladalo.
alter table venue_coordinates add column if not exists city text;

insert into league_rates (league, time_type, fee, travel_supplement, volunteer_fee, volunteer_meal, volunteer_max_per_day)
values
  ('MEX', 'hruby', 60.00, 48.00, null, null, null),
  ('ZEX', 'hruby', 40.00, 48.00, null, null, null),
  ('JEX', 'hruby', 40.00, 38.00, null, null, null),
  ('M1', 'hruby', 40.00, 38.00, null, null, null),
  ('Z1', 'hruby', 25.00, 38.00, null, null, null),
  ('DO-ZA', 'hruby', 16.00, null, null, null, null),
  ('DO-VY', 'hruby', 16.00, null, null, null, null),
  ('SZY-U15', 'hruby', 10.00, null, null, null, null),
  ('DOR-BA', 'hruby', 16.00, null, 16.00, 1.54, 5),
  ('DOR-ST', 'hruby', 16.00, null, 16.00, 1.54, 5),
  ('DOR-VY', 'hruby', 16.00, null, 16.00, 1.54, 5),
  ('DOR-ZA', 'hruby', 16.00, null, 16.00, 1.54, 5),
  ('DORK-BA', 'hruby', 12.00, null, 12.00, 1.48, 6),
  ('DORK-ZA', 'hruby', 12.00, null, 12.00, 1.48, 6),
  ('JUN-BA', 'hruby', 16.00, null, 16.00, 1.54, 5),
  ('JUN-ST', 'hruby', 16.00, null, 16.00, 1.54, 5),
  ('JUN-VY', 'hruby', 16.00, null, 16.00, 1.54, 5),
  ('JUN-ZA', 'hruby', 16.00, null, 16.00, 1.54, 5),
  ('JUNK-BA', 'hruby', 12.00, null, 12.00, 1.48, 6),
  ('JUNK-VY', 'hruby', 12.00, null, 12.00, 1.48, 6),
  ('JUNK-ZA', 'hruby', 12.00, null, 12.00, 1.48, 6),
  ('M2-BA', 'hruby', 25.00, null, 25.00, 3.97, 3),
  ('M2-ST', 'hruby', 25.00, null, 25.00, 3.97, 3),
  ('M2-VY', 'hruby', 25.00, null, 25.00, 3.97, 3),
  ('M2-ZA', 'hruby', 25.00, null, 25.00, 3.97, 3),
  ('MZ-BA', 'hruby', 10.00, null, 10.00, 0.80, 6),
  ('MZ-ST', 'hruby', 10.00, null, 10.00, 0.80, 6),
  ('MZ-VY', 'hruby', 10.00, null, 10.00, 0.80, 6),
  ('MZ-ZA', 'hruby', 10.00, null, 10.00, 0.80, 6),
  ('MZK-BA', 'hruby', 8.00, null, 8.00, 0.90, 6),
  ('MZK-VY', 'hruby', 8.00, null, 8.00, 0.90, 6),
  ('MZK-ZA', 'hruby', 8.00, null, 8.00, 0.90, 6),
  ('PM-BA', 'hruby', 8.00, null, 8.00, 0.90, 6),
  ('PM-ZA', 'hruby', 8.00, null, 8.00, 0.90, 6),
  ('PS-BA', 'hruby', 8.00, null, 8.00, 0.90, 6),
  ('PS-ZA', 'hruby', 8.00, null, 8.00, 0.90, 6),
  ('PSD-ST', 'hruby', 8.00, null, 8.00, 0.90, 6),
  ('SZ-BA', 'hruby', 12.00, null, 12.00, 1.48, 6),
  ('SZ-ST', 'hruby', 12.00, null, 12.00, 1.48, 6),
  ('SZ-VY', 'hruby', 12.00, null, 12.00, 1.48, 6),
  ('SZ-ZA', 'hruby', 12.00, null, 12.00, 1.48, 6),
  ('SZK-BA', 'hruby', 10.00, null, 10.00, 0.80, 6),
  ('SZK-VY', 'hruby', 10.00, null, 10.00, 0.80, 6),
  ('SZK-ZA', 'hruby', 10.00, null, 10.00, 0.80, 6)
on conflict (league) do nothing;

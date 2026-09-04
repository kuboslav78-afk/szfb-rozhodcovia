-- Sadzobnik drzi obe varianty naraz. Doteraz sa ukladala len suma platna pre
-- prave nastaveny hraci cas, takze prepnutie hruby/cisty sumu nezmenilo a bolo
-- treba prepisat aj cislo -- co je presne ta chyba, ktora sa raz za cas urobi.
--
-- Teraz su v tabulke obe sumy a time_type len vybera, ktora plati. Da sa tak
-- prepnut liga aj uprostred sezony (napr. ina faza sutaze) bez zasahu do cisel.
alter table league_rates add column if not exists fee_hruby numeric(6, 2);
alter table league_rates add column if not exists fee_cisty numeric(6, 2);
alter table league_rates add column if not exists meal_hruby numeric(6, 2);
alter table league_rates add column if not exists meal_cisty numeric(6, 2);
alter table league_rates add column if not exists max_per_day_hruby integer;
alter table league_rates add column if not exists max_per_day_cisty integer;

-- Sadzby oboch variantov z vykazu dobrovolnickej cinnosti (platne od 1.1.2026).
-- Pripravky a mladsie ziacky maju v skutocnosti jedinu sadzbu -- oba varianty su
-- u nich rovnake, aby prepinac nemohol nic pokazit.
update league_rates as r set
  fee_hruby = v.fee_hruby,
  fee_cisty = v.fee_cisty,
  meal_hruby = v.meal_hruby,
  meal_cisty = v.meal_cisty,
  max_per_day_hruby = v.max_h,
  max_per_day_cisty = v.max_c,
  updated_at = now()
from (values
  ('DOR-BA', 16.00, 20.00, 1.54, 1.59, 5, 4),
  ('DOR-ST', 16.00, 20.00, 1.54, 1.59, 5, 4),
  ('DOR-VY', 16.00, 20.00, 1.54, 1.59, 5, 4),
  ('DOR-ZA', 16.00, 20.00, 1.54, 1.59, 5, 4),
  ('DORK-BA', 12.00, 15.00, 1.48, 1.85, 6, 5),
  ('DORK-ZA', 12.00, 15.00, 1.48, 1.85, 6, 5),
  ('JUN-BA', 16.00, 20.00, 1.54, 1.59, 5, 4),
  ('JUN-ST', 16.00, 20.00, 1.54, 1.59, 5, 4),
  ('JUN-VY', 16.00, 20.00, 1.54, 1.59, 5, 4),
  ('JUN-ZA', 16.00, 20.00, 1.54, 1.59, 5, 4),
  ('JUNK-BA', 12.00, 15.00, 1.48, 1.85, 6, 5),
  ('JUNK-VY', 12.00, 15.00, 1.48, 1.85, 6, 5),
  ('JUNK-ZA', 12.00, 15.00, 1.48, 1.85, 6, 5),
  ('M2-BA', 25.00, 30.00, 3.97, 6.33, 3, 2),
  ('M2-ST', 25.00, 30.00, 3.97, 6.33, 3, 2),
  ('M2-VY', 25.00, 30.00, 3.97, 6.33, 3, 2),
  ('M2-ZA', 25.00, 30.00, 3.97, 6.33, 3, 2),
  ('MZ-BA', 10.00, 13.00, 0.80, 1.43, 6, 5),
  ('MZ-ST', 10.00, 13.00, 0.80, 1.43, 6, 5),
  ('MZ-VY', 10.00, 13.00, 0.80, 1.43, 6, 5),
  ('MZ-ZA', 10.00, 13.00, 0.80, 1.43, 6, 5),
  ('MZK-BA', 8.00, 8.00, 0.90, 0.90, 6, 6),
  ('MZK-VY', 8.00, 8.00, 0.90, 0.90, 6, 6),
  ('MZK-ZA', 8.00, 8.00, 0.90, 0.90, 6, 6),
  ('PM-BA', 8.00, 8.00, 0.90, 0.90, 6, 6),
  ('PM-ZA', 8.00, 8.00, 0.90, 0.90, 6, 6),
  ('PS-BA', 8.00, 8.00, 0.90, 0.90, 6, 6),
  ('PS-ZA', 8.00, 8.00, 0.90, 0.90, 6, 6),
  ('PSD-ST', 8.00, 8.00, 0.90, 0.90, 6, 6),
  ('SZ-BA', 12.00, 15.00, 1.48, 1.85, 6, 5),
  ('SZ-ST', 12.00, 15.00, 1.48, 1.85, 6, 5),
  ('SZ-VY', 12.00, 15.00, 1.48, 1.85, 6, 5),
  ('SZ-ZA', 12.00, 15.00, 1.48, 1.85, 6, 5),
  ('SZK-BA', 10.00, 13.00, 0.80, 1.43, 6, 5),
  ('SZK-VY', 10.00, 13.00, 0.80, 1.43, 6, 5),
  ('SZK-ZA', 10.00, 13.00, 0.80, 1.43, 6, 5)
) as v(league, fee_hruby, fee_cisty, meal_hruby, meal_cisty, max_h, max_c)
where r.league = v.league;

-- Pri regionalnych sutaziach je odmena pre SZCO a ramcovu prikaznu rovnaka ako
-- dobrovolnicka, takze sa tiez riadi variantom -- samostatne 'fee' by sa s nim
-- rozchadzalo. Zostava len pre celostatne sutaze, ktore varianty nemaju.
update league_rates set fee = null where fee_hruby is not null;

alter table league_rates drop column if exists volunteer_fee;
alter table league_rates drop column if exists volunteer_meal;
alter table league_rates drop column if exists volunteer_max_per_day;

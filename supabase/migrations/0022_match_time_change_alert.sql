-- Keď re-import zo szfb.sk zistí, že sa čas zápasu zmenil oproti tomu, čo už
-- máme uložené, označíme to — v appke sa to zvýrazní, kým to admin nepotvrdí.
alter table matches add column if not exists previous_match_time time;
alter table matches add column if not exists time_changed_at timestamptz;

-- Tretí stav dostupnosti: "obmedzene dostupný" + voliteľný dôvod
alter table availability drop constraint if exists availability_status_check;
alter table availability add constraint availability_status_check
  check (status in ('available', 'unavailable', 'limited'));

alter table availability add column if not exists reason text;

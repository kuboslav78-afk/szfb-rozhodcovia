-- Časové okno dostupnosti pri stave "obmedzene dostupný"
alter table availability add column if not exists available_from time;
alter table availability add column if not exists available_to time;

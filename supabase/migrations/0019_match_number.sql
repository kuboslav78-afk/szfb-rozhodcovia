-- Oficiálne číslo zápasu zo szfb.sk (súvislé číslovanie naprieč celou sezónou danej
-- súťaže) — potrebné do nominácie aj na výplaty rozhodcov.
alter table matches add column if not exists match_number integer;

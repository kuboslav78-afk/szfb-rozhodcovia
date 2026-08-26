-- Umožni administrátorovi označiť domáci región celoštátneho rozhodcu priamo ako
-- "celostatny" (čisto informatívne v admin tabuľke — appka celoštátnych rozhodcov
-- aj tak vždy rozpoznáva cez ich referee_categories členstvo, nie cez home_region).
-- Self-service voľba (chooseHomeRegion) zostáva obmedzená len na skutočné regióny.
alter table referees drop constraint if exists referees_home_region_check;
alter table referees add constraint referees_home_region_check
  check (home_region is null or home_region in ('vychod', 'stred', 'zapad', 'bratislava', 'celostatny'));

update referees
set home_region = 'celostatny'
where home_region is null
  and id in (select referee_id from referee_categories where category = 'celostatny');

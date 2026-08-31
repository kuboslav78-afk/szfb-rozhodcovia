-- Doteraz videl ktorýkoľvek prihlásený rozhodca hracie dni VŠETKÝCH kategórií (aj
-- celoštátnej) priamym dotazom na databázu — appka mu ich nikdy nezobrazila, ale
-- politika to reálne nezakazovala. Teraz vidí len kategórie, ku ktorým patrí
-- (alebo ktoré spravuje ako admin).
drop policy if exists "match_days_select_authenticated" on match_days;

create policy "match_days_select_own_category" on match_days
  for select using (
    is_admin()
    or is_viewer()
    or is_category_admin(category)
    or exists (
      select 1 from referee_categories rc
      where rc.referee_id = auth.uid() and rc.category = match_days.category
    )
  );

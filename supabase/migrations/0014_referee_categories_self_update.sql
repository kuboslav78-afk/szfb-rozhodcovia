-- Bug: rozhodca s viac ako jedným "extra" regiónom (napr. celoštátny + dva regióny)
-- dostal 500-ku pri opätovnom kliknutí na región, ktorý už má — self-service upsert
-- v setMyRegion() spadne do UPDATE vetvy (ON CONFLICT), na ktorú chýbala RLS politika
-- (existovala len pre insert/delete). Bez nej Postgres zamietne aj no-op upsert.
create policy "referee_categories_self_region_update" on referee_categories
  for update
  using (auth.uid() = referee_id and category <> 'celostatny')
  with check (auth.uid() = referee_id and category <> 'celostatny');

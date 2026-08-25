-- Bug: kategóriový admin (nie super-admin) videl v referee_categories len svoj vlastný
-- riadok, takže v prehľade nevidel ostatných rozhodcov vo "svojej" kategórii.
-- Potrebuje vidieť VŠETKY referee_categories riadky pre kategóriu, ktorú spravuje.
create policy "referee_categories_select_category_admin" on referee_categories
  for select using (is_category_admin(category));

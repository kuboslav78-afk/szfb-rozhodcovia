-- Preventívna oprava tej istej triedy chyby ako pri referee_categories (0014):
-- match_days malo insert/delete politiky, ale žiadnu update — ak by upsert v
-- setMatchDay() narazil na už existujúci (match_date, category) riadok (napr. pri
-- zastaranej stránke alebo súbehu dvoch adminov), Postgres by potreboval update
-- vetvu ON CONFLICT a bez politiky by to spadlo na tú istú 500-ku.
create policy "match_days_update_admin" on match_days
  for update using (is_admin()) with check (is_admin());

create policy "match_days_update_category_admin" on match_days
  for update using (is_category_admin(category)) with check (is_category_admin(category));

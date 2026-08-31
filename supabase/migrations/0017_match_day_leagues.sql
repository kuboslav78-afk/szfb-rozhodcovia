-- Ktoré konkrétne ligy (napr. MEX, Z1, ...) sa v daný hrací deň hrajú — zatiaľ len
-- pre celoštátnu kategóriu (zoznam líg je natvrdo v kóde, nie v samostatnej tabuľke,
-- keďže sa mení zriedka a len admin ho vypĺňa). Existujúce update politiky pre
-- match_days (is_admin / is_category_admin) platia pre celý riadok, takže netreba
-- žiadnu novú RLS politiku.
alter table match_days add column if not exists leagues text[] not null default '{}';

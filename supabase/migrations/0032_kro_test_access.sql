-- Celá KRO (komisia rozhodcov a observerov) má vidieť banku otázok aj výsledky
-- všetkých rozhodcov. Upravovať banku a spúšťať modul zostáva na super adminovi.
--
-- Za člena KRO považujeme každého, kto má administratívny prístup: super admina,
-- viewer účet a kohokoľvek s riadkom v category_admins — teda aj tých členov
-- komisie, ktorí majú kategórie len na nahliadnutie.
create or replace function is_kro()
returns boolean
language sql
security definer
stable
as $$
  select
    is_admin()
    or is_viewer()
    or exists (select 1 from category_admins where referee_id = auth.uid());
$$;

-- Banka otázok vrátane správnych odpovedí. Bežný rozhodca na tieto tabuľky
-- naďalej nemá prístup — otázky mu vydáva get_test_questions() bez príznaku
-- správnosti, inak by si odpoveď prečítal cez konzolu prehliadača.
create policy "test_questions_select_kro" on test_questions
  for select using (is_kro());
create policy "test_answers_select_kro" on test_answers
  for select using (is_kro());

-- Výsledky všetkých rozhodcov.
drop policy if exists "test_assignments_own" on test_assignments;
create policy "test_assignments_own_or_kro" on test_assignments
  for select using (referee_id = auth.uid() or is_kro());

drop policy if exists "test_responses_own" on test_responses;
create policy "test_responses_own_or_kro" on test_responses
  for select using (
    is_kro()
    or exists (
      select 1 from test_assignments a
      where a.id = test_responses.assignment_id and a.referee_id = auth.uid()
    )
  );

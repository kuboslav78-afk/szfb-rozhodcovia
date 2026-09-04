-- Členstvo v KRO je samostatný údaj, nie odvodenina od kategóriového prístupu.
-- Ten majú aj ľudia, ktorí komisii pomáhajú s nomináciami (napr. nominačné
-- oddelenie) — tí testy robiť majú a banku otázok vidieť nemajú.
alter table referees add column if not exists kro_member boolean not null default false;

-- Zloženie komisie podľa stránky KRO (predseda + členovia).
update referees set kro_member = true
where full_name in (
  'Jakub Kučera',
  'Peter Vrba',
  'Peter Zámečnik',
  'Tomáš Juhás',
  'Roman Sklenica',
  'Tomáš Beňo'
);

-- is_kro() sa odteraz pýta na príznak. Viewer účty (prezentačné pre vedenie SZFB)
-- ostávajú zahrnuté — nič nevypĺňajú a majú vidieť všetko.
create or replace function is_kro()
returns boolean
language sql
security definer
stable
as $$
  select
    is_admin()
    or is_viewer()
    or exists (
      select 1 from referees
      where id = auth.uid() and kro_member
    );
$$;

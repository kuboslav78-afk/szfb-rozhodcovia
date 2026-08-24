-- Žiadosť o zrušenie dostupnosti (keď je zmena priamo zamknutá < 5 dní pred termínom)
alter table availability add column if not exists cancel_requested boolean not null default false;
alter table availability add column if not exists cancel_requested_at timestamptz;

-- admin potrebuje vedieť schváliť (zmazať riadok) alebo zamietnuť (vrátiť flag) žiadosť ktoréhokoľvek rozhodcu
create policy "availability_admin_update" on availability
  for update using (is_admin());
create policy "availability_admin_delete" on availability
  for delete using (is_admin());

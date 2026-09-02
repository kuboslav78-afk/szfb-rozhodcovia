-- Rozhodca smie vidieť (nie priamo upravovať) zápasy, kde je nominovaný ako
-- rozhodca 1 alebo rozhodca 2 — aby si vedel v appke pozrieť a potvrdiť/zamietnuť
-- svoje vlastné nominácie.
create policy "matches_select_own_nomination" on matches
  for select using (referee1_id = auth.uid() or referee2_id = auth.uid());

-- SECURITY DEFINER funkcia namiesto priameho UPDATE práva pre rozhodcov:
-- rozhodca smie zmeniť len stav vlastného slotu, a len ak bol odoslaný ('sent').
create or replace function respond_to_nomination(p_match_id uuid, p_response text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ref1 uuid;
  v_ref2 uuid;
  v_status1 text;
  v_status2 text;
begin
  if p_response not in ('confirmed', 'rejected') then
    raise exception 'Neplatná odpoveď.';
  end if;

  select referee1_id, referee2_id, referee1_status, referee2_status
    into v_ref1, v_ref2, v_status1, v_status2
    from matches
    where id = p_match_id
    for update;

  if not found then
    raise exception 'Zápas neexistuje.';
  end if;

  if v_ref1 = v_uid and v_status1 = 'sent' then
    update matches set referee1_status = p_response, updated_at = now() where id = p_match_id;
  elsif v_ref2 = v_uid and v_status2 = 'sent' then
    update matches set referee2_status = p_response, updated_at = now() where id = p_match_id;
  else
    raise exception 'Túto nomináciu nemôžeš potvrdiť ani zamietnuť.';
  end if;
end;
$$;

grant execute on function respond_to_nomination(uuid, text) to authenticated;

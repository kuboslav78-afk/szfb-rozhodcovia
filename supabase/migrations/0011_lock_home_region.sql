-- Existujúca "referees_update_own" politika povoľuje rozhodcovi meniť ktorýkoľvek
-- stĺpec svojho riadku, takže samotné RLS pravidlo pre home_region z migrácie 0010
-- bolo v skutočnosti neúčinné (permissive politiky sa kombinujú cez OR). Doplň
-- to poriadnym triggerom, ktorý zablokuje zmenu už nastaveného domáceho regiónu
-- rozhodcom samotným (admin cez service_role kľúč — bez auth.uid() — prejde).
create or replace function prevent_self_home_region_change()
returns trigger
language plpgsql
as $$
begin
  if OLD.home_region is not null
     and NEW.home_region is distinct from OLD.home_region
     and auth.uid() = OLD.id
     and not is_admin() then
    raise exception 'Domáci región už je nastavený — zmenu môže urobiť len administrátor.';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_prevent_self_home_region_change on referees;
create trigger trg_prevent_self_home_region_change
  before update on referees
  for each row execute procedure prevent_self_home_region_change();

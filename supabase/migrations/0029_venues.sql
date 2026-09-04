-- Adresár športových hál zo szfb.sk (/sk/sport-complex). Sú to všetky haly, v
-- ktorých sa počas ročníka hrá, takže sa sťahujú všetky naraz — nie len tie, čo
-- sa práve vyskytujú v zápasoch.
--
-- Adresu haly potrebuje výkaz činnosti k príkaznej zmluve (stĺpec "miesto konania
-- - ŠH" je tam povinný údaj) a mesto rozhoduje o príplatku pri SZČO.
create table if not exists venues (
  -- Názov presne ako na szfb.sk, vrátane prípony 'kategória X'.
  name text primary key,
  -- Normalizovaný názov na párovanie s matches.venue: bez diakritiky, úvodzoviek,
  -- interpunkcie a prípony 'kategória X'. Ten istý text sa píše raz s čiarkou a raz
  -- bez nej ("ŠH Malina Malacky" vs "ŠH Malina, Malacky"), preto nestačí presná zhoda.
  match_key text not null,
  street text,
  city text,
  updated_at timestamptz not null default now()
);

create index if not exists venues_match_key_idx on venues (match_key);

alter table venues enable row level security;

-- Adresár nie je citlivý údaj — číta ho každý prihlásený, mení len super admin.
create policy "venues_select_authenticated" on venues
  for select using (auth.uid() is not null);
create policy "venues_write_admin" on venues
  for all using (is_admin()) with check (is_admin());

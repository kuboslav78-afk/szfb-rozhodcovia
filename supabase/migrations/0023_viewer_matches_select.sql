-- Viewer rola (napr. prezentačný účet pre vedenie SZFB) doteraz nemala
-- RLS prístup k tabuľke matches vôbec — Nominácie im v appke ukazovali
-- "0 zápasov", hoci dáta existujú. Pridávame read-only prístup.
create policy "matches_select_viewer" on matches
  for select using (is_viewer());

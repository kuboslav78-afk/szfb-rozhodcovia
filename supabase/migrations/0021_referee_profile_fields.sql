-- Rozšírenie profilu rozhodcu: kontaktné/zmluvné údaje a veľkosti výstroja.
-- Všetko voliteľné (rozhodca si to dopĺňa sám), chránené existujúcou RLS na
-- tabuľke referees (vidí/upravuje len vlastný riadok, admin vidí všetko).
alter table referees add column if not exists address text;
alter table referees add column if not exists date_of_birth date;
alter table referees add column if not exists birth_number text; -- rodné číslo, pre rámcovú príkaznú zmluvu
alter table referees add column if not exists bank_account text; -- IBAN na výplaty
alter table referees add column if not exists jersey_size text;
alter table referees add column if not exists shorts_size text;
alter table referees add column if not exists socks_size text;
alter table referees add column if not exists photo_path text; -- cesta v storage buckete referee-photos
alter table referees add column if not exists criminal_record_path text; -- cesta v storage buckete referee-documents
alter table referees add column if not exists criminal_record_uploaded_at timestamptz;

-- Súkromné storage buckety — fotka aj výpis z registra trestov sú vždy
-- neverejné, prístupné len vlastníkovi a adminovi cez signed URL.
insert into storage.buckets (id, name, public)
values ('referee-photos', 'referee-photos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('referee-documents', 'referee-documents', false)
on conflict (id) do nothing;

-- Konvencia cesty: "<auth.uid()>/<súbor>" — RLS porovnáva prvý priečinok s auth.uid().
create policy "referee_photos_select_own_or_admin" on storage.objects
  for select using (
    bucket_id = 'referee-photos'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
create policy "referee_photos_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'referee-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "referee_photos_update_own" on storage.objects
  for update using (
    bucket_id = 'referee-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "referee_photos_delete_own" on storage.objects
  for delete using (
    bucket_id = 'referee-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "referee_documents_select_own_or_admin" on storage.objects
  for select using (
    bucket_id = 'referee-documents'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
create policy "referee_documents_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'referee-documents' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "referee_documents_update_own" on storage.objects
  for update using (
    bucket_id = 'referee-documents' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "referee_documents_delete_own" on storage.objects
  for delete using (
    bucket_id = 'referee-documents' and (storage.foldername(name))[1] = auth.uid()::text
  );

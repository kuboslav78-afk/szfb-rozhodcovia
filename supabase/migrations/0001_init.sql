-- Rozhodcovia (rozširujú auth.users o meno, kontakt a rolu)
create table if not exists referees (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  license_level text,
  role text not null default 'referee' check (role in ('admin', 'referee')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Dostupnosť rozhodcov po dňoch
create table if not exists availability (
  id uuid primary key default gen_random_uuid(),
  referee_id uuid not null references referees(id) on delete cascade,
  available_date date not null,
  status text not null check (status in ('available', 'unavailable')),
  note text,
  updated_at timestamptz not null default now(),
  unique (referee_id, available_date)
);

alter table referees enable row level security;
alter table availability enable row level security;

create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from referees where id = auth.uid() and role = 'admin'
  );
$$;

-- referees: každý vidí svoj profil, admin vidí všetky
create policy "referees_select_own_or_admin" on referees
  for select using (auth.uid() = id or is_admin());
create policy "referees_update_own" on referees
  for update using (auth.uid() = id);

-- availability: rozhodca vidí/zapisuje len svoje záznamy, admin vidí všetko (len na čítanie)
create policy "availability_select" on availability
  for select using (auth.uid() = referee_id or is_admin());
create policy "availability_insert_own" on availability
  for insert with check (auth.uid() = referee_id);
create policy "availability_update_own" on availability
  for update using (auth.uid() = referee_id);
create policy "availability_delete_own" on availability
  for delete using (auth.uid() = referee_id);

-- pri registrácii nového rozhodcu automaticky vytvor profil
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.referees (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

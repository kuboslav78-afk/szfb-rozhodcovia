# Dátumovka a dostupnosť rozhodcov

Prvý portál v rámci projektu [`szfb-rozhodcovia`](../README.md) — kalendár dostupnosti rozhodcov SZFB.

Postavené na Next.js (App Router, TypeScript, Tailwind) so Supabase ako backendom (DB + auth). Klienti sú v [`src/lib/supabase`](./src/lib/supabase).

## Dátový model

Definovaný v [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql):

- `referees` — profil rozhodcu (naviazaný na `auth.users`), rola `admin`/`referee`
- `availability` — dostupnosť rozhodcu po jednotlivých dňoch (`available`/`unavailable`)

RLS: rozhodca vidí a upravuje len svoje záznamy, admin vidí dostupnosť všetkých (kalendárový prehľad).

## Nastavenie Supabase

1. Vytvor nový projekt na [supabase.com](https://supabase.com).
2. V SQL editore projektu spusti obsah [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql).
3. Skopíruj `.env.local.example` do `.env.local` a doplň `NEXT_PUBLIC_SUPABASE_URL` a `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Project Settings → API).
4. Prvého admina nastav ručne po registrácii: `update referees set role = 'admin' where email = '...';`

## Getting Started

```bash
npm run dev
```

Otvor [http://localhost:3000](http://localhost:3000).

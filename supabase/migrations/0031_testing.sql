-- Testovacia platforma: banka otázok, z ktorej každý rozhodca dostane na týždeň
-- náhodných 10.
--
-- Kľúčové obmedzenie: rozhodca sa nesmie dostať k tomu, ktorá odpoveď je správna.
-- RLS je riadková, nie stĺpcová, takže na tabuľku s odpoveďami nedostane prístup
-- vôbec — otázky mu vydá a test vyhodnotí SECURITY DEFINER funkcia nižšie.

create table if not exists test_questions (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  -- Odkaz na video k hernej situácii (YouTube/Vimeo). Voliteľné.
  video_url text,
  -- Vysvetlenie správnej odpovede — rozhodca ho uvidí až po odoslaní testu.
  explanation text,
  -- Voľné zaradenie (hracia plocha, herné situácie, disciplinárka…).
  topic text,
  -- Číslo pravidla, z ktorého otázka vychádza (napr. "101").
  rule_reference text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists test_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references test_questions(id) on delete cascade,
  answer text not null,
  is_correct boolean not null default false,
  position integer not null default 0
);

create index if not exists test_answers_question_idx on test_answers (question_id);

-- Týždenný test. week_start je pondelok príslušného týždňa, takže sa na jedného
-- rozhodcu a týždeň dá založiť len jeden.
create table if not exists test_assignments (
  id uuid primary key default gen_random_uuid(),
  referee_id uuid not null references referees(id) on delete cascade,
  week_start date not null,
  question_ids uuid[] not null,
  created_at timestamptz not null default now(),
  submitted_at timestamptz,
  score integer,
  unique (referee_id, week_start)
);

create table if not exists test_responses (
  assignment_id uuid not null references test_assignments(id) on delete cascade,
  question_id uuid not null references test_questions(id) on delete cascade,
  answer_id uuid references test_answers(id) on delete set null,
  is_correct boolean not null default false,
  primary key (assignment_id, question_id)
);

alter table test_questions enable row level security;
alter table test_answers enable row level security;
alter table test_assignments enable row level security;
alter table test_responses enable row level security;

-- Banku otázok spravuje len super admin. Rozhodca na ňu nemá priamy prístup ani
-- na čítanie — otázky dostane cez funkciu, ktorá správne odpovede odfiltruje.
create policy "test_questions_admin" on test_questions
  for all using (is_admin()) with check (is_admin());
create policy "test_answers_admin" on test_answers
  for all using (is_admin()) with check (is_admin());

-- Rozhodca vidí svoje testy a ich výsledky, admin vidí všetky.
create policy "test_assignments_own" on test_assignments
  for select using (referee_id = auth.uid() or is_admin());
create policy "test_responses_own" on test_responses
  for select using (
    is_admin()
    or exists (
      select 1 from test_assignments a
      where a.id = test_responses.assignment_id and a.referee_id = auth.uid()
    )
  );

/**
 * Pondelok týždňa, do ktorého dátum patrí.
 */
create or replace function week_monday(d date)
returns date
language sql
immutable
as $$
  select d - ((extract(isodow from d)::int) - 1);
$$;

/**
 * Vráti (a ak treba, založí) test rozhodcu na aktuálny týždeň. Otázky sa vyberajú
 * náhodne, ale prednosť majú tie, ktoré rozhodca ešte nikdy nedostal — aby sa
 * pri malej banke nezacyklili tie isté.
 */
create or replace function ensure_weekly_test()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_week date := week_monday(current_date);
  v_id uuid;
  v_questions uuid[];
begin
  if v_uid is null then
    raise exception 'Pre túto akciu sa musíš prihlásiť.';
  end if;

  select id into v_id
    from test_assignments
    where referee_id = v_uid and week_start = v_week;

  if found then
    return v_id;
  end if;

  select array_agg(q.id) into v_questions
  from (
    select q.id
    from test_questions q
    left join (
      select distinct unnest(question_ids) as question_id
      from test_assignments
      where referee_id = v_uid
    ) seen on seen.question_id = q.id
    where q.active
      and exists (select 1 from test_answers a where a.question_id = q.id and a.is_correct)
    order by (seen.question_id is not null), random()
    limit 10
  ) q;

  if v_questions is null or array_length(v_questions, 1) = 0 then
    raise exception 'V banke zatiaľ nie sú žiadne otázky.';
  end if;

  insert into test_assignments (referee_id, week_start, question_ids)
  values (v_uid, v_week, v_questions)
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function ensure_weekly_test() to authenticated;

/**
 * Otázky testu aj s možnosťami, ale bez informácie, ktorá je správna. Po odoslaní
 * testu už funkcia pridá aj vyhodnotenie a vysvetlenie.
 */
create or replace function get_test_questions(p_assignment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_assignment test_assignments%rowtype;
  v_submitted boolean;
begin
  select * into v_assignment from test_assignments where id = p_assignment_id;

  if not found then
    raise exception 'Test neexistuje.';
  end if;

  if v_assignment.referee_id <> v_uid and not is_admin() then
    raise exception 'Toto nie je tvoj test.';
  end if;

  v_submitted := v_assignment.submitted_at is not null;

  return (
    select coalesce(jsonb_agg(item order by item->>'position'), '[]'::jsonb)
    from (
      select jsonb_build_object(
        'id', q.id,
        'position', idx,
        'question', q.question,
        'videoUrl', q.video_url,
        'topic', q.topic,
        'ruleReference', q.rule_reference,
        -- Vysvetlenie a správnosť až po odoslaní.
        'explanation', case when v_submitted then q.explanation end,
        'chosenAnswerId', r.answer_id,
        'isCorrect', case when v_submitted then r.is_correct end,
        'answers', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'id', a.id,
            'answer', a.answer,
            'isCorrect', case when v_submitted then a.is_correct end
          ) order by a.position, a.id), '[]'::jsonb)
          from test_answers a where a.question_id = q.id
        )
      ) as item
      from unnest(v_assignment.question_ids) with ordinality as u(qid, idx)
      join test_questions q on q.id = u.qid
      left join test_responses r
        on r.assignment_id = v_assignment.id and r.question_id = q.id
    ) items
  );
end;
$$;

grant execute on function get_test_questions(uuid) to authenticated;

/**
 * Odoslanie testu. Vyhodnotenie prebieha tu, na serveri — klient posiela len
 * dvojice otázka/odpoveď a nemá ako zistiť správne riešenie dopredu.
 */
create or replace function submit_test(p_assignment_id uuid, p_answers jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_assignment test_assignments%rowtype;
  v_score integer := 0;
begin
  select * into v_assignment from test_assignments where id = p_assignment_id for update;

  if not found then
    raise exception 'Test neexistuje.';
  end if;

  if v_assignment.referee_id <> v_uid then
    raise exception 'Toto nie je tvoj test.';
  end if;

  if v_assignment.submitted_at is not null then
    raise exception 'Tento test už bol odoslaný.';
  end if;

  insert into test_responses (assignment_id, question_id, answer_id, is_correct)
  select
    v_assignment.id,
    (elem->>'questionId')::uuid,
    nullif(elem->>'answerId', '')::uuid,
    coalesce(
      (select a.is_correct from test_answers a where a.id = nullif(elem->>'answerId', '')::uuid),
      false
    )
  from jsonb_array_elements(p_answers) as elem
  where (elem->>'questionId')::uuid = any (v_assignment.question_ids)
  on conflict (assignment_id, question_id) do update
    set answer_id = excluded.answer_id, is_correct = excluded.is_correct;

  select count(*) into v_score
  from test_responses
  where assignment_id = v_assignment.id and is_correct;

  update test_assignments
    set submitted_at = now(), score = v_score
    where id = v_assignment.id;

  return v_score;
end;
$$;

grant execute on function submit_test(uuid, jsonb) to authenticated;

-- Modul sa rozhodcom sprístupní až vtedy, keď KRO prejde banku otázok. Dovtedy
-- ho vidí len administrátor a rozhodcovia majú v menu naďalej "Čoskoro".
create table if not exists app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table app_settings enable row level security;

create policy "app_settings_select_authenticated" on app_settings
  for select using (auth.uid() is not null);
create policy "app_settings_write_admin" on app_settings
  for all using (is_admin()) with check (is_admin());

insert into app_settings (key, value) values ('testing_enabled', 'false')
on conflict (key) do nothing;

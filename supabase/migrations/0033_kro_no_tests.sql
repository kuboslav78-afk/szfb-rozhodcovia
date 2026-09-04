-- Členovia KRO testy nerobia — komisia banku otázok pripravuje a vyhodnocuje,
-- takže by si test vypĺňala sama pred sebou a navyše vidí správne odpovede.
-- Test sa im preto vôbec nezaloží.
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

  if is_kro() then
    raise exception 'Členovia KRO testy nevypĺňajú.';
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

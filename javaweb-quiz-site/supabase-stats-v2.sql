-- 请复制本文件全部内容并一次性运行，不要只运行 create function 的前半段。
-- 在 Supabase SQL Editor 中可先按 Ctrl+A，再点击 Run。

alter table public.quiz_events
add column if not exists question_type text;

create index if not exists quiz_events_visitor_subject_idx
on public.quiz_events (visitor_id, subject);

create index if not exists quiz_events_subject_question_idx
on public.quiz_events (subject, question_id);

create or replace function public.get_quiz_dashboard(
    p_visitor_id text,
    p_subject text default null
)
returns jsonb
language sql
security definer
set search_path = public
as $$
with filtered as (
    select *
    from public.quiz_events
    where p_subject is null or subject = p_subject
),
per_question as (
    select
        visitor_id,
        question_id,
        bool_or(correct) as mastered
    from filtered
    group by visitor_id, question_id
),
per_visitor as (
    select
        visitor_id,
        count(*)::int as answered_questions,
        count(*) filter (where mastered)::int as correct_questions,
        round(
            100.0 * count(*) filter (where mastered) /
            nullif(count(*), 0),
            1
        ) as accuracy
    from per_question
    group by visitor_id
),
ranked as (
    select
        visitor_id,
        answered_questions,
        correct_questions,
        accuracy,
        dense_rank() over (
            order by correct_questions desc, accuracy desc, answered_questions desc
        )::int as rank
    from per_visitor
),
type_stats as (
    select
        coalesce(question_type, 'unknown') as question_type,
        count(*)::int as attempts,
        count(*) filter (where correct)::int as correct_answers,
        round(
            100.0 * count(*) filter (where correct) /
            nullif(count(*), 0),
            1
        ) as accuracy
    from filtered
    where visitor_id = p_visitor_id
    group by coalesce(question_type, 'unknown')
),
leaderboard as (
    select coalesce(
        jsonb_agg(
            jsonb_build_object(
                'rank', rank,
                'anonymous_id',
                    'A-' || upper(substr(regexp_replace(visitor_id, '[^a-zA-Z0-9]', '', 'g'), 1, 8)),
                'answered_questions', answered_questions,
                'correct_questions', correct_questions,
                'accuracy', accuracy,
                'is_me', visitor_id = p_visitor_id
            )
            order by rank, correct_questions desc
        ),
        '[]'::jsonb
    ) as data
    from (
        select *
        from ranked
        order by rank, correct_questions desc
        limit 20
    ) top_ranked
),
own_stats as (
    select coalesce(
        (
            select jsonb_build_object(
                'rank', rank,
                'answered_questions', answered_questions,
                'correct_questions', correct_questions,
                'accuracy', accuracy
            )
            from ranked
            where visitor_id = p_visitor_id
        ),
        jsonb_build_object(
            'rank', null,
            'answered_questions', 0,
            'correct_questions', 0,
            'accuracy', 0
        )
    ) as data
),
own_type_stats as (
    select coalesce(
        jsonb_agg(
            jsonb_build_object(
                'type', question_type,
                'attempts', attempts,
                'correct_answers', correct_answers,
                'accuracy', accuracy
            )
            order by question_type
        ),
        '[]'::jsonb
    ) as data
    from type_stats
)
select jsonb_build_object(
    'anonymous_id',
        'A-' || upper(substr(regexp_replace(p_visitor_id, '[^a-zA-Z0-9]', '', 'g'), 1, 8)),
    'participants', (select count(*) from ranked),
    'own', (select data from own_stats),
    'type_stats', (select data from own_type_stats),
    'leaderboard', (select data from leaderboard)
);
$$;

revoke all on function public.get_quiz_dashboard(text, text) from public;
grant execute on function public.get_quiz_dashboard(text, text) to anon;

notify pgrst, 'reload schema';

-- 执行成功后应返回一行 JSON，而不是报错。
select public.get_quiz_dashboard('installation_check', null);

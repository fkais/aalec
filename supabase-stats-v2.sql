-- 请复制本文件全部内容并一次性运行，不要只运行 create function 的前半段。
-- 在 Supabase SQL Editor 中可先按 Ctrl+A，再点击 Run。

alter table public.quiz_events
add column if not exists question_type text;

create table if not exists public.review_subjects (
    id text primary key,
    name text not null,
    status text not null check (status in ('ready', 'reserved')),
    question_count integer not null default 0 check (question_count >= 0),
    sort_order integer not null default 0
);

insert into public.review_subjects (id, name, status, question_count, sort_order)
values
    ('javaweb', 'Java Web', 'ready', 93, 10),
    ('os', '计算机组成原理', 'reserved', 0, 20),
    ('bigdata', '大数据原理与应用', 'ready', 177, 30),
    ('se', '软件工程', 'ready', 78, 40)
on conflict (id) do update set
    name = excluded.name,
    status = excluded.status,
    question_count = excluded.question_count,
    sort_order = excluded.sort_order;

create table if not exists public.review_users (
    visitor_id text primary key,
    created_at timestamptz not null default now(),
    last_seen_at timestamptz not null default now()
);

insert into public.review_users (visitor_id)
select distinct visitor_id
from public.quiz_events
where nullif(trim(visitor_id), '') is not null
on conflict (visitor_id) do nothing;

alter table public.review_subjects enable row level security;
alter table public.review_users enable row level security;

create index if not exists quiz_events_visitor_subject_idx
on public.quiz_events (visitor_id, subject);

create index if not exists quiz_events_subject_question_idx
on public.quiz_events (subject, question_id);

create index if not exists review_users_created_at_idx
on public.review_users (created_at);

create or replace function public.register_review_user(
    p_visitor_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
    if nullif(trim(p_visitor_id), '') is null then
        raise exception 'visitor_id is required';
    end if;

    insert into public.review_users (visitor_id)
    values (p_visitor_id)
    on conflict (visitor_id) do update
    set last_seen_at = now();

    return jsonb_build_object('registered', true);
end;
$$;

create or replace function public.get_review_subjects(
    p_visitor_id text
)
returns table (
    id text,
    name text,
    status text,
    question_count integer,
    answered_count integer,
    progress numeric
)
language sql
security definer
set search_path = public
as $$
with answered as (
    select
        subject,
        count(distinct question_id)::integer as answered_count
    from public.quiz_events
    where visitor_id = p_visitor_id
    group by subject
)
select
    subjects.id,
    subjects.name,
    subjects.status,
    subjects.question_count,
    least(coalesce(answered.answered_count, 0), subjects.question_count)::integer,
    case
        when subjects.question_count = 0 then 0
        else round(
            100.0 * least(coalesce(answered.answered_count, 0), subjects.question_count)
            / subjects.question_count,
            1
        )
    end as progress
from public.review_subjects subjects
left join answered on answered.subject = subjects.id
order by subjects.sort_order, subjects.id;
$$;

create or replace function public.get_review_users(
    p_visitor_id text
)
returns table (
    id text,
    is_current_user boolean
)
language sql
security definer
set search_path = public
as $$
select
    md5(users.visitor_id) as id,
    users.visitor_id = p_visitor_id as is_current_user
from public.review_users users
order by users.created_at, users.visitor_id;
$$;

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
revoke all on function public.register_review_user(text) from public;
revoke all on function public.get_review_subjects(text) from public;
revoke all on function public.get_review_users(text) from public;
grant execute on function public.register_review_user(text) to anon;
grant execute on function public.get_review_subjects(text) to anon;
grant execute on function public.get_review_users(text) to anon;

notify pgrst, 'reload schema';

-- 执行成功后应返回一行 JSON，而不是报错。
select public.get_quiz_dashboard('installation_check', null);
select public.register_review_user('installation_check');
select * from public.get_review_subjects('installation_check');
select * from public.get_review_users('installation_check');

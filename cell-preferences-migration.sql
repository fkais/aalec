-- 用户细胞颜色多端同步迁移
-- 只新增独立偏好表和两个 RPC，不修改 quiz_events、review_users 或已有学习数据。

create table if not exists public.review_cell_preferences (
    visitor_id text primary key,
    color_id text not null default 'slate',
    updated_at timestamptz not null default now()
);

alter table public.review_cell_preferences
drop constraint if exists review_cell_preferences_color_id_check;

alter table public.review_cell_preferences
add constraint review_cell_preferences_color_id_check
check (color_id in (
    'slate', 'ink', 'cloud', 'lavender', 'clay', 'denim',
    'sage', 'mauve', 'sand', 'plum', 'steel', 'mist'
));

alter table public.review_cell_preferences enable row level security;

create or replace function public.get_review_cell_preference(
    p_visitor_id text
)
returns jsonb
language sql
security definer
set search_path = public
as $$
    select jsonb_build_object(
        'color_id',
        coalesce((
            select preference.color_id
            from public.review_cell_preferences preference
            where preference.visitor_id = p_visitor_id
        ), 'slate')
    );
$$;

create or replace function public.set_review_cell_preference(
    p_visitor_id text,
    p_color_id text
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

    if p_color_id not in (
        'slate', 'ink', 'cloud', 'lavender', 'clay', 'denim',
        'sage', 'mauve', 'sand', 'plum', 'steel', 'mist'
    ) then
        raise exception 'unsupported color_id';
    end if;

    insert into public.review_cell_preferences (visitor_id, color_id, updated_at)
    values (p_visitor_id, p_color_id, now())
    on conflict (visitor_id) do update
    set color_id = excluded.color_id,
        updated_at = excluded.updated_at;

    return jsonb_build_object('saved', true, 'color_id', p_color_id);
end;
$$;

revoke all on function public.get_review_cell_preference(text) from public;
revoke all on function public.set_review_cell_preference(text, text) from public;
grant execute on function public.get_review_cell_preference(text) to anon;
grant execute on function public.set_review_cell_preference(text, text) to anon;

notify pgrst, 'reload schema';

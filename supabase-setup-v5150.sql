-- HOMES 20周年アプリ v5.15.0 追加設定
-- いいね機能 + KENJI MODE リモート同期

create table if not exists public.anniversary_post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.anniversary_posts(id) on delete cascade,
  staff_name text not null,
  created_at timestamptz not null default now(),
  unique (post_id, staff_name)
);

alter table public.anniversary_post_likes enable row level security;
drop policy if exists "anniversary app can read likes" on public.anniversary_post_likes;
drop policy if exists "anniversary app can add likes" on public.anniversary_post_likes;
drop policy if exists "anniversary app can remove likes" on public.anniversary_post_likes;
create policy "anniversary app can read likes" on public.anniversary_post_likes for select to anon using (true);
create policy "anniversary app can add likes" on public.anniversary_post_likes for insert to anon with check (true);
create policy "anniversary app can remove likes" on public.anniversary_post_likes for delete to anon using (true);
grant select, insert, delete on public.anniversary_post_likes to anon;
grant select, insert, update, delete on public.anniversary_post_likes to service_role;
create index if not exists anniversary_post_likes_post_id_idx on public.anniversary_post_likes(post_id);

create table if not exists public.anniversary_ride_state (
  id smallint primary key default 1 check (id = 1),
  current_campus text,
  visited jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.anniversary_ride_state (id,current_campus,visited)
values (1,'神戸校','{"岐阜本部校":"09:15","岐南校":"12:40","神戸校":"14:32"}'::jsonb)
on conflict (id) do nothing;

alter table public.anniversary_ride_state enable row level security;
drop policy if exists "anniversary app can read ride state" on public.anniversary_ride_state;
drop policy if exists "kenji can update ride state" on public.anniversary_ride_state;
create policy "anniversary app can read ride state" on public.anniversary_ride_state for select to anon using (true);
create policy "kenji can update ride state" on public.anniversary_ride_state for update to anon using (id=1) with check (id=1);
grant select, update on public.anniversary_ride_state to anon;
grant select, insert, update, delete on public.anniversary_ride_state to service_role;

-- Realtime publication. 既に追加済みの場合は何もしません。
do $$ begin
  alter publication supabase_realtime add table public.anniversary_post_likes;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.anniversary_ride_state;
exception when duplicate_object then null; end $$;

notify pgrst, 'reload schema';

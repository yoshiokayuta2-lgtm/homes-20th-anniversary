-- HOMES 20周年アプリ: 最小構成
-- Supabase SQL Editor で実行してください。

create table if not exists public.anniversary_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  title text not null,
  author_name text,
  campus text,
  category text,
  drive_file_id text,
  preview_url text,
  is_public boolean not null default false,
  final_movie_candidate boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.anniversary_posts enable row level security;

-- @homes-edu.com の認証済みユーザーだけ読み書き可能。
create policy "homes staff can read posts"
on public.anniversary_posts for select
to authenticated
using ((auth.jwt() ->> 'email') like '%@homes-edu.com');

create policy "homes staff can create own posts"
on public.anniversary_posts for insert
to authenticated
with check (
  auth.uid() = user_id
  and email = (auth.jwt() ->> 'email')
  and email like '%@homes-edu.com'
);

create policy "homes staff can update own posts"
on public.anniversary_posts for update
to authenticated
using (auth.uid() = user_id and email like '%@homes-edu.com')
with check (auth.uid() = user_id and email like '%@homes-edu.com');

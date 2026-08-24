-- HOMES 20周年アプリ v4.6: シンプル社員ログイン版
-- Supabase SQL Editor でこのSQLを1回実行してください。
-- メール認証は使わず、アプリ側の「お名前＋社員共通コード」で入ります。

create table if not exists public.anniversary_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
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

alter table public.anniversary_posts alter column user_id drop not null;
alter table public.anniversary_posts alter column email drop not null;
alter table public.anniversary_posts enable row level security;

-- 旧ポリシーを整理
drop policy if exists "homes staff can read posts" on public.anniversary_posts;
drop policy if exists "homes staff can create own posts" on public.anniversary_posts;
drop policy if exists "homes staff can update own posts" on public.anniversary_posts;
drop policy if exists "anniversary app can create posts" on public.anniversary_posts;

-- GitHub Pages上の公開アプリは publishable key では anon ロールとして接続するため、
-- 非公開状態の投稿情報に限って INSERT を許可する。
create policy "anniversary app can create posts"
on public.anniversary_posts
for insert
to anon
with check (is_public = false);

-- 念のため anon にテーブル INSERT 権限を付与
grant insert on table public.anniversary_posts to anon;

-- HOMES 20周年アプリ v4.5: シンプル社員ログイン版
-- Supabase SQL Editor で1回実行してください。
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

-- 旧メール認証ポリシーを削除
drop policy if exists "homes staff can read posts" on public.anniversary_posts;
drop policy if exists "homes staff can create own posts" on public.anniversary_posts;
drop policy if exists "homes staff can update own posts" on public.anniversary_posts;
drop policy if exists "anniversary app can create posts" on public.anniversary_posts;

-- 公開サイトから投稿情報だけを追加可能にする。
-- 更新・削除は許可しない。管理操作はSupabase管理画面から行う。
create policy "anniversary app can create posts"
on public.anniversary_posts for insert
to anon
with check (is_public = false);

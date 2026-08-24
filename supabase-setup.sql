-- HOMES 20周年アプリ v4.7
-- 1回実行してください。投稿情報 + 軽量サムネイル用 Storage の設定です。

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

drop policy if exists "homes staff can read posts" on public.anniversary_posts;
drop policy if exists "homes staff can create own posts" on public.anniversary_posts;
drop policy if exists "homes staff can update own posts" on public.anniversary_posts;
drop policy if exists "anniversary app can create posts" on public.anniversary_posts;
drop policy if exists "anniversary app can read posts" on public.anniversary_posts;

create policy "anniversary app can create posts"
on public.anniversary_posts
for insert
to anon
with check (is_public = false);

create policy "anniversary app can read posts"
on public.anniversary_posts
for select
to anon
using (true);

grant insert, select on table public.anniversary_posts to anon;

-- 軽量プレビュー専用。原本写真・動画はここには置かず、後で会社Google Driveへ保存します。
insert into storage.buckets (id, name, public)
values ('anniversary-previews', 'anniversary-previews', true)
on conflict (id) do update set public = true;

drop policy if exists "anniversary previews are public" on storage.objects;
drop policy if exists "anniversary app can upload previews" on storage.objects;

create policy "anniversary previews are public"
on storage.objects
for select
to public
using (bucket_id = 'anniversary-previews');

create policy "anniversary app can upload previews"
on storage.objects
for insert
to anon
with check (bucket_id = 'anniversary-previews');

-- v5.0: Google Drive原本の管理情報
alter table public.anniversary_posts add column if not exists drive_web_view_url text;
alter table public.anniversary_posts add column if not exists original_file_name text;
alter table public.anniversary_posts add column if not exists original_mime_type text;
alter table public.anniversary_posts add column if not exists original_size bigint;

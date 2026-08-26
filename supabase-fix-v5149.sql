-- HOMES 20周年 v5.14.9 管理OVERVIEW 権限修正
-- Supabase SQL Editorで1回実行してください。何度実行しても安全です。

grant select, insert, update, delete on table public.anniversary_posts to service_role;
grant select, insert, update, delete on table public.anniversary_login_days to service_role;
grant select, insert, update, delete on table public.anniversary_today_events to service_role;
grant select, insert, update, delete on table public.anniversary_activity_events to service_role;
grant select, insert, update, delete on table public.anniversary_staff_roster to service_role;
grant select, insert, update, delete on table public.anniversary_announcements to service_role;

grant usage, select on all sequences in schema public to service_role;

notify pgrst, 'reload schema';

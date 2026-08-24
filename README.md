# HOMES 20周年アプリ v4.5

- メール認証 / Resend / SMTP をやめました。
- 初回だけ「お名前＋社員共通コード」で入るシンプル方式です。
- ログイン状態は端末に180日保存します。
- 共通コードは `supabase-config.js` の `staffCode` で変更できます（初期値: 2027）。
- Supabaseは投稿情報の保存にだけ使います。
- 既存のSupabaseプロジェクトでは `supabase-setup.sql` をSQL Editorで1回実行してください。

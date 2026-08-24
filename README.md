# HOMES 20周年アプリ v4.2

Supabase Auth 接続情報設定済み版です。

1. Supabaseで無料プロジェクトを作成
2. Project URL / Publishable Key は `supabase-config.js` に設定済み
3. Supabase SQL Editorで `supabase-setup.sql` を実行
4. Auth > URL Configuration で公開URLを Site URL / Redirect URL に登録

ログインは `@homes-edu.com` のメールリンク認証です。Supabaseのブラウザセッションを利用するため、通常は毎回ログインする必要はありません。

写真・動画原本のGoogle Drive自動保存は次段階で接続します。

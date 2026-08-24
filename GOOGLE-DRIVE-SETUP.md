# Google Drive 原本保存の初期設定（1回だけ）

保存先は会社Google Driveの以下に固定済みです。

- HOMES / 20周年 / 01_写真原本
- HOMES / 20周年 / 02_動画原本

アプリのブラウザにはGoogleのパスワードやOAuth秘密情報を置きません。
Supabase Edge Functionが会社GoogleアカウントのOAuthを使って「再開可能アップロードURL」だけを発行し、スマホは原本をGoogle Driveへ直接送ります。

## 1. Google Cloud側
1. Google Cloud Consoleでプロジェクトを1つ作成
2. Google Drive APIを有効化
3. OAuth同意画面を作成（Externalで可。テスト中は会社GoogleアカウントをTest userに追加）
4. OAuth Client IDを作成（Web application）
5. OAuth 2.0 Playground等で `https://www.googleapis.com/auth/drive.file` を承認し、会社Googleアカウントでログイン
6. Refresh Tokenを取得

## 2. Supabase Edge FunctionのSecrets
Supabase Dashboard > Edge Functions > Secrets に以下を登録します。

- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- GOOGLE_REFRESH_TOKEN
- ALLOWED_ORIGIN = https://yoshiokayuta2-lgtm.github.io
- DRIVE_PHOTO_FOLDER_ID = 1JvTL7gAtw_E2UbvuXVvgv5jNE0wpqOcZ
- DRIVE_VIDEO_FOLDER_ID = 1sKC3oue_BBMoRnPdQCiyfl86WZM5wqEc

## 3. Edge Functionをデプロイ
`supabase/functions/drive-init-upload/index.ts` を `drive-init-upload` としてデプロイします。
JWT verification は OFF にします（`supabase/config.toml` に設定済み）。

## 4. DB更新
`supabase-setup.sql` をSupabase SQL Editorで1回Runします。

## 5. GitHub Pages更新
このv5.0をGitHub Pagesへ上書きします。

## 動作
投稿時：
1. サムネイル -> Supabase Storage
2. 原本 -> 会社Google Drive
3. Drive file ID/リンク/原本名/サイズ -> anniversary_posts
4. 3まで成功したら「投稿成功」

Google Driveへの原本保存に失敗した場合は、アプリ上の投稿登録を中止します。

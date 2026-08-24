# HOMES 20周年アプリ v5.0

- サムネイル: Supabase Storage
- 原本写真: 会社Google Drive `HOMES/20周年/01_写真原本`
- 原本動画: 会社Google Drive `HOMES/20周年/02_動画原本`
- Google DriveはSupabase Edge Function + Google OAuthで安全に接続
- 原本アップロード中は進捗%を表示
- Drive保存失敗時は投稿情報を登録しない
- 投稿者名は初回ログイン名を自動使用
- 動画は横向き撮影推奨

初回設定は `GOOGLE-DRIVE-SETUP.md` を参照してください。


## v5.1
Google Drive resumable upload session initialization now sends the GitHub Pages Origin so the browser PUT upload can satisfy CORS.

- v5.2: 新着の思い出カードをタップして写真拡大／動画再生できる詳細ビューを追加。自動横スクロールがタッチ操作後に止まり続ける問題も修正。

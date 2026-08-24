# HOMES 20周年アプリ v5.7

- 動画カードをタップしても反応しない不具合を修正。
- Google Driveストリーミング用Edge Function URLの定義漏れを修正。
- PWAキャッシュをv57へ更新。

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

- v5.5: 新着の思い出カードをタップして写真拡大／動画再生できる詳細ビューを追加。自動横スクロールがタッチ操作後に止まり続ける問題も修正。


## v5.5
- 投稿成功直後の新着カード追加処理で未定義変数を参照していた不具合を修正。
- Google Drive原本名の列名を `original_file_name` 優先で読み込み、動画判定を安定化。


## v5.5
- 動画詳細をGoogle Drive埋め込みではなくEdge Function経由のHTML5 video再生に変更。
- Drive原本は非公開のまま、アプリ内からRange対応でストリーミング再生。
- 追加のSQL/Secretは不要。drive-init-upload Edge Functionの再デプロイが必要。


## v5.6
- PWA/service worker cache version bumped to homes20-v56
- app.js/styles.css/supabase-config.js use cache-busting query strings
- app shell uses network-first for HTML/JS/CSS/config so GitHub updates appear immediately

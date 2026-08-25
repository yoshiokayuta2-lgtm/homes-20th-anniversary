# HOMES 20周年アプリ v5.8

- 動画カードをタップしても反応しない不具合を修正。
- Google Driveストリーミング用Edge Function URLの定義漏れを修正。
- PWAキャッシュをv58へ更新。

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


## v5.8 追加機能
- 最終チェック済み沿革241日・300件を「今日は何の日」に反映
- ホームの TODAY IN HOMES をタップすると、その日の全出来事を表示
- 全社員のログインボーナス（1日1回、累計日数・連続日数・投稿回数）
- KENJI MODEで「今日は何の日」の有無を確認。空白日はその場で出来事を追加
- KENJI MODEに表彰用ダッシュボード（ログイン日数・投稿回数・今日ログイン人数）

### v5.8公開前に1回だけ
Supabase SQL Editor で `supabase-setup-v58.sql` を実行してください。
ログイン日数はv5.8公開後から蓄積します。既存の投稿回数はそのまま集計対象です。

## v5.9 管理者モード

- `admin.html` を追加しました。
- 投稿一覧・検索、公開ON/OFF、FINAL MOVIE候補ON/OFF、完全削除を管理できます。
- 完全削除は Edge Function 経由で、Google Drive原本 → Supabase Storageサムネ → `anniversary_posts` DB行をまとめて削除します。
- ログイン日数・投稿回数ランキングを表示します。
- KENJI MODEから追加した「今日は何の日」イベントも削除できます。

### 初回だけ必要な設定
Supabase > Edge Functions > Secrets に `ADMIN_MODE_CODE` を追加し、管理者だけが知るコードを設定してください。
その後 `supabase/functions/drive-init-upload/index.ts` を v5.9 の内容で再Deployしてください。
SQL追加はありません。

管理画面URL: `https://yoshiokayuta2-lgtm.github.io/homes-20th-anniversary/admin.html`


## v5.10
- 管理者モードの投稿一覧取得を、一般画面と同じSupabase読み取り経路に変更。
- Edge Functionの管理者APIは更新・削除専用に継続。
- admin.html / ride-admin.html をService Workerでnetwork-firstにして更新反映を安定化。


## v5.11
- 管理者モードの投稿一覧・表彰参加状況・KENJI MODE追加イベント一覧をすべてEdge Function経由に統一。
- anon権限でanniversary_posts等を直接SELECTしないため、管理データを公開側に露出しません。
- 管理者コード検証後のみ一覧取得・更新・削除が可能です。


## v5.14
- 管理者モードで投稿を完全削除した直後、表彰・参加状況も自動再集計します。
- 削除後の投稿回数が即時に反映されます。


## v5.14
- 20周年専用アプリアイコン（iPhone/PWA/maskable）
- ログイン後のホーム画面追加オンボーディング
- iPhoneは共有 → ホーム画面に追加 → 追加を案内
- Androidは対応端末でネイティブのインストールプロンプトを表示
- ホーム画面起動時は案内を表示しない
- 「あとで」は24時間だけスヌーズ。プロフィールボタンからいつでも再表示可能

## v5.14 追加機能

- 計測基盤：アプリ起動、ホーム画面起動、インストール案内表示、縦動画警告、投稿メタデータを記録
- 表彰ダッシュボード：王道 / 早期参加 / 復活 / バランス / 沿革 / ムービー / ツッコミ / 特別
- 管理TOP：参加率、ホーム画面化率、今日ログイン、今月投稿、今日は何の日カバー日数、FINAL MOVIE候補
- 未参加者フォロー：未ログイン、30日以上未ログイン、投稿0、ホーム画面未確認
- 社員名簿：管理アプリから「氏名,所属」を1行ずつ登録
- FINAL MOVIE管理：採用 / 保留 / 不採用 / メモ
- 「今日は何の日」365日カレンダー：空白日を管理アプリから追加
- お知らせ管理：一般アプリのホームに管理側から最新のお知らせを表示

### v5.14 更新手順
1. Supabase SQL Editorで `supabase-setup-v514.sql` を1回実行
2. Edge Functions > `drive-init-upload` の `index.ts` をv5.14版で上書きしてDeploy
3. GitHub Pagesをv5.14一式で上書き
4. `admin.html` で社員名簿を登録すると参加率・未ログイン抽出が正確になります

※ v5.14導入前のログイン日数・投稿回数は既存データを引き継ぎます。ホーム画面起動履歴、アプリ起動時刻、縦動画警告回数などはv5.14導入後から蓄積します。

## v5.14.2 管理ログイン安定化
- 管理画面JSを `admin.js` に分離
- `admin.html` / `admin.js` はService Workerでキャッシュせず常にネットワーク取得
- 管理ログイン画面に `BUILD v5.14.2` を表示して反映確認可能

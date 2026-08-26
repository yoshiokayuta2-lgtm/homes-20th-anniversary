# KENJI RIDE NAVIGATION 初回設定

v5.15.2から、KENJI MODEで「現在地 → 目的地」のロードバイク向けルート・距離・時間・標高・斜度を表示できます。

## 1. OpenRouteServiceのAPI Keyを作る

OpenRouteServiceで無料アカウントを作成し、API Keyを1つ発行します。

## 2. Supabase Secretに保存

Supabase Dashboard → Edge Functions → Secrets で次を追加します。

- Name: `ORS_API_KEY`
- Value: OpenRouteServiceで発行したAPI Key

既存の `ALLOWED_ORIGIN` はそのままでOKです。

## 3. Edge FunctionをDeploy

Supabase Dashboardで `ride-route` というEdge Functionを作成し、
`supabase/functions/ride-route/index.ts` の内容を貼り付けてDeployします。

CLIを使う場合は `supabase functions deploy ride-route --no-verify-jwt` でも構いません。

## 4. GitHub Pagesを更新

v5.15.2一式をリポジトリへ上書きします。

## 5. スマホで確認

1. KENJI MODEを開く
2. 目的地を選ぶ
3. 「現在地から計算」を押す
4. ブラウザの位置情報利用を「許可」
5. 地図・距離・時間・獲得標高・斜度グラフが表示されれば完了

### 注意
- GPSはHTTPS上で利用します。GitHub PagesはHTTPSなので問題ありません。
- 現在地はSupabase DBには保存しません。ルート計算のためEdge FunctionからOpenRouteServiceへ送られるだけです。
- 標高は地形データをもとにした概算、斜度は約100m区間の標高差から平滑化して算出した目安です。
- 走行中の安全のため、操作は停車時に行ってください。

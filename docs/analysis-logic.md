# 分析機能のロジック

## 週次レポート
- **入力**: 指定期間（from〜to）の **デイリー分析結果**（`analysis_results` type=`daily`）
- **処理**: 各日の `payload`（emotions, thoughtType, comment）を1行テキストにし、日付順で連結
- **AI**: 上記テキストを Gemini `generateWeeklyOrMonthlyAnalysis` に渡し、thoughtPatterns / emotionTrend / stressSources / summary を生成
- **保存**: `analysis_results` に type=`weekly`, period_from/to で保存

## 月次レポート
- **入力**: 週次と同じ。指定月の **デイリー分析結果**（`analysis_results` type=`daily`）
- **処理**: 週次と同じフォーマットでテキスト化
- **AI**: 同上（type=monthly として渡す）
- **制限**: 同一月で既に生成済みの場合は 429（月1回まで）

## 年次レポート（設計）

### 対象期間
- **定義**: 現時点（東京タイムゾーン）から **さかのぼり12ヶ月** の「1年」とする。
  - 例: 2026年2月13日時点 → 対象は 2025年3月1日 〜 2026年2月28日（当月は末日まで）。
  - 実装時は `date-utils` に `getLast12MonthsRangeInTokyo(): { from: string; to: string }` を追加し、月初〜末日の範囲を返す想定。
- フロントはこの `from` / `to` をそのまま POST に載せる（月次と同様）。未指定の場合はサーバ側で上記範囲を計算してもよい。

### 入力
- **生日記・日次分析は使わない**。トークン節約のため **週次・月次レポートの payload のみ** を入力とする。
  - 取得: 対象期間内の `analysis_results` の `type in ('weekly', 'monthly')` を `period_from` / `period_to` で絞り、`created_at` 昇順で並べる。
  - **月次が12件未満のとき**: ある分だけをそのまま使う。月次だけでは入力が薄い場合は **週次レポートを補完** して入力に含める（例: 月次が3件しかない → 同じ期間の週次を最大 N 件まで追加し、入力テキストを組む）。これにより、利用開始から数ヶ月のユーザーでも年次レポートを生成できる。
  - 各レポートから `summary` と `thoughtPatterns`（必要なら `emotionTrend` / `stressSources` の要約）をテキスト化して連結。1件あたり summary を 200〜300 文字に truncate するなどして、**合計入力が 4,000 文字前後** に収まるようにする（目安: 入力 2,000 トークン以内）。レポート数が少ない場合は truncate を緩めてよい。
  - 月次レポートが12件に満たないユーザーに対しては、分析前に直近12ヶ月の月次レポートが12件未満であることを伝える

### 処理
- **AI**: 年次専用のプロンプトで「年間の傾向・パターン・ストレス源の変化・1年を振り返ってのまとめ」を生成する。`lib/gemini.ts` に `generateYearlyAnalysis(inputSummary: string, periodFrom, periodTo): Promise<YearlyPayload>` を追加する想定。出力スキーマは週次/月次と似た `thoughtPatterns` / `emotionTrend` / `stressSources` / `summary` のほか、必要なら `highlights`（月ごとのハイライト）などを検討。
- **保存**: `analysis_results` に `type='yearly'`, `period_from` / `period_to`, `payload` を 1 件 insert。

### 制限
- **年1回まで**: 同じ対象期間（同じ `from`–`to`）で既に yearly が存在する場合は 429。または「直近12ヶ月」をキーにし、その範囲の yearly が1件でもあれば 429 とする（仕様で選択）。
- **依存**: 対象期間内に **週次または月次レポートが 1 件以上** 必要。0 件の場合は 400 で「対象期間に週次・月次レポートがありません」などと返す（フロントではその旨を表示し、生成ボタンを非表示または無効化してもよい）。
- **月次12件未満でも生成可**: 過去12ヶ月の月次が 2 件や 5 件しかなくても、上記「入力」のとおり週次で補完して入力を組むため、**1件以上あれば生成を許可** する。品質は「データ量に応じた振り返り」としてプロンプトで調整する（例: 件数が少ない場合は「限られた期間の傾向」としてまとめる旨を AI に伝える）。

### API
- **POST /api/v1/analysis/generate**  
  - body: `{ type: "yearly", from?: string, to?: string }`  
  - `from` / `to` 省略時はサーバで「直近12ヶ月」を計算。  
  - 成功時 200 + `{ period, payload, createdAt }`。  
- **GET /api/v1/analysis?type=yearly**  
  - 既存どおり取得用として利用。

### 現状
- 上記設計に基づき **実装済み**。`POST /api/v1/analysis/generate` の `type=yearly`、`date-utils` の `getLast12MonthsRangeInTokyo`、`lib/gemini.ts` の `generateYearlyAnalysis`、分析ページの年次タブで利用可能。

## 人格サマリー
- **入力**: 既存の **週次・月次レポート**（`analysis_results` type=`weekly` または `monthly`）最大20件の payload
- **処理**: 各レポートの `summary` と `thoughtPatterns` をテキスト化して連結
- **AI**: `generatePersonalitySummary` に渡し、tendency / strengths / weaknesses / downTriggers / recoveryActions を生成
- **制限**: 週1回まで（checkCooldown 7日）
- **依存**: 週次または月次レポートが1件以上必要

## 問いかけ
- **入力**: 最新1件の **人格サマリー**（`analysis_results` type=`personality`）の payload
- **処理**: `tendency` と `downTriggers` を連結
- **AI**: `generateQuestions` に渡し、問いかけ文の配列を生成
- **制限**: 週1回まで
- **依存**: 人格サマリーが1件以上必要（人格サマリー生成時に問いかけも同時生成される）

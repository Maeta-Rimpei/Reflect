# ふりかえり保存時の分析遅延 改修方針

## 背景

- 現状、`/api/v1/entries` で「保存」と「日次AI分析」が同一リクエスト内で直列実行される。
- そのため、Gemini 応答が遅いケースでは保存完了レスポンスまで 10 秒程度かかる。
- ユーザー体験としては「保存が遅い」と認識される。

## 原因（現状整理）

### サーバー側

- `app/api/v1/entries/route.ts` の `POST` で以下を直列実行している。
  1. `entries` / `moods` 保存
  2. `generateJournalAnalysis(text)` 実行
  3. `analysis_results` / `emotion_tags` 保存
  4. レスポンス返却
- ボトルネックは外部API呼び出しである `generateJournalAnalysis`。
- 追加で DB 書き込みも複数回あり、遅延に上乗せされる。

### クライアント側

- `components/journal-page.tsx` の `handleSave` は `/api/v1/entries` の完了まで待機するため、分析完了時間がそのまま待ち時間になる。

## 改修ゴール

- 保存操作の体感速度を改善し、保存完了を 1 秒前後で返せる構成にする。
- AI分析失敗時も保存成功は維持し、分析のみリトライ可能にする。
- 既存の再試行導線（`/api/v1/analysis/generate`）を活用し、影響範囲を最小化する。

## 方針（採用案）

## 1. 保存と分析の責務分離

- `/api/v1/entries` は「保存専用」に変更する。
  - 実施: `entries` / `moods` 保存、必要最小限のレスポンス返却
  - 非実施: `generateJournalAnalysis` 実行、`analysis_results` 書き込み
- 日次分析は別APIで実行する。
  - 既存の `/api/v1/analysis/generate` (`type: "daily"`) を呼び出す。

## 2. クライアントは二段階フローに変更

- `handleSave` の流れを以下に変更する。
  1. `/api/v1/entries` で保存
  2. 保存成功後に `/api/v1/analysis/generate` を呼ぶ
  3. 分析結果が返れば画面に反映
  4. 分析失敗時は「保存済み + 再試行導線表示」を維持

## 3. 段階的導入（小さく安全に）

- 既存機能を流用するため、新規エンドポイントは原則追加しない。
- まず同期分析を外すだけで体感を改善し、その後必要なら非同期ジョブ化を検討する。

## 実装タスク（具体）

## A. `app/api/v1/entries/route.ts`

- 削除・変更:
  - `generateJournalAnalysis` 呼び出しを削除
  - `analysis_results` / `emotion_tags` への書き込みを削除
  - レスポンス `dailyAnalysis` を常に `null`（または項目自体削除）に整理
- 維持:
  - 認証、当日重複チェック、`entries` 保存、`moods` 保存

## B. `components/journal-page.tsx`

- `handleSave` 修正:
  - 保存 API 成功後、即座に `todayEntry` を更新
  - 続けて `/api/v1/analysis/generate` を実行
  - 返却 payload を `normalizeAnalysis` して `analysis` へ反映
- エラーハンドリング:
  - 保存失敗: 従来通り保存失敗表示
  - 分析失敗: 「保存は成功」扱いで `analysisError` を表示し、既存の再試行ボタンを出す
- 表示状態:
  - 「保存中」と「分析中」を必要なら分離（最低限は既存 `isAnalyzing` を分析フェーズ中心に利用）

## C. ログ計測（任意だが推奨）

- `entries POST` に処理時間ログを追加:
  - auth
  - db precheck
  - insert
  - response
- `analysis/generate` にも処理時間ログを追加:
  - entry fetch
  - llm
  - db write
- 目的: 改修前後で P50/P95 の遅延比較が可能になる。

## 受け入れ条件（Definition of Done）

- 保存クリック後、保存API応答時間が分析時間の影響を受けない。
- 分析が遅い/失敗しても、保存済み状態は維持される。
- 分析再試行（Type A / Type B）が従来どおり動作する。
- 既存の日次・週次・月次フローが壊れない。

## テスト観点

- 正常系:
  - 新規保存成功 -> 分析成功 -> 結果表示
- 異常系:
  - 保存成功 -> 分析失敗 -> エラー表示 + 再試行可能
  - 保存失敗 -> 保存失敗表示（分析は呼ばれない）
  - 429（本日投稿済み）時の表示維持
- 境界:
  - free/deep それぞれで保存・再分析導線が崩れない
  - 暗号化有効時でも分析APIで復号して正常動作

## リスクと対策

- リスク: 画面上「保存済みだが分析未反映」の時間が増える
  - 対策: 分析中インジケータと文言を明確化
- リスク: 連打で分析APIを重複実行
  - 対策: 分析中は再実行を抑止（`isAnalyzing`/`isRetrying` でガード）
- リスク: 既存レスポンス依存コードの破壊
  - 対策: `dailyAnalysis` の null 許容をフロントで保証

## 将来拡張（次フェーズ）

- 真の非同期化（Queue/Worker）:
  - 保存時に分析ジョブを enqueue
  - バックグラウンドで `analysis_results` 更新
  - UI はポーリングまたは SSE で結果受信
- LLM タイムアウト導入:
  - 例: 5 秒で打ち切り、失敗時は再試行へ誘導


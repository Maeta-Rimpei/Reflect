# 退会と Deep（Stripe サブスク）の扱い 設計

## 背景・問題

- 現状、`DELETE /api/v1/me/delete` は **`users.deleted_at` の論理削除のみ**で、Stripe を呼ばない。
- Deep 加入中にそのまま退会すると、**アプリには入れなくなるが Stripe の課金が残る**可能性がある（利用規約上の「返金なし」とは別に、ユーザーから見て不親切・クレーム要因になる）。

## ゴール

- **利用者にとって最も親切なのは、退会完了と同時に（または退会の一連の操作の中で）サブスクを終了させること**。
- それが**技術的・運用上むずかしい場合の最低ライン**は、**「解約（または Stripe 上でサブスクが終了した状態）になるまで退会できない」**ようにし、課金だけ残る状態を防ぐこと。

---

## 方針の比較

| 方針 | ユーザー体験 | 実装・運用 | 備考 |
|------|----------------|------------|------|
| **A. 退会時に自動解約** | ワンストップで完了できる | Stripe API でサブスクを取消 → 成功後に論理削除。失敗時は退会しない | **推奨（親切さ優先）** |
| **B. 解約するまで退会不可** | 先にポータルで解約 → 状態反映後に退会 | DB / Stripe の状態を確認してゲート。自動解約ロジックは不要 | 実装は単純だが手順が増える |
| **C. 退会は許可し Stripe は触らない** | 悪い（現状に近い） | — | 採用しない |

---

## 推奨: 方針 A（退会時の自動解約）

### フロー（概要）

1. 退会 API 実行時、認証済みユーザーの **`subscriptions` に有効な Stripe サブスク**（例: `stripe_subscription_id` があり、`status` が `active` / `trialing`）があるか判定する。
2. **ある場合**: `stripe.subscriptions.cancel(subscriptionId)` を**サーバーから**実行する（**即時取消**を推奨。退会後はログイン不可のため、期間末まで `active` のままにする意味がない）。
3. **Stripe API が成功したら**（または「もともとサブスク行がない / 既に取消済み」なら）既存どおり **`users.deleted_at` を設定**する。
4. **Stripe API が失敗したら** `deleted_at` は立てず、**4xx/5xx と分かりやすいメッセージ**で失敗を返す（「しばらくしてから再度」「サポートに連絡」など）。

### Webhook との関係

- `customer.subscription.deleted` が後から届き、`subscriptions.status` が `canceled` に更新される想定（既存 Webhook のまま活きる）。
- **順序**: 先に `cancel` → その後 `deleted_at`。Webhook が遅延しても、**課金停止は `cancel` 成功時点で効く**（Stripe 側の仕様）。

### 即時取消の注意（プロダクト・法務）

- 即時取消は**日割り・返金ポリシー**は Stripe ダッシュボードの設定に依存する。利用規約の「退会時の返金」文言と整合させる。
- 「親切」と「事業ポリシー」が矛盾する場合は、**即時ではなく `cancel_at_period_end` のみ自動**などに落とす選択肢もあるが、その場合**退会後も期間終了まで課金が残る**ように見えるため、**UI と規約の説明を必ずセット**にする。

### エッジケース

| ケース | 扱い |
|--------|------|
| DB に `stripe_subscription_id` があるが Stripe 側は既に削除済み | `retrieve` / `cancel` が 404 等 → **退会は許可**（冪等に近づける） |
| 同一ユーザーに複数サブスク行（通常はない想定） | 設計上は **有効なものをすべて取消**するか、**1 行前提**をドキュメント化 |
| レース（退会連打） | `deleted_at` 済みなら 401/404 でよい（既存の認証・ユーザー状態に依存） |

---

## フォールバック: 方針 B（解約完了まで退会不可）

方針 A が**難しい**（例: コンプライアンスで自動取消が禁止、Stripe 連携を退会 API に載せたくない）場合の最低ライン。

### フロー（概要）

1. 退会ボタン押下時または退会 API 内で、**Deep 相当の有料状態**か判定する（例: `users.plan === 'deep'` かつ `subscriptions.status` が `active` / `trialing`、または Stripe に同期した結果が同様）。
2. 該当する場合は **`deleted_at` を立てず**、`409` や専用エラーコードで返す。
3. フロントでは **「Deep プランを解約したあとに退会できます」** と表示し、**Customer Portal へのリンク**（既存の `create-portal-session`）を出す。
4. 解約後は既存の **`sync-subscription`** または次回ページ表示で DB が更新され、**再度退会**できるようにする。

### 方針 B の弱点

- ユーザーがポータルで解約した直後、**Webhook / 同期の遅れ**でまだ `active` のままなら、一時的に「退会できない」ことがある。**リトライ文言**や **sync の実行タイミング**の検討が必要。

---

## 実装時の参照箇所（メモ）

- 退会: `app/api/v1/me/delete/route.ts`
- Stripe クライアント: `lib/stripe.ts`
- サブスク行: `subscriptions`（`stripe_subscription_id`, `status`）
- Webhook（取消後の DB 同期）: `app/api/webhooks/stripe/route.ts` の `customer.subscription.deleted`
- 手動同期: `app/api/stripe/sync-subscription/route.ts`
- UI: `components/settings-page.tsx`（退会ダイアログ）

---

## 決定事項

- [x] 採用: **A（退会時に `stripe.subscriptions.cancel` で即時解約 → 成功後に論理削除）**
- [x] 自動解約は **即時 `cancel`**（返金・日割りは Stripe / 規約側の設定に依存）
- [ ] 方針 B（ゲート）は **未採用**（必要になったら別途検討）

### 実装メモ

- `app/api/v1/me/delete/route.ts` … `subscriptions` が `active` / `trialing` かつ `stripe_subscription_id` があるとき、先に解約 API を呼ぶ
- `lib/stripe-withdrawal.ts` … 解約と「既に解約済み」判定のヘルパー

---

## 関連ドキュメント

- 利用規約・特商法の「解約・退会・返金」（文言との整合）

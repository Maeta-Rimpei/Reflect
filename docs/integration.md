# 外部サービス連携（Supabase / NextAuth / Gemini / Stripe）

## 認証（NextAuth）

本プロジェクトは **NextAuth（Auth.js）** を採用する。Google ログインのコールバックは自アプリの URL になるため、「〇〇にログイン」には自ドメインが表示される。Supabase Auth は使わない。スマホアプリ展開時に Supabase Auth を検討する。

### 環境変数

- `AUTH_SECRET` … 必須。トークン暗号化用。`npx auth secret` で生成する。
- `AUTH_GOOGLE_ID` … Google Cloud Console で作成した OAuth 2.0 クライアント ID。
- `AUTH_GOOGLE_SECRET` … 上記クライアントのシークレット。

### Google の設定

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) で OAuth 2.0 クライアント ID（ウェブアプリケーション）を作成する。
2. 承認済みの JavaScript 生成元にアプリのオリジン（例: `http://localhost:3000`、本番ドメイン）を追加する。
3. 承認済みのリダイレクト URI に **自アプリのコールバック URL** を追加する。例: `http://localhost:3000/api/auth/callback/google`、本番は `https://<ドメイン>/api/auth/callback/google`。
4. Client ID と Client Secret を `.env.local` の `AUTH_GOOGLE_ID` と `AUTH_GOOGLE_SECRET` に設定する。

### 実装の所在

- 設定: `auth.ts`（NextAuth の設定・Google プロバイダー・コールバック）。
- ルート: `app/api/auth/[...nextauth]/route.ts`。
- ログイン UI: `signIn("google", { callbackUrl: "/journal" })` を呼ぶ（`components/auth/sign-in-panel.tsx` 等）。
- セッション: サーバーでは `auth()`（`auth.ts` から export）、クライアントでは `useSession()`。API は Cookie でセッションを読む。Bearer トークンは使わない。

---

## Supabase（DB 専用）

認証には使わない。**データベース（Postgres）およびストレージ等のバックエンドとしてのみ利用する。** スマホアプリ展開時に Supabase Auth を検討するまでは、RLS による `auth.uid()` は使わず、API ルートで NextAuth のセッションから user id を取得し、Supabase は Secret key（または Service Role key）でアクセスして `user_id` 条件でクエリする。

### 環境変数

- `NEXT_PUBLIC_SUPABASE_URL` … プロジェクトの URL。
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` … Publishable key（`sb_publishable_xxx`）。クライアントから Supabase を直接叩く場合はこれを使う。本アプリでは API 経由でしか DB に触れないため、未設定でもよい。
- `SUPABASE_SECRET_KEY` または `SUPABASE_SERVICE_ROLE_KEY` … サーバー側で RLS をバイパスして DB を更新する際に必須。Stripe Webhook や各 API ルートで使用する。

### DB・スキーマ

- NextAuth 採用時は `docs/supabase-schema-nextauth.sql` を実行する。`users.id` は TEXT（NextAuth の user id。例: Google の sub）であり、`auth.users` への参照は存在しない。
- 既存の `docs/supabase-schema.sql` は Supabase Auth 用である。NextAuth に移行したら `supabase-schema-nextauth.sql` に切り替える。

### Webhook（Stripe）

- Stripe の Webhook は `createSupabaseAdminClient()` で `users.plan` と `subscriptions` を更新する。`metadata.user_id` は NextAuth の user id（TEXT）とする。

---

## Google（OAuth のみ）

NextAuth の Google プロバイダー用に、Google Cloud Console で OAuth 2.0 クライアントを作成する。Supabase Dashboard に Google を設定する必要はない。

---

## Gemini（AI 分析）

- `.env.local` に `GEMINI_API_KEY` を設定する。
- 日記の日次分析・週次/月次レポート・人格サマリー・問いかけ生成で利用する（`lib/gemini.ts`、`/api/v1/entries`、`/api/v1/analysis/generate`）。

---

## Stripe（Deep プラン課金）

### 環境変数

| 変数名 | 説明 |
|--------|------|
| `STRIPE_SECRET_KEY` | シークレットキー（sk_test_xxx / sk_live_xxx） |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | 公開キー |
| `STRIPE_DEEP_PRICE_ID` | Deep プラン用の価格 ID（price_xxx） |
| `STRIPE_WEBHOOK_SECRET` | Webhook 署名検証用（whsec_xxx） |

### Stripe 側の準備

1. 商品・価格を Stripe Dashboard で作成し、価格 ID を `STRIPE_DEEP_PRICE_ID` に設定する。
2. Webhook エンドポイントを追加する。URL: `https://<ドメイン>/api/webhooks/stripe`。イベント: `checkout.session.completed`、`customer.subscription.updated`、`customer.subscription.deleted`。Signing secret を `STRIPE_WEBHOOK_SECRET` に設定する。

### アプリ側の流れ

- アップグレード: 設定画面から `POST /api/stripe/create-checkout-session` を呼び、返却 URL へリダイレクトする。完了後は `/settings?success=1` に戻る。
- 解約・利用明細: `POST /api/stripe/create-portal-session` を呼び、Stripe Billing Portal にリダイレクトする。
- Webhook: Stripe が `/api/webhooks/stripe` を呼び、`users.plan` と `subscriptions` を更新する。Supabase の Secret key（または Service Role key）が必要である。

---

## まとめ

| サービス | 用途 | 必須 env |
|----------|------|----------|
| NextAuth | 認証（Google） | `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` |
| Supabase | DB のみ（認証は使わない） | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY` または `SUPABASE_SERVICE_ROLE_KEY` |
| Google | OAuth（NextAuth 経由） | 上記 AUTH_GOOGLE_* |
| Gemini | 日記・分析 AI | `GEMINI_API_KEY` |
| Stripe | Deep プラン課金・解約・ポータル | `STRIPE_*`, `STRIPE_WEBHOOK_SECRET` |

---

## 実装の所在（本プロジェクト）

- **認証:** `auth.ts`（NextAuth 設定）、`app/api/auth/[...nextauth]/route.ts`。ログイン/サインアップは `signIn("google", { callbackUrl: "/journal" })`。セッションは `auth()`（サーバー）・`useSession()`（クライアント）で取得する。
- **API 認証:** 各 API ルートで `auth()` によりセッションを取得し、未認証なら 401 を返す。Supabase は `createSupabaseAdminClient()` でアクセスし、`session.user.id` で `user_id` を付与する。
- **Supabase:** `lib/supabase-admin.ts` でサーバー専用クライアントを用意する。RLS は使わず、API 内で必ず `user_id` を条件に含める。
- **Gemini:** `lib/gemini.ts`。`POST /api/v1/entries`（日記保存＋日次分析）、`POST /api/v1/analysis/generate` で利用する。
- **Stripe:** `app/api/stripe/create-checkout-session/route.ts`、`create-portal-session/route.ts`、`app/api/webhooks/stripe/route.ts`。設定画面は `components/settings-page.tsx` から上記 API を呼ぶ。
- **DB スキーマ:** NextAuth 採用時は `docs/supabase-schema-nextauth.sql` を Supabase SQL Editor で実行する。

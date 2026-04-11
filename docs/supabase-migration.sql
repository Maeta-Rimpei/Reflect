-- Reflect: Supabase 統合マイグレーション（新規セットアップまたは不足分の追加用）
-- 実行: Supabase Dashboard → SQL Editor で実行。
-- 既存DBで users.id が UUID の場合は、先に UUID→TEXT 移行を別途実行すること。
-- テーブル・カラム・インデックスは IF NOT EXISTS で冪等。ポリシーは存在しなければ作成。

-- ---------------------------------------------------------------------------
-- 1. テーブル定義
-- ---------------------------------------------------------------------------

-- users: アプリ用ユーザーとプラン（NextAuth の user id と 1:1）
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  email TEXT,
  name TEXT,
  password_hash TEXT,
  email_verified BOOLEAN NOT NULL DEFAULT true,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'deep')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

COMMENT ON COLUMN public.users.deleted_at IS '論理削除日時。設定されている場合はログイン不可。';

-- entries: ふりかえり（日記）
CREATE TABLE IF NOT EXISTS public.entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  posted_at DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, posted_at)
);

CREATE INDEX IF NOT EXISTS idx_entries_user_posted ON public.entries (user_id, posted_at);
CREATE INDEX IF NOT EXISTS idx_entries_user_created ON public.entries (user_id, created_at DESC);

-- moods: 気分（自己申告）
CREATE TABLE IF NOT EXISTS public.moods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  entry_id UUID REFERENCES public.entries(id) ON DELETE SET NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- analysis_results: 分析結果（daily / weekly / monthly / yearly / personality / question）
CREATE TABLE IF NOT EXISTS public.analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('daily', 'weekly', 'monthly', 'yearly', 'personality', 'question')),
  period_from DATE,
  period_to DATE,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- prompt_version: 既存テーブルに追加（CREATE 後なので ALTER で）
ALTER TABLE public.analysis_results
  ADD COLUMN IF NOT EXISTS prompt_version TEXT;

COMMENT ON COLUMN public.analysis_results.prompt_version IS '分析生成時のプロンプトバージョン（例: weekly-v2）。NULL は導入前の結果。';

CREATE INDEX IF NOT EXISTS idx_analysis_results_user_type_period ON public.analysis_results (user_id, type, period_from);
CREATE INDEX IF NOT EXISTS idx_analysis_results_user_type_created ON public.analysis_results (user_id, type, created_at DESC);

-- emotion_tags: 感情タグ（AI 推定）
CREATE TABLE IF NOT EXISTS public.emotion_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  entry_id UUID NOT NULL REFERENCES public.entries(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emotion_tags_user_entry ON public.emotion_tags (user_id, entry_id);
CREATE INDEX IF NOT EXISTS idx_emotion_tags_user_created ON public.emotion_tags (user_id, created_at);

-- subscriptions: Stripe メタデータ（プラン判定は users.plan が唯一のソース）
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT,
  current_period_end TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- magic_link_tokens: メール認証用トークン
CREATE TABLE IF NOT EXISTS public.magic_link_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_magic_link_tokens_token ON public.magic_link_tokens (token);
CREATE INDEX IF NOT EXISTS idx_magic_link_tokens_email ON public.magic_link_tokens (email);

-- contact_requests: お問い合わせ（ユーザー→運営）
CREATE TABLE IF NOT EXISTS public.contact_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('bug', 'billing', 'account', 'feature', 'other')),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_requests_created ON public.contact_requests (created_at DESC);

-- quota_usage: 機能別の利用回数（ユーザー × 集計期間 × キー）
-- 例: quota_key = 'monthly_daily_journal_regeneration' … Deep 向け「成功後の日次再分析」の月次上限（東京暦月 YYYY-MM を period に格納）
-- 将来ほかの制限も quota_key を増やして同一テーブルで扱う。
CREATE TABLE IF NOT EXISTS public.quota_usage (
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  quota_key TEXT NOT NULL,
  period TEXT NOT NULL,
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, quota_key, period)
);

COMMENT ON TABLE public.quota_usage IS 'ユーザーごとのクォータ消費回数。period の意味は quota_key ごとに定義（例: 東京暦月 YYYY-MM）。';
COMMENT ON COLUMN public.quota_usage.quota_key IS '制限の種類。例: monthly_daily_journal_regeneration = 日次ふりかえり成功後の再分析（東京暦月あたりの回数上限）';
COMMENT ON COLUMN public.quota_usage.period IS '集計期間キー。当面は東京の暦月 YYYY-MM。';

-- ---------------------------------------------------------------------------
-- 2. 既存テーブルへの追加カラム（既存DBでテーブルが先に作られている場合用）
-- ---------------------------------------------------------------------------

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- メール+パスワードログインのブルートフォース対策（連続失敗で一時ロック）
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS password_failed_attempts INTEGER NOT NULL DEFAULT 0
  CHECK (password_failed_attempts >= 0);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS password_locked_until TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.users.password_failed_attempts IS '連続メール・パスワードログイン失敗回数。成功時またはロック時にリセット。';
COMMENT ON COLUMN public.users.password_locked_until IS 'メール・パスワードログインのロック解除予定時刻。';

-- quota_key 旧名の移行（本番など既存 DB で一度だけ実行。新規構築で旧キーが無い場合は 0 行更新でよい）
UPDATE public.quota_usage
SET quota_key = 'monthly_daily_journal_regeneration'
WHERE quota_key = 'journal_daily_regeneration_b';

-- 既存 DB で旧コメントのままの場合に揃える（新規は上の CREATE 直後の COMMENT と同じ）
COMMENT ON COLUMN public.quota_usage.quota_key IS '制限の種類。例: monthly_daily_journal_regeneration = 日次ふりかえり成功後の再分析（東京暦月あたりの回数上限）';

-- ---------------------------------------------------------------------------
-- 3. RLS 有効化
-- ---------------------------------------------------------------------------

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emotion_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magic_link_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quota_usage ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 4. ポリシー（存在しなければ作成＝冪等）
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'users_server_only') THEN
    CREATE POLICY "users_server_only" ON public.users FOR ALL USING (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'entries' AND policyname = 'entries_server_only') THEN
    CREATE POLICY "entries_server_only" ON public.entries FOR ALL USING (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'moods' AND policyname = 'moods_server_only') THEN
    CREATE POLICY "moods_server_only" ON public.moods FOR ALL USING (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'analysis_results' AND policyname = 'analysis_results_server_only') THEN
    CREATE POLICY "analysis_results_server_only" ON public.analysis_results FOR ALL USING (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'emotion_tags' AND policyname = 'emotion_tags_server_only') THEN
    CREATE POLICY "emotion_tags_server_only" ON public.emotion_tags FOR ALL USING (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'subscriptions' AND policyname = 'subscriptions_server_only') THEN
    CREATE POLICY "subscriptions_server_only" ON public.subscriptions FOR ALL USING (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'magic_link_tokens' AND policyname = 'magic_link_tokens_server_only') THEN
    CREATE POLICY "magic_link_tokens_server_only" ON public.magic_link_tokens FOR ALL USING (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'contact_requests' AND policyname = 'contact_requests_server_only') THEN
    CREATE POLICY "contact_requests_server_only" ON public.contact_requests FOR ALL USING (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quota_usage' AND policyname = 'quota_usage_server_only') THEN
    CREATE POLICY "quota_usage_server_only" ON public.quota_usage FOR ALL USING (false);
  END IF;
END $$;

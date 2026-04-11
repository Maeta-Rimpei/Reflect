-- 管理パネル 2 段目パスワードの試行回数制限（10 回失敗でロック）
-- Supabase SQL Editor で実行。サービスロール API のみアクセス。

create table if not exists public.admin_gate_attempts (
  id text primary key,
  fail_count integer not null default 0,
  locked_until timestamptz null,
  updated_at timestamptz not null default now()
);

comment on table public.admin_gate_attempts is 'Admin panel password gate lockout by hashed client id';

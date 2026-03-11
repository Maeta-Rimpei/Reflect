"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { RippleMotif } from "@/components/ripple-motif";
import { Loader2 } from "lucide-react";
import {
  validatePasswordFormat,
  PASSWORD_MIN_LENGTH,
} from "@/lib/password";

/** 新規登録画面（Google / メール・パスワード）。メールの場合は確認メール送信 or 即ログイン */
export function SignUpPanel() {
  /** ユーザー名入力値 */
  const [name, setName] = useState("");
  /** メールアドレス入力値 */
  const [email, setEmail] = useState("");
  /** パスワード入力値（8文字以上・英字1文字以上・数字1文字以上） */
  const [password, setPassword] = useState("");
  /** 登録 API 送信中か */
  const [submitting, setSubmitting] = useState(false);
  /** 確認メール送信済みフラグ（送信完了画面表示用） */
  const [sent, setSent] = useState(false);
  /** 登録失敗時のエラーメッセージ */
  const [error, setError] = useState<string | null>(null);

  /** Google OAuth で登録・ログイン（/journal へリダイレクト） */
  const handleGoogleSignUp = () => {
    void signIn("google", { callbackUrl: "/journal" });
  };

  /** メール・パスワードで登録。Resend 未設定時は即ログイン、設定時は確認メール送信 */
  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const pwdCheck = validatePasswordFormat(password);
    if (!name.trim() || !email.trim() || !pwdCheck.ok) {
      if (!pwdCheck.ok) setError(pwdCheck.message);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: name.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? "アカウントの作成に失敗しました。");
        return;
      }

      if (data.verified) {
        // Resend 未設定（開発環境）→ そのままログイン
        await signIn("email-password", {
          email: email.trim(),
          password,
          redirectTo: "/journal",
        });
        return;
      }

      // メール送信成功 → 確認画面を表示
      setSent(true);
    } catch {
      setError("エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <RippleMotif size="sm" className="mb-3" />
          <h1 className="mb-1 text-lg font-semibold tracking-tight text-foreground">
            新規会員登録
          </h1>
          <p className="text-xs text-muted-foreground">
            アカウントを作成して、ふりかえりと分析をはじめましょう。
          </p>
        </div>

        {sent ? (
          <div className="text-center space-y-3">
            <p className="text-sm font-medium text-foreground">
              確認メールを送信しました
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">{email}</span>{" "}
              に確認メールを送信しました。
              <br />
              メール内のリンクをクリックして登録を完了してください。
            </p>
            <button
              type="button"
              onClick={() => {
                setSent(false);
                setName("");
                setEmail("");
                setPassword("");
              }}
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground cursor-pointer"
            >
              別のメールアドレスで登録する
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <Button
              type="button"
              variant="outline"
              className="w-full justify-center gap-2 text-xs cursor-pointer"
              onClick={handleGoogleSignUp}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google アカウントで続ける
            </Button>

            <div className="relative flex items-center gap-3">
              <div className="flex-1 border-t border-border" />
              <span className="text-[10px] text-muted-foreground shrink-0">
                または
              </span>
              <div className="flex-1 border-t border-border" />
            </div>

            <form onSubmit={handleEmailSignUp} className="space-y-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ユーザー名"
                required
                autoComplete="name"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-foreground/20"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="メールアドレス"
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-foreground/20"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="パスワード"
                required
                minLength={PASSWORD_MIN_LENGTH}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-foreground/20"
              />
              <p className="text-[11px] text-muted-foreground">
                英字数字8文字以上のパスワードを入力してください
              </p>
              {error && (
                <p className="text-xs text-red-600">{error}</p>
              )}
              <Button
                type="submit"
                disabled={
                  submitting ||
                  !name.trim() ||
                  !email.trim() ||
                  !validatePasswordFormat(password).ok
                }
                className="w-full justify-center text-xs cursor-pointer"
              >
                {submitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "メールアドレスで登録"
                )}
              </Button>
            </form>

            <p className="pt-4 text-center text-[11px] text-muted-foreground">
              すでにアカウントをお持ちの方は
              <Link
                href="/login"
                className="ml-1 font-medium text-foreground underline underline-offset-2 hover:no-underline cursor-pointer"
              >
                ログイン
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

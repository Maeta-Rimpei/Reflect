"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { RippleMotif } from "@/components/ripple-motif";
import { Loader2 } from "lucide-react";

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"verifying" | "success" | "error">(
    "verifying",
  );
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("無効なリンクです。");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        // 1. トークンの有効性を事前検証
        const verifyRes = await fetch("/api/auth/verify-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (cancelled) return;

        if (!verifyRes.ok) {
          const data = await verifyRes.json().catch(() => ({}));
          setStatus("error");
          setErrorMessage(
            data.message ??
              "リンクの有効期限が切れているか、すでに使用済みです。",
          );
          return;
        }

        // 2. トークン有効 → NextAuth でセッション発行（リダイレクト）
        //    magic-link authorize 内でトークン消費 + email_verified=true が行われる
        await signIn("magic-link", {
          token,
          redirectTo: "/journal",
        });

        if (!cancelled) {
          setStatus("success");
        }
      } catch {
        if (cancelled) return;
        setStatus("error");
        setErrorMessage("認証中にエラーが発生しました。");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm text-center">
        <RippleMotif size="sm" className="mx-auto mb-4" />

        {status === "verifying" && (
          <>
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              メールアドレスを確認しています…
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <h1 className="text-lg font-semibold text-foreground mb-2">
              認証が完了しました
            </h1>
            <p className="text-xs text-muted-foreground">
              リダイレクトしています…
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="text-lg font-semibold text-foreground mb-2">
              認証に失敗しました
            </h1>
            <p className="text-xs text-muted-foreground mb-4">
              {errorMessage}
            </p>
            <Link
              href="/signup"
              className="text-xs font-medium text-foreground underline underline-offset-2 hover:no-underline"
            >
              新規登録ページに戻る
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

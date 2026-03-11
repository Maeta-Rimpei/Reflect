"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { RippleMotif } from "@/components/ripple-motif";

/**
 * 退会完了後のメッセージ表示。表示時にセッションを破棄する。
 * /goodbye は退会 API で付与した Cookie がある場合のみ表示される。
 */
export function GoodbyeContent() {
  useEffect(() => {
    void signOut({ redirect: false });
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-background">
      <RippleMotif size="sm" className="mb-6" />
      <h1 className="text-xl font-semibold text-foreground mb-8">
        これまでReflectをご利用いただき、誠にありがとうございました。
      </h1>
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        退会手続きが完了しました。
      </p>
      <p className="text-sm text-muted-foreground text-center max-w-sm mb-8">
        あなたの人生がより豊かになることを祈っております。
      </p>
      <Link
        href="/"
        className="text-sm font-medium text-foreground underline underline-offset-2 hover:no-underline"
      >
        トップへ戻る
      </Link>
    </div>
  );
}

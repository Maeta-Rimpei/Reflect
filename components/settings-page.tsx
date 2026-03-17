"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Check, ArrowRight, Loader2, LogOut } from "lucide-react";
import { getApiHeaders } from "@/lib/api-auth";

/** Free プランの表示用（名前・価格・機能一覧） */
const freePlan = {
  name: "Free",
  price: "0",
  features: [
    "1日1件のふりかえり記録",
    "AI簡易分析",
    "直近7日分の履歴・感情ログ",
  ],
};

/** Deep プランの表示用（名前・価格・機能一覧） */
const deepPlan = {
  name: "Deep",
  price: "980",
  features: [
    "1日1件のふりかえり記録",
    "AI簡易分析",
    "全期間の履歴閲覧",
    "週次AI分析レポート",
    "月次AI分析レポート",
    "年次AI分析レポート",
    "人格サマリー",
    "AIによる問いかけ",
  ],
};

/** サーバーから渡す初回プロフィール（plan / email / name） */
type InitialProfile = { plan: "free" | "deep"; email: string | null; name: string | null };

/** プラン選択・決済・アカウント情報・退会を扱う設定ページ */
export function SettingsPage({
  initialProfile,
  initialMessage,
}: {
  /** サーバーで取得したプロフィール。ある場合は初回の /api/v1/me 取得をスキップする */
  initialProfile?: InitialProfile | null;
  /** サーバーで searchParams から組み立てたメッセージ（例: 支払いキャンセル） */
  initialMessage?: { type: "success" | "error" | "info"; text: string } | null;
}) {
  const searchParams = useSearchParams();
  /** UI で選択中のプラン（ラジオ用） */
  const [selectedPlan, setSelectedPlan] = useState<"free" | "deep">(
    initialProfile?.plan ?? "free",
  );
  /** サーバーから取得した現在のプラン */
  const [plan, setPlan] = useState<"free" | "deep">(initialProfile?.plan ?? "free");
  /** ログインユーザーのメールアドレス */
  const [email, setEmail] = useState<string | null>(initialProfile?.email ?? null);
  /** ログインユーザーの表示名 */
  const [name, setName] = useState<string | null>(initialProfile?.name ?? null);
  /** Stripe Checkout 作成・リダイレクト待ち中か */
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  /** Stripe カスタマーポータル起動中か */
  const [portalLoading, setPortalLoading] = useState(false);
  /** 退会確認ダイアログを表示しているか */
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  /** 退会 API 実行中か */
  const [deleteLoading, setDeleteLoading] = useState(false);
  /** 画面上部に表示するフラッシュメッセージ（success / error / info） */
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(initialMessage ?? null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const headers = await getApiHeaders();
      const success = searchParams.get("success");
      const sessionId = searchParams.get("session_id");

      if (success === "1" && sessionId) {
        try {
          await fetch("/api/stripe/verify-checkout", {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ session_id: sessionId }),
          });
          if (!cancelled) setMessage({ type: "success", text: "Deepプランへの加入が完了しました。" });
        } catch {
          if (!cancelled) setMessage({ type: "error", text: "Deepプランへの加入に失敗しました。" });
        }
      }

      await fetch("/api/stripe/sync-subscription", {
        method: "POST",
        headers,
        credentials: "include",
      }).catch(() => {});

      if (success === "1" && sessionId) {
        const res = await fetch("/api/v1/me", { headers, credentials: "include" });
        if (cancelled || !res.ok) return;
        const data = (await res.json()) as {
          plan?: "free" | "deep";
          email?: string;
          name?: string;
        };
        setPlan(data.plan ?? "free");
        setEmail(data.email ?? null);
        setName(data.name ?? null);
        setSelectedPlan(data.plan ?? "free");
      } else if (!initialProfile) {
        const res = await fetch("/api/v1/me", { headers, credentials: "include" });
        if (cancelled || !res.ok) return;
        const data = (await res.json()) as {
          plan?: "free" | "deep";
          email?: string;
          name?: string;
        };
        setPlan(data.plan ?? "free");
        setEmail(data.email ?? null);
        setName(data.name ?? null);
        setSelectedPlan(data.plan ?? "free");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [searchParams, initialProfile]);

  /** Deep プランへアップグレード（Checkout セッション作成 → リダイレクト） */
  const handleUpgrade = async () => {
    const headers = await getApiHeaders();
    setCheckoutLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = (await res.json()) as { url?: string; message?: string };
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setMessage({ type: "error", text: data.message ?? "チェックアウトの作成に失敗しました。" });
    } finally {
      setCheckoutLoading(false);
    }
  };

  /** Stripe カスタマーポータルを開く（支払い方法・解約など） */
  const handlePortal = async () => {
    const headers = await getApiHeaders();
    setPortalLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = (await res.json()) as { url?: string; message?: string };
      if (res.ok && data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
        return;
      }
      setMessage({ type: "error", text: data.message ?? "ポータルを開けませんでした。" });
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6 md:py-12">
      {message && (
        <div
          className={cn(
            "mb-4 rounded-lg border px-4 py-2 text-sm",
            message.type === "success" && "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400",
            message.type === "error" && "border-red-600/50 bg-red-600/10 text-red-600",
            message.type === "info" && "border-muted-foreground/30 bg-muted/50 text-muted-foreground"
          )}
        >
          {message.text}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
          アカウント
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          設定
        </h1>
      </div>

      {/* Profile Section */}
      <div className="rounded-xl border border-border bg-card p-5 mb-6">
        <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-4">
          プロフィール
        </h2>
        <div className="space-y-3">
          <div>
            <span className="text-xs text-muted-foreground">名前</span>
            <p className="text-sm font-medium text-foreground mt-0.5">{name ?? "—"}</p>
          </div>
          <Separator />
          <div>
            <span className="text-xs text-muted-foreground">メールアドレス</span>
            <p className="text-sm font-medium text-foreground mt-0.5">{email ?? "—"}</p>
          </div>
          <Separator />
          <div>
            <span className="text-xs text-muted-foreground">プラン</span>
            <div className="mt-0.5">
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 rounded-md"
              >
                {plan === "deep" ? "Deepプラン" : "Freeプラン"}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Plans */}
      <div className="mb-6">
        <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-4">
          プラン
        </h2>
        <div className="grid gap-4 md:grid-cols-2 md:items-stretch">
          {/* Free Plan */}
          <button
            type="button"
            onClick={() => setSelectedPlan("free")}
            className={cn(
              "text-left rounded-xl border-2 p-5 transition-all flex flex-col cursor-pointer",
              selectedPlan === "free"
                ? "border-foreground bg-foreground/5 ring-2 ring-foreground/20"
                : "border-border bg-card hover:border-foreground/30"
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">
                {freePlan.name}
              </h3>
              {selectedPlan === "free" && (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background">
                  <Check className="h-3 w-3" />
                </div>
              )}
            </div>
            <p className="text-2xl font-bold text-foreground mb-4">
              {freePlan.price}
              <span className="text-sm font-normal text-muted-foreground">
                {" "}
                円/月
              </span>
            </p>
            <ul className="space-y-2 flex-1">
              {freePlan.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2 text-xs text-muted-foreground"
                >
                  <Check className="h-3 w-3 mt-0.5 shrink-0 text-foreground/40" />
                  {feature}
                </li>
              ))}
            </ul>
          </button>

          {/* Deep Plan */}
          <button
            type="button"
            onClick={() => setSelectedPlan("deep")}
            className={cn(
              "text-left rounded-xl border-2 p-5 transition-all relative overflow-hidden flex flex-col cursor-pointer",
              selectedPlan === "deep"
                ? "border-foreground bg-foreground/5 ring-2 ring-foreground/20"
                : "border-border bg-card hover:border-foreground/30"
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">
                {deepPlan.name}
              </h3>
              {selectedPlan === "deep" ? (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background">
                  <Check className="h-3 w-3" />
                </div>
              ) : (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded-md text-foreground">
                  おすすめ
                </Badge>
              )}
            </div>
            <p className="text-2xl font-bold text-foreground mb-4">
              {deepPlan.price}
              <span className="text-sm font-normal text-muted-foreground">
                {" "}
                円/月
              </span>
            </p>
            <ul className="space-y-2 flex-1">
              {deepPlan.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2 text-xs text-muted-foreground"
                >
                  <Check className="h-3 w-3 mt-0.5 shrink-0 text-foreground/60" />
                  {feature}
                </li>
              ))}
            </ul>
          </button>
        </div>

        {selectedPlan === "deep" && plan !== "deep" && (
          <button
            type="button"
            onClick={handleUpgrade}
            disabled={checkoutLoading}
            className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-foreground text-background py-3 text-sm font-medium transition-colors hover:bg-foreground/90 cursor-pointer disabled:opacity-50"
          >
            {checkoutLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Deepプランにアップグレード（Stripe）
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        )}
      </div>

      {/* 利用明細 - Deep ユーザーのみ */}
      {plan === "deep" && (
        <div className="rounded-xl border border-border bg-card p-5 mb-6">
          <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-4">
            利用明細
          </h2>
          <div className="space-y-3">
            <button
              type="button"
              onClick={handlePortal}
              disabled={portalLoading}
              className="w-full flex items-center justify-between py-2 text-sm text-foreground hover:text-foreground/70 transition-colors cursor-pointer disabled:opacity-50"
            >
              月ごとの利用明細を確認する（Stripeポータル）
              {portalLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
          </div>
        </div>
      )}

      {/* Logout (アカウント操作の中で独立した枠) */}
      <div className="rounded-xl border border-border bg-card p-5 mb-6">
        <button
          type="button"
          onClick={() => void signOut({ callbackUrl: "/" })}
          className="w-full flex items-center justify-between py-2 text-sm text-foreground hover:text-foreground/70 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            ログアウトする
          </span>
        </button>
      </div>

      {/* Footer（特商法の次に解約・退会） */}
      <div className="mt-10 border-t border-border pt-6 text-center">
        <p className="text-[10px] text-muted-foreground">
          Reflectが少しでもあなたの心の整理に役立ったら、ぜひご家族・ご友人におすすめしてくださると幸いです。
        </p>
        <p className="text-[10px] text-muted-foreground mt-16 flex flex-wrap justify-center gap-x-4 gap-y-1">
          <Link href="/contact" className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
            お問い合わせ
          </Link>
          <Link href="/terms" className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
            利用規約
          </Link>
          <Link href="/privacy" className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
            プライバシーポリシー
          </Link>
          <Link href="/tokushoho" className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
            特定商取引法に基づく表記
          </Link>
        </p>

        {/* 解約・退会リンク（お問い合わせなどと同じフッター内のテキストリンク） */}
        <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px]">
          {plan === "deep" && (
            <button
              type="button"
              onClick={handlePortal}
              disabled={portalLoading}
              className="text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              Deepプランを解約する（Stripeポータル）
            </button>
          )}
          <button
            type="button"
            onClick={() => setDeleteConfirm(true)}
            className="text-[10px] text-destructive hover:text-destructive/80 underline underline-offset-2 transition-colors cursor-pointer"
          >
            退会する
          </button>
        </div>
        {deleteConfirm && (
          <div className="mt-3 text-center">
            <p className="text-[10px] text-destructive mb-2">
              退会するとこれまでのふりかえり・分析データの閲覧ができなくなります。本当に退会しますか？
            </p>
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  setDeleteLoading(true);
                  try {
                    const headers = await getApiHeaders();
                    const res = await fetch("/api/v1/me/delete", {
                      method: "DELETE",
                      headers,
                      credentials: "include",
                    });
                    if (res.ok) {
                      window.location.href = "/goodbye";
                    } else {
                      setMessage({ type: "error", text: "退会に失敗しました。" });
                      setDeleteConfirm(false);
                    }
                  } catch {
                    setMessage({ type: "error", text: "退会に失敗しました。" });
                    setDeleteConfirm(false);
                  } finally {
                    setDeleteLoading(false);
                  }
                }}
                disabled={deleteLoading}
                className="rounded-lg bg-destructive text-destructive-foreground px-4 py-1.5 text-[10px] font-medium hover:bg-destructive/90 disabled:opacity-50 cursor-pointer"
              >
                {deleteLoading ? "処理中…" : "退会する"}
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirm(false)}
                className="rounded-lg border border-border px-4 py-1.5 text-[10px] font-medium text-foreground hover:bg-accent cursor-pointer"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground mt-8">
          Reflect v0.9.0
        </p>
        <p className="text-[10px] text-muted-foreground mt-2">
          Copyright © {new Date().getFullYear()} Reflect. All rights reserved.
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  CalendarRange,
  Check,
  Loader2,
  LogOut,
  MessageCircleQuestion,
  UserRound,
} from "lucide-react";
import { getApiHeaders } from "@/lib/api-auth";
import { PLAN_DEEP, PLAN_FREE } from "@/constants/plan";
import type { Plan } from "@/types/plan";
import type { ServerProfile } from "@/types/profile";

/** Free プランの表示用（名前・価格・機能一覧） */
const freePlan = {
  name: "Free",
  price: "0",
  features: [
    "1日1件のふりかえり記録",
    "日次分析",
    "直近7日分の履歴・感情ログ",
  ],
};

/** Deep プランの表示用（名前・価格・機能一覧） */
const deepPlan = {
  name: "Deep",
  price: "980",
  features: [
    "1日1件のふりかえり記録",
    "日次分析",
    "全期間の履歴閲覧",
    "週次分析レポート",
    "月次分析レポート",
    "年次分析レポート",
    "人格サマリー",
    "問いかけ",
  ],
};

/** プラン選択・決済・アカウント情報・退会を扱う設定ページ */
export function SettingsPage({
  initialProfile,
  initialMessage,
}: {
  /** サーバーで取得したプロフィール。ある場合は初回の /api/v1/me 取得をスキップする */
  initialProfile?: ServerProfile | null;
  /** サーバーで searchParams から組み立てたメッセージ（例: 支払いキャンセル） */
  initialMessage?: { type: "success" | "error" | "info"; text: string } | null;
}) {
  const searchParams = useSearchParams();
  /** UI で選択中のプラン（ラジオ用） */
  const [selectedPlan, setSelectedPlan] = useState<Plan>(
    initialProfile?.plan ?? PLAN_FREE,
  );
  /** サーバーから取得した現在のプラン */
  const [plan, setPlan] = useState<Plan>(initialProfile?.plan ?? PLAN_FREE);
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
          plan?: Plan;
          email?: string;
          name?: string;
        };
        setPlan(data.plan ?? PLAN_FREE);
        setEmail(data.email ?? null);
        setName(data.name ?? null);
        setSelectedPlan(data.plan ?? PLAN_FREE);
      } else if (!initialProfile) {
        const res = await fetch("/api/v1/me", { headers, credentials: "include" });
        if (cancelled || !res.ok) return;
        const data = (await res.json()) as {
          plan?: Plan;
          email?: string;
          name?: string;
        };
        setPlan(data.plan ?? PLAN_FREE);
        setEmail(data.email ?? null);
        setName(data.name ?? null);
        setSelectedPlan(data.plan ?? PLAN_FREE);
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

      {/* Reflect の使い方（ダイアログ） */}
      <div className="mb-6 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-[13px] text-muted-foreground">
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-2 text-left text-muted-foreground underline-offset-2 hover:underline"
            >
              <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground/90" aria-hidden />
              Reflect の使い方
            </button>
          </DialogTrigger>
          <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
            {/* アイコン列 32px + ギャップ 12px で本文の左端を統一 */}
            <div className="shrink-0 border-b border-border/50 px-6 pb-4 pt-6 pr-14">
              <DialogHeader className="p-0 text-left">
                <div className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-x-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/60 text-muted-foreground">
                    <BookOpen className="h-4 w-4" aria-hidden />
                  </span>
                  <DialogTitle className="pt-0.5 text-left text-base font-semibold leading-snug tracking-tight text-foreground">
                    Reflect の使い方
                  </DialogTitle>
                </div>
              </DialogHeader>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-5">
              <div className="space-y-6 text-sm">
                <section className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-x-3 gap-y-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/50 text-muted-foreground">
                    <BookOpen className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 space-y-1.5">
                    <h3 className="text-sm font-medium leading-snug text-foreground">
                      日々のふりかえり
                    </h3>
                    <p className="leading-relaxed text-muted-foreground">
                      気分を選び、その日にその気持ちになった出来事と、なぜそう感じたかを書きます。書き方のコツは、
                      <Link
                        href="/journal"
                        className="text-foreground underline underline-offset-2 hover:text-foreground/80"
                      >
                        ふりかえり
                      </Link>
                      画面の入力ガイドも参照してください。
                    </p>
                  </div>
                </section>
                <section className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-x-3 gap-y-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/50 text-muted-foreground">
                    <BarChart3 className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 space-y-1.5">
                    <h3 className="text-sm font-medium leading-snug text-foreground">
                      日次分析と問いかけ
                    </h3>
                    <p className="leading-relaxed text-muted-foreground">
                      保存すると、その日の出来事の分析が表示されます。出てきた問いかけについて、少し考えてみましょう。
                    </p>
                  </div>
                </section>
                <section className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-x-3 gap-y-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/50 text-muted-foreground">
                    <CalendarDays className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 space-y-1.5">
                    <h3 className="text-sm font-medium leading-snug text-foreground">
                      1週間の継続
                    </h3>
                    <p className="leading-relaxed text-muted-foreground">
                      毎日続けます。Deepプランでは、週の最終日に週次分析が行われ、週次レポートでその週の傾向がわかります。その結果を手がかりに、その週の自分をふりかえりましょう。
                    </p>
                  </div>
                </section>
                <section className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-x-3 gap-y-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/50 text-muted-foreground">
                    <CalendarRange className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 space-y-1.5">
                    <h3 className="text-sm font-medium leading-snug text-foreground">
                      月次の振り返り
                      <span className="ml-1.5 align-baseline text-xs font-normal text-muted-foreground">
                        （Deepプラン）
                      </span>
                    </h3>
                    <p className="leading-relaxed text-muted-foreground">
                      1か月分がたまると月次分析ができます。その月の自分をふりかえりましょう。
                    </p>
                  </div>
                </section>
                <section className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-x-3 gap-y-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/50 text-muted-foreground">
                    <UserRound className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 space-y-1.5">
                    <h3 className="text-sm font-medium leading-snug text-foreground">
                      人格サマリー
                      <span className="ml-1.5 align-baseline text-xs font-normal text-muted-foreground">
                        （Deepプラン）
                      </span>
                    </h3>
                    <p className="leading-relaxed text-muted-foreground">
                      ある程度データが蓄積されると、人格サマリーが生成されます。自身の言動と感情のまとめ、強み、リスク、落ち込みやすい条件、回復しやすい行動などを俯瞰できます。
                    </p>
                  </div>
                </section>
                <section className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-x-3 gap-y-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/50 text-muted-foreground">
                    <MessageCircleQuestion className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 space-y-1.5">
                    <h3 className="text-sm font-medium leading-snug text-foreground">
                      問いかけと次の一歩
                      <span className="ml-1.5 align-baseline text-xs font-normal text-muted-foreground">
                        （Deepプラン）
                      </span>
                    </h3>
                    <p className="leading-relaxed text-muted-foreground">
                      人格サマリーと同時に、次の一歩を踏み出すための問いかけが生成されることがあります。問いかけについて考え、実践できるものは試してみてください。
                    </p>
                  </div>
                </section>
              </div>
            </div>
          </DialogContent>
        </Dialog>
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
                {plan === PLAN_DEEP ? "Deepプラン" : "Freeプラン"}
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
            onClick={() => setSelectedPlan(PLAN_FREE)}
            className={cn(
              "text-left rounded-xl border-2 p-5 transition-all flex flex-col cursor-pointer",
              selectedPlan === PLAN_FREE
                ? "border-foreground bg-foreground/5 ring-2 ring-foreground/20"
                : "border-border bg-card hover:border-foreground/30"
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">
                {freePlan.name}
              </h3>
              {selectedPlan === PLAN_FREE && (
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
            onClick={() => setSelectedPlan(PLAN_DEEP)}
            className={cn(
              "text-left rounded-xl border-2 p-5 transition-all relative overflow-hidden flex flex-col cursor-pointer",
              selectedPlan === PLAN_DEEP
                ? "border-foreground bg-foreground/5 ring-2 ring-foreground/20"
                : "border-border bg-card hover:border-foreground/30"
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">
                {deepPlan.name}
              </h3>
              {selectedPlan === PLAN_DEEP ? (
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

        {selectedPlan === PLAN_DEEP && plan !== PLAN_DEEP && (
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
      {plan === PLAN_DEEP && (
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
      <div className="md:hidden rounded-xl border border-border bg-card p-5 mb-6">
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
          {plan === PLAN_DEEP && (
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
                    const body = (await res.json().catch(() => ({}))) as {
                      message?: string;
                    };
                    if (res.ok) {
                      window.location.href = "/goodbye";
                    } else {
                      setMessage({
                        type: "error",
                        text: body.message ?? "退会に失敗しました。",
                      });
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

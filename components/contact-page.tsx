"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getApiHeaders } from "@/lib/api-auth";
import { CONTACT_CATEGORIES, type ContactCategory } from "@/types/contact";

/** お問い合わせ本文の最大文字数 */
const MAX_BODY = 2000;

/** お問い合わせフォーム（カテゴリ・本文送信）を表示するページ */
export function ContactPage() {
  /** 選択中のカテゴリ（feedback / request / bug など） */
  const [category, setCategory] = useState<ContactCategory | "">("");
  /** 本文テキスト */
  const [body, setBody] = useState("");
  /** 送信 API 実行中か */
  const [submitting, setSubmitting] = useState(false);
  /** 送信完了フラグ（完了画面表示用） */
  const [sent, setSent] = useState(false);
  /** 送信失敗時のエラーメッセージ */
  const [error, setError] = useState<string | null>(null);

  /** フォーム送信: POST /api/v1/contact で送信し、成功時は sent を true に */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !body.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      const headers = await getApiHeaders();
      const res = await fetch("/api/v1/contact", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ category, body: body.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };

      if (!res.ok) {
        setError(data.message ?? "送信に失敗しました。");
        return;
      }
      setSent(true);
      setCategory("");
      setBody("");
    } catch {
      setError("送信に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6 md:py-12">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          設定に戻る
        </Link>

        <h1 className="text-xl font-semibold tracking-tight text-foreground mb-2">
          お問い合わせ
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          ご意見・ご要望・不具合報告はこちらからお願いいたします。
        </p>

        {sent ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <p className="text-sm font-medium text-foreground mb-1">送信しました</p>
            <p className="text-xs text-muted-foreground">
              お問い合わせを受け付けました。運営よりメールで返信する場合があります。
            </p>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="mt-4 text-xs font-medium text-foreground underline hover:no-underline"
            >
              もう一度送信する
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
                カテゴリ
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ContactCategory | "")}
                required
                className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
              >
                <option value="">選択してください</option>
                {CONTACT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
                お問い合わせ内容
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value.slice(0, MAX_BODY))}
                required
                rows={6}
                placeholder="ご記入ください…"
                className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-foreground/20 resize-none"
              />
              <p className="text-[10px] text-muted-foreground mt-1 text-right">
                {body.length}/{MAX_BODY}
              </p>
            </div>

            {error && (
              <p className="text-xs text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting || !category || !body.trim()}
              className="w-full rounded-xl py-3 text-sm font-medium bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "送信中…" : "送信する"}
            </button>
          </form>
        )}
      </div>
  );
}

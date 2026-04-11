import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchAdminContactById } from "@/lib/fetch-admin-contact";
import { contactCategoryLabel } from "@/lib/admin-contact-labels";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ja-JP", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminContactDetailPage({ params }: PageProps) {
  const { id } = await params;
  const row = await fetchAdminContactById(id);

  if (!row) {
    notFound();
  }

  return (
    <div>
      <Link
        href="/admin/contact"
        className="mb-6 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        一覧へ
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            お問い合わせ詳細
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDate(row.created_at)}
          </p>
        </div>
        <Badge variant="secondary" className="text-xs">
          {contactCategoryLabel(row.category)}
        </Badge>
      </div>

      <section className="mt-8 space-y-2 rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-[11px] font-medium text-muted-foreground">
          ユーザー
        </h2>
        <p className="break-all font-mono text-xs">{row.user_id}</p>
        <p className="text-sm">
          {row.user_email ?? "（メールなし）"}
          {row.user_name ? (
            <span className="text-muted-foreground"> · {row.user_name}</span>
          ) : null}
        </p>
        <Link
          href={`/admin/users/${encodeURIComponent(row.user_id)}`}
          className="inline-block text-xs text-foreground underline-offset-2 hover:underline"
        >
          ユーザー詳細を開く
        </Link>
      </section>

      <section className="mt-6 space-y-2">
        <h2 className="text-sm font-medium text-foreground">本文</h2>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <pre className="whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-foreground">
            {row.body}
          </pre>
        </div>
      </section>
    </div>
  );
}

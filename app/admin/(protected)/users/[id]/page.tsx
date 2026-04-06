import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchAdminUserDetail } from "@/lib/fetch-admin-users";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ja-JP", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminUserDetailPage({ params }: PageProps) {
  const { id } = await params;
  const detail = await fetchAdminUserDetail(id);

  if (!detail.user) {
    notFound();
  }

  const u = detail.user;

  return (
    <div>
      <Link
        href="/admin/users"
        className="mb-6 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        ユーザー一覧へ
      </Link>

      <h1 className="text-lg font-semibold tracking-tight text-foreground">
        ユーザー詳細
      </h1>
      <p className="mt-1 text-xs text-muted-foreground">
        ふりかえり本文・分析ペイロードは表示しません。件数のみです。
      </p>

      <section className="mt-8 space-y-4">
        <h2 className="text-sm font-medium text-foreground">アカウント</h2>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <dl className="grid gap-3 text-xs sm:grid-cols-2">
            <div>
              <dt className="text-[11px] text-muted-foreground">ユーザー ID</dt>
              <dd className="mt-1 break-all font-mono text-[11px]">{u.id}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-muted-foreground">メール</dt>
              <dd className="mt-1 break-all">{u.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-muted-foreground">表示名</dt>
              <dd className="mt-1">{u.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-muted-foreground">プラン</dt>
              <dd className="mt-1">
                <Badge variant="secondary" className="text-[10px]">
                  {u.plan}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-muted-foreground">メール認証</dt>
              <dd className="mt-1">{u.email_verified ? "済み" : "未"}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-muted-foreground">状態</dt>
              <dd className="mt-1">
                {u.deleted_at ? (
                  <Badge variant="destructive" className="text-[10px]">
                    退会 ({formatDate(u.deleted_at)})
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">
                    有効
                  </Badge>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-muted-foreground">登録</dt>
              <dd className="mt-1 text-muted-foreground">
                {formatDate(u.created_at)}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-sm font-medium text-foreground">利用状況（件数）</h2>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px]">項目</TableHead>
                <TableHead className="w-[120px] text-right text-[11px]">
                  件数
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="text-xs">ふりかえり（entries）</TableCell>
                <TableCell className="text-right tabular-nums text-xs">
                  {detail.counts.entries}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-xs">
                  分析結果（analysis_results）
                </TableCell>
                <TableCell className="text-right tabular-nums text-xs">
                  {detail.counts.analysisResults}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-sm font-medium text-foreground">
          Stripe / subscriptions
        </h2>
        {detail.subscription ? (
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <dl className="grid gap-3 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-[11px] text-muted-foreground">status</dt>
                <dd className="mt-1 font-mono text-[11px]">
                  {detail.subscription.status ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-muted-foreground">
                  current_period_end
                </dt>
                <dd className="mt-1 text-[11px] text-muted-foreground">
                  {formatDate(detail.subscription.current_period_end)}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[11px] text-muted-foreground">
                  stripe_customer_id
                </dt>
                <dd className="mt-1 break-all font-mono text-[11px]">
                  {detail.subscription.stripe_customer_id ?? "—"}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[11px] text-muted-foreground">
                  stripe_subscription_id
                </dt>
                <dd className="mt-1 break-all font-mono text-[11px]">
                  {detail.subscription.stripe_subscription_id ?? "—"}
                </dd>
              </div>
            </dl>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            subscriptions 行がありません（未課金または未同期）。
          </p>
        )}
      </section>
    </div>
  );
}

import Link from "next/link";
import { fetchAdminContactList } from "@/lib/fetch-admin-contact";
import { contactCategoryLabel } from "@/lib/admin-contact-labels";
import { AdminPagination } from "@/components/admin/admin-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function buildContactHref(page: number): string {
  return page > 1 ? `/admin/contact?page=${page}` : "/admin/contact";
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ja-JP", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function previewBody(body: string, max = 120): string {
  const t = body.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export default async function AdminContactPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const { rows, total, pageSize, page: currentPage } =
    await fetchAdminContactList({ page });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const prevHref = currentPage > 1 ? buildContactHref(currentPage - 1) : null;
  const nextHref =
    currentPage < totalPages ? buildContactHref(currentPage + 1) : null;

  return (
    <div>
      <h1 className="text-lg font-semibold tracking-tight text-foreground">
        お問い合わせ
      </h1>
      <p className="mt-1 text-xs text-muted-foreground">
        contact_requests の一覧です。詳細は行を開いて全文を確認してください。
      </p>

      <div className="mt-8 rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[148px] text-[11px]">日時</TableHead>
              <TableHead className="w-[100px] text-[11px]">カテゴリ</TableHead>
              <TableHead className="text-[11px]">ユーザー</TableHead>
              <TableHead className="min-w-[200px] text-[11px]">本文（抜粋）</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-10 text-center text-xs text-muted-foreground"
                >
                  お問い合わせはまだありません。
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap align-top text-[11px] text-muted-foreground">
                    {formatDate(r.created_at)}
                  </TableCell>
                  <TableCell className="align-top text-xs">
                    {contactCategoryLabel(r.category)}
                  </TableCell>
                  <TableCell className="max-w-[200px] align-top text-xs">
                    <div className="break-all">
                      {r.user_email ?? r.user_id}
                    </div>
                    {r.user_name ? (
                      <div className="mt-0.5 text-[10px] text-muted-foreground">
                        {r.user_name}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="align-top text-xs leading-relaxed">
                    <Link
                      href={`/admin/contact/${encodeURIComponent(r.id)}`}
                      className="text-foreground underline-offset-2 hover:underline"
                    >
                      {previewBody(r.body)}
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AdminPagination
        prevHref={prevHref}
        nextHref={nextHref}
        page={currentPage}
        totalPages={totalPages}
        total={total}
      />
    </div>
  );
}

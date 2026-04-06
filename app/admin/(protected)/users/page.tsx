import Link from "next/link";
import { fetchAdminUsersList } from "@/lib/fetch-admin-users";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

function buildUsersHref(q: string | undefined, page: number): string {
  const p = new URLSearchParams();
  if (q?.trim()) p.set("q", q.trim());
  if (page > 1) p.set("page", String(page));
  const s = p.toString();
  return s ? `/admin/users?${s}` : "/admin/users";
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

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const { rows, total, pageSize, page: currentPage } =
    await fetchAdminUsersList({
      q,
      page,
    });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const prevHref =
    currentPage > 1 ? buildUsersHref(q, currentPage - 1) : null;
  const nextHref =
    currentPage < totalPages ? buildUsersHref(q, currentPage + 1) : null;

  return (
    <div>
      <h1 className="text-lg font-semibold tracking-tight text-foreground">
        ユーザー一覧
      </h1>
      <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
        メールの部分一致、またはユーザー ID の完全一致で検索できます。
      </p>

      <form
        action="/admin/users"
        method="get"
        className="mt-6 flex max-w-xl flex-wrap items-end gap-2"
      >
        <div className="min-w-[200px] flex-1 space-y-1">
          <label htmlFor="admin-users-q" className="text-[11px] text-muted-foreground">
            検索（メール / ID）
          </label>
          <Input
            id="admin-users-q"
            name="q"
            type="search"
            placeholder="example@… またはユーザー ID"
            defaultValue={q ?? ""}
            className="h-9 text-sm"
          />
        </div>
        <Button type="submit" size="sm" className="text-xs">
          検索
        </Button>
        {q?.trim() ? (
          <Button variant="ghost" size="sm" className="text-xs" asChild>
            <Link href="/admin/users">クリア</Link>
          </Button>
        ) : null}
      </form>

      <div className="mt-6 rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px] text-[11px]">ID</TableHead>
              <TableHead className="text-[11px]">メール</TableHead>
              <TableHead className="text-[11px]">名前</TableHead>
              <TableHead className="w-[72px] text-[11px]">プラン</TableHead>
              <TableHead className="w-[88px] text-[11px]">状態</TableHead>
              <TableHead className="w-[140px] text-[11px]">登録日時</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-xs text-muted-foreground"
                >
                  該当するユーザーがありません。
                </TableCell>
              </TableRow>
            ) : (
              rows.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="align-top font-mono text-[11px]">
                    <Link
                      href={`/admin/users/${encodeURIComponent(u.id)}`}
                      className="break-all text-foreground underline-offset-2 hover:underline"
                    >
                      {u.id.length > 18 ? `${u.id.slice(0, 16)}…` : u.id}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-[200px] break-all text-xs">
                    {u.email ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-[160px] truncate text-xs">
                    {u.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">
                      {u.plan}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {u.deleted_at ? (
                      <Badge variant="destructive" className="text-[10px]">
                        退会
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        有効
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-[11px] text-muted-foreground">
                    {formatDate(u.created_at)}
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

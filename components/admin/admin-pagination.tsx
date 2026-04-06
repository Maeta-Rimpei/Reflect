import Link from "next/link";

type AdminPaginationProps = {
  /** 相対 URL（例: /admin/users?q=x&page=2） */
  prevHref: string | null;
  nextHref: string | null;
  page: number;
  totalPages: number;
  total: number;
};

export function AdminPagination({
  prevHref,
  nextHref,
  page,
  totalPages,
  total,
}: AdminPaginationProps) {
  if (totalPages <= 1 && total === 0) {
    return null;
  }

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
      <span>
        全 {total} 件
        {totalPages > 1 ? `（${page} / ${totalPages} ページ）` : null}
      </span>
      {totalPages > 1 ? (
        <div className="flex items-center gap-3">
          {prevHref ? (
            <Link
              href={prevHref}
              className="font-medium text-foreground underline-offset-2 hover:underline"
            >
              前へ
            </Link>
          ) : (
            <span className="opacity-50">前へ</span>
          )}
          {nextHref ? (
            <Link
              href={nextHref}
              className="font-medium text-foreground underline-offset-2 hover:underline"
            >
              次へ
            </Link>
          ) : (
            <span className="opacity-50">次へ</span>
          )}
        </div>
      ) : null}
    </div>
  );
}

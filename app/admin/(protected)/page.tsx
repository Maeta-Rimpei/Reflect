import { fetchAdminDashboardStats } from "@/lib/fetch-admin-dashboard";

export default async function AdminDashboardPage() {
  const stats = await fetchAdminDashboardStats();

  const cards = [
    {
      label: "登録ユーザー（有効）",
      value: stats.totalActiveUsers,
      hint: "論理削除を除く users 件数",
    },
    {
      label: "直近7日の新規登録",
      value: stats.newUsersLast7Days,
      hint: "created_at が7日以内",
    },
    {
      label: "Deep プラン（有効ユーザー）",
      value: stats.deepPlanUsers,
      hint: "users.plan = deep かつ未退会",
    },
    {
      label: "問い合わせ（累計）",
      value: stats.contactRequestsTotal,
      hint: "contact_requests 全件",
    },
    {
      label: "問い合わせ（直近7日）",
      value: stats.contactRequestsLast7Days,
      hint: "新規お問い合わせ件数の目安",
    },
  ] as const;

  return (
    <div>
      <h1 className="text-lg font-semibold tracking-tight text-foreground">
        ダッシュボード
      </h1>
      <p className="mt-1 text-xs text-muted-foreground">
        運用サポート用のサマリです。ユーザー・問い合わせの一覧はナビから開けます。
      </p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <li
            key={c.label}
            className="rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <p className="text-[11px] font-medium text-muted-foreground">{c.label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
              {c.value}
            </p>
            <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground/90">
              {c.hint}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

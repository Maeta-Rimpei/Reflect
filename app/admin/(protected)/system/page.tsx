import packageJson from "@/package.json";

function flag(on: boolean): string {
  return on ? "設定あり" : "未設定";
}

export default function AdminSystemPage() {
  const stripeSecret = Boolean(process.env.STRIPE_SECRET_KEY);
  const stripePublishable = Boolean(
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  );
  const stripePrice = Boolean(process.env.STRIPE_DEEP_PRICE_ID);
  const stripeWebhook = Boolean(process.env.STRIPE_WEBHOOK_SECRET);
  const supabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabasePublishable = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  const supabaseAdmin = Boolean(
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const rows: { label: string; value: string }[] = [
    { label: "アプリバージョン", value: packageJson.version ?? "—" },
    { label: "NODE_ENV", value: process.env.NODE_ENV ?? "—" },
    {
      label: "AUTH_URL / NEXTAUTH_URL",
      value: flag(Boolean(process.env.AUTH_URL ?? process.env.NEXTAUTH_URL)),
    },
    { label: "AUTH_SECRET", value: flag(Boolean(process.env.AUTH_SECRET)) },
    { label: "NEXT_PUBLIC_SUPABASE_URL", value: flag(supabaseUrl) },
    {
      label: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      value: flag(supabasePublishable),
    },
    {
      label: "SUPABASE_SECRET_KEY / SERVICE_ROLE",
      value: flag(supabaseAdmin),
    },
    { label: "STRIPE_SECRET_KEY", value: flag(stripeSecret) },
    {
      label: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
      value: flag(stripePublishable),
    },
    { label: "STRIPE_DEEP_PRICE_ID", value: flag(stripePrice) },
    { label: "STRIPE_WEBHOOK_SECRET", value: flag(stripeWebhook) },
  ];

  return (
    <div>
      <h1 className="text-lg font-semibold tracking-tight text-foreground">
        システム
      </h1>
      <p className="mt-1 text-xs text-muted-foreground">
        バージョンと主要な環境変数の有無のみ表示します。値は表示しません。
      </p>

      <div className="mt-8 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-xs">
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-border last:border-0">
                <th className="w-[min(48%,280px)] px-4 py-3 text-left font-medium text-muted-foreground">
                  {r.label}
                </th>
                <td className="px-4 py-3 font-mono text-[11px] text-foreground">
                  {r.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

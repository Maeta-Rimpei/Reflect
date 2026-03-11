import Link from "next/link";

export default function TokushohoPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link
        href="/settings"
        className="text-xs text-muted-foreground hover:text-foreground mb-8 inline-block"
      >
        ← 設定に戻る
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-8">
        特定商取引法に基づく表示
      </h1>
      <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-muted-foreground leading-relaxed">
        <dl className="divide-y divide-border text-sm">
          <div className="flex py-4 gap-4">
            <dt className="font-medium text-foreground w-40 shrink-0">運営責任者</dt>
            <dd>前田 倫兵</dd>
          </div>
          <div className="flex py-4 gap-4">
            <dt className="font-medium text-foreground w-40 shrink-0">所在地</dt>
            <dd>請求があった場合に遅滞なく開示</dd>
          </div>
          <div className="flex py-4 gap-4">
            <dt className="font-medium text-foreground w-40 shrink-0">連絡先</dt>
            <dd>請求があった場合に遅滞なく開示</dd>
          </div>
          <div className="flex py-4 gap-4">
            <dt className="font-medium text-foreground w-40 shrink-0">販売価格</dt>
            <dd>
              Free プラン: 0 円<br />
              Deep プラン: 月額 980 円（税込）
            </dd>
          </div>
          <div className="flex py-4 gap-4">
            <dt className="font-medium text-foreground w-40 shrink-0">支払方法</dt>
            <dd>クレジットカード（Stripe 経由）</dd>
          </div>
          <div className="flex py-4 gap-4">
            <dt className="font-medium text-foreground w-40 shrink-0">支払時期</dt>
            <dd>申込時に初回決済。以降毎月自動更新。</dd>
          </div>
          <div className="flex py-4 gap-4">
            <dt className="font-medium text-foreground w-40 shrink-0">サービス提供時期</dt>
            <dd>決済完了後、直ちに利用可能</dd>
          </div>
          <div className="flex py-4 gap-4">
            <dt className="font-medium text-foreground w-40 shrink-0">解約・返金</dt>
            <dd>
              いつでも解約可能（設定画面の Stripe ポータルから手続き）。
              解約後も課金期間終了まで Deep プランの機能を利用できる。
              デジタルコンテンツの性質上、日割り返金は行わない。
            </dd>
          </div>
          <div className="flex py-4 gap-4">
            <dt className="font-medium text-foreground w-40 shrink-0">動作環境</dt>
            <dd>モダンブラウザ（Chrome, Safari, Firefox, Edge の最新版）</dd>
          </div>
        </dl>

        <p className="text-xs text-muted-foreground pt-4">制定日: 2026年2月15日</p>
      </div>
    </main>
  );
}

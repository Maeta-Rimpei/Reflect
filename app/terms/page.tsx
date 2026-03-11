import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link
        href="/settings"
        className="text-xs text-muted-foreground hover:text-foreground mb-8 inline-block"
      >
        ← 設定に戻る
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-8">
        利用規約
      </h1>
      <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-sm text-muted-foreground leading-relaxed">
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">第1条（適用）</h2>
          <p>
            本規約は、Reflect（以下「本サービス」といいます）の利用に関する条件を定めるものです。
            ユーザーは本サービスを利用することにより、本規約に同意したものとみなされます。
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">第2条（アカウント）</h2>
          <p>
            ユーザーは Google アカウントまたはメールアドレスによる認証を通じて本サービスを利用できます。
            アカウントの管理はユーザーご自身の責任とし、第三者への貸与・譲渡はできません。
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">第3条（サービス内容）</h2>
          <p>
            本サービスは、ユーザーが記録したふりかえりを AI で分析し、自己理解を支援するサービスです。
            運営者はサービスの内容を予告なく変更・中断・終了する場合があります。
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">第4条（料金・課金）</h2>
          <p>
            Free プランは無料でご利用いただけます。Deep プランは月額 980 円（税込）のサブスクリプションです。
            決済は Stripe を通じて行われ、解約はいつでも可能です。
            解約後も課金期間の終了まで Deep プランの機能をご利用いただけます。
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">第5条（禁止事項）</h2>
          <p>以下の行為は禁止されています。</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>法令に違反する行為</li>
            <li>本サービスの運営を妨害する行為</li>
            <li>不正アクセスやリバースエンジニアリング</li>
            <li>他のユーザーへの迷惑行為</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">第6条（退会）</h2>
          <p>
            ユーザーはいつでも退会できます。退会時にすべてのデータが削除され、復元はできません。
            有料プランをご利用中に退会された場合、残りの期間分の返金は行いません。
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">第7条（免責事項）</h2>
          <p>
            本サービスの AI 分析結果は参考情報であり、医療・心理カウンセリングの代替ではありません。
            運営者は分析結果の正確性や有用性を保証しません。
            データの消失・損害について、運営者の故意または重過失による場合を除き、責任を負いません。
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">第8条（規約の変更）</h2>
          <p>
            運営者は本規約を変更する場合があります。変更後も本サービスの利用を継続された場合、変更に同意されたものとみなします。
          </p>
        </section>

        <p className="text-xs text-muted-foreground pt-4">制定日: 2026年2月15日</p>
      </div>
    </main>
  );
}

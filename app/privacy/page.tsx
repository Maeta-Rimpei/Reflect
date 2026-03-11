import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link
        href="/settings"
        className="text-xs text-muted-foreground hover:text-foreground mb-8 inline-block"
      >
        ← 設定に戻る
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-8">
        プライバシーポリシー
      </h1>
      <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-sm text-muted-foreground leading-relaxed">
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">1. 収集する情報</h2>
          <p>本サービスでは以下の情報を収集します。</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Google アカウント情報（名前、メールアドレス）</li>
            <li>ユーザーが入力したふりかえり（日記）の本文</li>
            <li>ユーザーが選択した気分情報</li>
            <li>AI が生成した分析結果（感情タグ、思考傾向、コメント等）</li>
            <li>課金情報（Stripe を通じた決済情報）</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">2. 利用目的</h2>
          <p>収集した情報は以下の目的で利用します。</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>サービスの提供・改善</li>
            <li>AI 分析機能の実行</li>
            <li>ユーザー認証・アカウント管理</li>
            <li>課金処理</li>
            <li>お問い合わせ対応</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">3. 第三者への提供</h2>
          <p>
            ユーザーの個人情報を本人の同意なく第三者に提供することはありません。
            ただし、以下の場合を除きます。
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>法令に基づく場合</li>
            <li>サービス提供に必要な業務委託先への提供</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">4. AI によるデータ処理</h2>
          <p>
            ふりかえりの内容は AIに送信し、分析結果を生成します。
            AI への入力は分析目的のみに使用され、AI モデルの学習には使用されません。
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">5. データの保管</h2>
          <p>
            データは クラウドデータベース に保管されます。
            ユーザーが退会された場合、すべてのデータを速やかに削除します。
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">6. Cookie</h2>
          <p>
            本サービスではセッション管理のために Cookie を使用しています。
            トラッキング目的の Cookie は使用していません。
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">7. お問い合わせ</h2>
          <p>
            プライバシーに関するお問い合わせは、アプリ内の設定画面からご連絡ください。
          </p>
        </section>

        <p className="text-xs text-muted-foreground pt-4">制定日: 2026年2月15日</p>
      </div>
    </main>
  );
}

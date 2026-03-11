/**
 * フロントから API を呼ぶ際に付与するヘッダーを返す。
 * NextAuth は Cookie でセッションを送るため、同一オリジンでは credentials: 'include' を付与すればよい。
 * 現状は空オブジェクト。将来的に CSRF トークンなどを付与する場合に使う。
 * @returns リクエストヘッダーにそのまま展開するオブジェクト
 */
export async function getApiHeaders(): Promise<Record<string, string>> {
  return {};
}

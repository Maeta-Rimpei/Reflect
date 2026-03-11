function checkMessage(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes("not enabled") ||
    lower.includes("unsupported provider") ||
    lower.includes("provider is not enabled") ||
    (lower.includes("validation_failed") && lower.includes("provider"))
  );
}

/**
 * Supabase の「Google provider is not enabled」系エラーかどうかを判定する。
 * API が { code, error_code, msg } や、クライアントが { message } を返す場合、
 * またはリダイレクト URL の error / error_description に対応。
 */
export function isGoogleProviderDisabledError(
  error: unknown,
  urlParams?: { error?: string; error_description?: string },
): boolean {
  let msg = "";
  if (typeof error === "string") {
    msg = error;
    try {
      const parsed = JSON.parse(error) as { msg?: string; message?: string };
      msg = parsed.msg ?? parsed.message ?? msg;
    } catch {
      /* use msg as-is */
    }
  } else if (typeof error === "object" && error !== null) {
    const o = error as { message?: string; msg?: string };
    msg = o.message ?? o.msg ?? "";
    if (msg.startsWith("{")) {
      try {
        const parsed = JSON.parse(msg) as { msg?: string };
        msg = parsed.msg ?? msg;
      } catch {
        /* use msg as-is */
      }
    }
  }
  if (checkMessage(msg)) return true;
  const desc = urlParams?.error_description ?? urlParams?.error ?? "";
  if (checkMessage(String(desc))) return true;
  return false;
}

export const GOOGLE_PROVIDER_DISABLED_MESSAGE =
  "Google ログインが有効になっていません。下記の手順で Supabase ダッシュボードと Google Cloud の設定を行ってください。";

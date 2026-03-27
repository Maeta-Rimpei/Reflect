import { Resend } from "resend";
import { logger } from "@/lib/logger";

const apiKey = process.env.RESEND_API_KEY ?? "";

export function isResendConfigured(): boolean {
  return Boolean(apiKey);
}

let _resend: Resend | null = null;

export function getResend(): Resend {
  if (!_resend) {
    if (!apiKey) {
      logger.error("[resend] RESEND_API_KEY が未設定");
      throw new Error("RESEND_API_KEY is not configured");
    }
    _resend = new Resend(apiKey);
  }
  return _resend;
}

/** メール送信元（環境変数 RESEND_FROM_EMAIL で指定。例: Reflect <onboarding@reflect-app.jp>） */
export const MAIL_FROM = process.env.RESEND_FROM_EMAIL;

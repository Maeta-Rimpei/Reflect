import { NextRequest, NextResponse } from "next/server";
import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase-admin";
import { logger } from "@/lib/logger";

/**
 * Magic Link トークンを検証する（セッション発行前の事前チェック）。
 * トークンは検証のみで消費しない（消費は auth.ts の magic-link authorize で行う）。
 */
export async function POST(req: NextRequest) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: "unavailable", message: "サービスが利用できません。" },
      { status: 503 },
    );
  }

  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "validation", message: "Invalid JSON" },
      { status: 400 },
    );
  }

  const token = body.token;
  if (!token) {
    return NextResponse.json(
      { error: "validation", message: "無効なリンクです。" },
      { status: 400 },
    );
  }

  try {
    const supabase = createSupabaseAdminClient();

    const { data: tokenRow } = await supabase
      .from("magic_link_tokens")
      .select("id, email, expires_at")
      .eq("token", token)
      .single();

    if (!tokenRow) {
      return NextResponse.json(
        { error: "invalid", message: "リンクの有効期限が切れているか、すでに使用済みです。" },
        { status: 401 },
      );
    }

    if (new Date(tokenRow.expires_at) < new Date()) {
      // 期限切れトークンを削除
      await supabase
        .from("magic_link_tokens")
        .delete()
        .eq("id", tokenRow.id);
      return NextResponse.json(
        { error: "expired", message: "リンクの有効期限が切れています。再度登録してください。" },
        { status: 401 },
      );
    }

    return NextResponse.json({ ok: true, email: tokenRow.email });
  } catch (e) {
    logger.errorException("[verify-token] トークン検証でエラー", e);
    return NextResponse.json(
      { error: "internal", message: "エラーが発生しました。" },
      { status: 500 },
    );
  }
}

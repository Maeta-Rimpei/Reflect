import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase-admin";
import { encrypt, decrypt, isEncryptionConfigured } from "@/lib/crypto";
import { logger } from "@/lib/logger";
import {
  FREE_PLAN_HISTORY_DAYS,
  MAX_JOURNAL_BODY_LENGTH_FREE,
} from "@/constants/limits";
import { PLAN_DEEP, PLAN_FREE } from "@/constants/plan";
import type { Plan } from "@/types/plan";

/**
 * ふりかえりエントリを1件保存する。
 * 認証必須。1日1件まで。body/mood 必須。
 * 日次AI分析は `/api/v1/analysis/generate`（type: daily）で別途実行する。
 * @param req - JSON body: { body: string, mood: string }
 * @returns 201 + エントリ情報（dailyAnalysis は互換のため常に null）、または 400/401/429/500
 */
export async function POST(req: NextRequest) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: "unavailable", message: "Supabase is not configured" },
      { status: 503 },
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "unauthorized", message: "Authorization required" },
      { status: 401 },
    );
  }

  const userId = session.user.id;
  const email = session.user.email ?? null;
  const name = session.user.name ?? null;

  try {
    const supabase = createSupabaseAdminClient();

    // entries の user_id FK のために、users にレコードが存在することを保証する
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("users")
        .update({ email, name, updated_at: new Date().toISOString() })
        .eq("id", userId);
    } else {
      await supabase.from("users").insert({
        id: userId,
        email,
        name,
        plan: PLAN_FREE,
        updated_at: new Date().toISOString(),
      });
    }

    const body = (await req.json().catch(() => null)) as {
      body?: string;
      mood?: string;
    } | null;

    const text = typeof body?.body === "string" ? body.body.trim() : "";
    const mood = typeof body?.mood === "string" ? body.mood.trim() : "";

    if (!text) {
      return NextResponse.json(
        { error: "validation", message: "body is required" },
        { status: 400 },
      );
    }

    if (!mood) {
      return NextResponse.json(
        { error: "validation", message: "mood is required" },
        { status: 400 },
      );
    }

    let plan: Plan = PLAN_FREE;
    const { data: profile } = await supabase
      .from("users")
      .select("plan")
      .eq("id", userId)
      .single();
    if (profile?.plan === PLAN_DEEP || profile?.plan === PLAN_FREE)
      plan = profile.plan;

    if (plan === PLAN_FREE && text.length > MAX_JOURNAL_BODY_LENGTH_FREE) {
      return NextResponse.json(
        {
          error: "validation",
          message: `Free plan: body must be ${MAX_JOURNAL_BODY_LENGTH_FREE} characters or less`,
        },
        { status: 400 },
      );
    }

    const postedAt = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });

    // 同日既存エントリがあれば 429（1日1件制限）
    {
      const { data: existingEntry } = await supabase
        .from("entries")
        .select("id")
        .eq("user_id", userId)
        .eq("posted_at", postedAt)
        .limit(1)
        .maybeSingle();

      if (existingEntry) {
        return NextResponse.json(
          { error: "limit_exceeded", message: "本日はすでに投稿済みです。" },
          { status: 429 },
        );
      }
    }

    const storedBody = isEncryptionConfigured() ? encrypt(text) : text;

    const { data: entry, error: insertError } = await supabase
      .from("entries")
      .insert({
        user_id: userId,
        body: storedBody,
        posted_at: postedAt,
      })
      .select()
      .single();

    if (insertError || !entry) {
      return NextResponse.json(
        { error: "db_error", message: insertError?.message ?? "Failed to save entry" },
        { status: 500 },
      );
    }

    const { error: moodError } = await supabase.from("moods").insert({
      user_id: userId,
      entry_id: entry.id,
      value: mood,
    });
    if (moodError) {
      logger.error("[entries] 気分の保存に失敗", {
        message: moodError.message,
        code: moodError.code,
        details: moodError.details,
      });
    }

    return NextResponse.json(
      {
        id: entry.id,
        userId: entry.user_id,
        body: text,
        wordCount: text.length,
        postedAt: entry.posted_at,
        createdAt: entry.created_at,
        mood,
        dailyAnalysis: null,
      },
      { status: 201 },
    );
  } catch (e) {
    logger.errorException("[entries POST] エントリー保存でエラー", e, {
      userId,
    });
    return NextResponse.json(
      { error: "internal", message: "Failed to create entry" },
      { status: 500 },
    );
  }
}

/**
 * 指定期間のふりかえりエントリ一覧を取得する。
 * 認証必須。Free プランは from-to が 7 日以内でなければ 403。
 * @param req - query: from, to (YYYY-MM-DD)
 * @returns 200 + EntryItem[]、または 400/401/403/500
 */
export async function GET(req: NextRequest) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: "unavailable", message: "Supabase is not configured" },
      { status: 503 },
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "unauthorized", message: "Authorization required" },
      { status: 401 },
    );
  }

  const userId = session.user.id;

  const { searchParams } = new URL(req.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  if (!fromParam || !toParam) {
    return NextResponse.json(
      { error: "validation", message: "from and to (YYYY-MM-DD) are required" },
      { status: 400 },
    );
  }

  try {
    const supabase = createSupabaseAdminClient();

    let plan: Plan = PLAN_FREE;
    const { data: profile } = await supabase
      .from("users")
      .select("plan")
      .eq("id", userId)
      .single();
    if (profile?.plan === PLAN_DEEP || profile?.plan === PLAN_FREE)
      plan = profile.plan;

    const fromDate = new Date(fromParam);
    const toDate = new Date(toParam);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return NextResponse.json(
        { error: "validation", message: "Invalid from or to date" },
        { status: 400 },
      );
    }

    if (plan === PLAN_FREE) {
      const rangeDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
      if (rangeDays > FREE_PLAN_HISTORY_DAYS) {
        // Free は 7 日を超える範囲は 403
        return NextResponse.json(
          { error: "plan_limit", message: "Free plan: up to 7 days of history" },
          { status: 403 },
        );
      }
    }

    const { data: entries, error } = await supabase
      .from("entries")
      .select("id, body, posted_at, created_at")
      .eq("user_id", userId)
      .gte("posted_at", fromParam)
      .lte("posted_at", toParam)
      .order("posted_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "db_error", message: error.message },
        { status: 500 },
      );
    }

    const withMoods: Array<{
      id: string;
      body: string;
      wordCount: number;
      postedAt: string;
      createdAt: string;
      mood: string | null;
    }> = [];

    for (const e of entries ?? []) {
      const { data: moodRow } = await supabase
        .from("moods")
        .select("value")
        .eq("entry_id", e.id)
        .limit(1)
        .maybeSingle();
      const plainBody = isEncryptionConfigured() ? decrypt(e.body) : e.body;
      withMoods.push({
        id: e.id,
        body: plainBody,
        wordCount: plainBody?.length ?? 0,
        postedAt: e.posted_at,
        createdAt: e.created_at,
        mood: moodRow?.value ?? null,
      });
    }

    return NextResponse.json(withMoods);
  } catch (e) {
    logger.errorException("[entries GET] エントリー取得でエラー", e, {
      userId,
    });
    return NextResponse.json(
      { error: "internal", message: "Failed to list entries" },
      { status: 500 },
    );
  }
}

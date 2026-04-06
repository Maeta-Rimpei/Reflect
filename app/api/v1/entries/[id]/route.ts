import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase-admin";
import { decrypt, encrypt, isEncryptionConfigured } from "@/lib/crypto";
import { logger } from "@/lib/logger";
import { MAX_JOURNAL_BODY_LENGTH_FREE } from "@/constants/limits";
import { PLAN_DEEP, PLAN_FREE } from "@/constants/plan";
import type { Plan } from "@/types/plan";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { error: "validation", message: "id is required" },
      { status: 400 },
    );
  }

  try {
    const supabase = createSupabaseAdminClient();

    const { data: entry, error } = await supabase
      .from("entries")
      .select("id, user_id, body, posted_at, created_at")
      .eq("id", id)
      .single();

    if (error || !entry || entry.user_id !== userId) {
      return NextResponse.json(
        { error: "not_found", message: "Entry not found" },
        { status: 404 },
      );
    }

    const { data: moodRow } = await supabase
      .from("moods")
      .select("value")
      .eq("entry_id", id)
      .limit(1)
      .maybeSingle();

    const plainBody = isEncryptionConfigured() ? decrypt(entry.body) : entry.body;

    return NextResponse.json({
      id: entry.id,
      userId: entry.user_id,
      body: plainBody,
      wordCount: plainBody?.length ?? 0,
      postedAt: entry.posted_at,
      createdAt: entry.created_at,
      mood: moodRow?.value ?? null,
    });
  } catch (e) {
    logger.errorException("[entries GET id] エントリー取得でエラー", e, {
      userId,
      entryId: id,
    });
    return NextResponse.json(
      { error: "internal", message: "Failed to get entry" },
      { status: 500 },
    );
  }
}

/**
 * ふりかえりを編集する。Gemini は呼ばない。
 * analysis_results・emotion_tags には一切触れない（編集と分析は完全に分離）。
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { error: "validation", message: "id is required" },
      { status: 400 },
    );
  }

  const payload = (await req.json().catch(() => null)) as {
    body?: string;
    mood?: string;
  } | null;

  const hasBody = typeof payload?.body === "string";
  const hasMood = typeof payload?.mood === "string";
  if (!hasBody && !hasMood) {
    return NextResponse.json(
      { error: "validation", message: "body または mood のいずれかが必要です。" },
      { status: 400 },
    );
  }

  const text = hasBody ? payload!.body!.trim() : "";
  const mood = hasMood ? payload!.mood!.trim() : "";

  if (hasBody && !text) {
    return NextResponse.json(
      { error: "validation", message: "body が空です。" },
      { status: 400 },
    );
  }

  if (hasMood && !mood) {
    return NextResponse.json(
      { error: "validation", message: "mood が空です。" },
      { status: 400 },
    );
  }

  try {
    const supabase = createSupabaseAdminClient();

    const { data: profile } = await supabase
      .from("users")
      .select("plan")
      .eq("id", userId)
      .single();
    const plan: Plan =
      profile?.plan === PLAN_DEEP || profile?.plan === PLAN_FREE
        ? profile.plan
        : PLAN_FREE;

    if (plan === PLAN_FREE && hasBody && text.length > MAX_JOURNAL_BODY_LENGTH_FREE) {
      return NextResponse.json(
        {
          error: "validation",
          message: `Free plan: body must be ${MAX_JOURNAL_BODY_LENGTH_FREE} characters or less`,
        },
        { status: 400 },
      );
    }

    const { data: entry, error: entryError } = await supabase
      .from("entries")
      .select("id, body, posted_at")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (entryError || !entry) {
      return NextResponse.json(
        { error: "not_found", message: "Entry not found" },
        { status: 404 },
      );
    }

    const storedBody =
      hasBody && text
        ? isEncryptionConfigured()
          ? encrypt(text)
          : text
        : undefined;

    if (storedBody !== undefined) {
      const { error: updErr } = await supabase
        .from("entries")
        .update({ body: storedBody })
        .eq("id", id)
        .eq("user_id", userId);
      if (updErr) {
        logger.error("[entries PATCH] body 更新エラー", {
          message: updErr.message,
          userId,
          entryId: id,
        });
        return NextResponse.json(
          { error: "db_error", message: "Failed to update entry" },
          { status: 500 },
        );
      }
    }

    if (hasMood) {
      await supabase.from("moods").delete().eq("entry_id", id);
      const { error: moodInsErr } = await supabase.from("moods").insert({
        user_id: userId,
        entry_id: id,
        value: mood,
      });
      if (moodInsErr) {
        logger.error("[entries PATCH] mood 更新エラー", {
          message: moodInsErr.message,
          userId,
          entryId: id,
        });
      }
    }

    const plainOut =
      storedBody !== undefined
        ? isEncryptionConfigured()
          ? decrypt(storedBody)
          : storedBody
        : isEncryptionConfigured()
          ? decrypt(entry.body)
          : entry.body;

    const { data: moodRow } = await supabase
      .from("moods")
      .select("value")
      .eq("entry_id", id)
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      id,
      body: plainOut ?? "",
      wordCount: (plainOut ?? "").length,
      postedAt: entry.posted_at,
      mood: moodRow?.value ?? null,
    });
  } catch (e) {
    logger.errorException("[entries PATCH] エラー", e, { userId, entryId: id });
    return NextResponse.json(
      { error: "internal", message: "Failed to update entry" },
      { status: 500 },
    );
  }
}

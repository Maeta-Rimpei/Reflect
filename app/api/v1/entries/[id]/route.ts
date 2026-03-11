import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase-admin";
import { decrypt, isEncryptionConfigured } from "@/lib/crypto";
import { logger } from "@/lib/logger";

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
    logger.errorException("[entries GET id] エントリー取得でエラー", e);
    return NextResponse.json(
      { error: "internal", message: "Failed to get entry" },
      { status: 500 },
    );
  }
}

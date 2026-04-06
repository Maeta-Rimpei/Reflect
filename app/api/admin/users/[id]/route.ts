import { NextResponse } from "next/server";
import { requireAdminJson } from "@/lib/admin-api-auth";
import { fetchAdminUserDetail } from "@/lib/fetch-admin-users";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/users/[id]
 */
export async function GET(_req: Request, context: RouteContext) {
  const gate = await requireAdminJson();
  if (!gate.ok) {
    return gate.response;
  }

  const { id } = await context.params;
  const detail = await fetchAdminUserDetail(id);

  if (!detail.user) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(detail);
}

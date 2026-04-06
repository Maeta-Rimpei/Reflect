import { NextResponse } from "next/server";
import { requireAdminJson } from "@/lib/admin-api-auth";
import { fetchAdminContactById } from "@/lib/fetch-admin-contact";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/contact-requests/[id]
 */
export async function GET(_req: Request, context: RouteContext) {
  const gate = await requireAdminJson();
  if (!gate.ok) {
    return gate.response;
  }

  const { id } = await context.params;
  const row = await fetchAdminContactById(id);

  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(row);
}

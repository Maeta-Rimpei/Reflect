import { NextRequest, NextResponse } from "next/server";
import { requireAdminJson } from "@/lib/admin-api-auth";
import { fetchAdminUsersList } from "@/lib/fetch-admin-users";

/**
 * GET /api/admin/users?q=&page=&pageSize=
 */
export async function GET(req: NextRequest) {
  const gate = await requireAdminJson();
  if (!gate.ok) {
    return gate.response;
  }

  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q") ?? undefined;
  const page = searchParams.get("page");
  const pageSize = searchParams.get("pageSize");

  const result = await fetchAdminUsersList({
    q,
    page: page ? Number(page) : undefined,
    pageSize: pageSize ? Number(pageSize) : undefined,
  });

  return NextResponse.json(result);
}

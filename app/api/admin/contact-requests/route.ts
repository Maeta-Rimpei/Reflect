import { NextRequest, NextResponse } from "next/server";
import { requireAdminJson } from "@/lib/admin-api-auth";
import { fetchAdminContactList } from "@/lib/fetch-admin-contact";

/**
 * GET /api/admin/contact-requests?page=&pageSize=
 */
export async function GET(req: NextRequest) {
  const gate = await requireAdminJson();
  if (!gate.ok) {
    return gate.response;
  }

  const { searchParams } = req.nextUrl;
  const page = searchParams.get("page");
  const pageSize = searchParams.get("pageSize");

  const result = await fetchAdminContactList({
    page: page ? Number(page) : undefined,
    pageSize: pageSize ? Number(pageSize) : undefined,
  });

  return NextResponse.json(result);
}

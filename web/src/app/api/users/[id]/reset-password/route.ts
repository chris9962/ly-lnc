import { NextResponse, type NextRequest } from "next/server";
import { requireApi } from "@/lib/permissions";
import { respond } from "@/server/http";
import { resetPassword } from "@/server/users";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApi(request);
  if (user instanceof NextResponse) return user;

  return respond(await resetPassword(user, Number((await params).id)));
}

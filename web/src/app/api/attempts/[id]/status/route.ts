import { NextResponse, type NextRequest } from "next/server";
import { requireApi } from "@/lib/permissions";
import { attemptStatus } from "@/server/attempts";
import { respond } from "@/server/http";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Context) {
  const user = await requireApi(request);
  if (user instanceof NextResponse) return user;

  return respond(attemptStatus(user, Number((await params).id)));
}

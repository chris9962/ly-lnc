import { NextResponse, type NextRequest } from "next/server";
import { requireApi } from "@/lib/permissions";
import { startAttempt } from "@/server/attempts";
import { respond } from "@/server/http";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Context) {
  const user = await requireApi(request, "exams.take");
  if (user instanceof NextResponse) return user;

  return respond(startAttempt(user, Number((await params).id)));
}

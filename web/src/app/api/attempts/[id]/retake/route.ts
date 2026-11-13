import { NextResponse, type NextRequest } from "next/server";
import { requireApi } from "@/lib/permissions";
import { retakeAttempt } from "@/server/exams";
import { respond } from "@/server/http";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Context) {
  const user = await requireApi(request, "exams.manage");
  if (user instanceof NextResponse) return user;

  return respond(retakeAttempt(user, Number((await params).id)));
}

import { NextResponse, type NextRequest } from "next/server";
import { requireApi } from "@/lib/permissions";
import { startPractice } from "@/server/attempts";
import { respond } from "@/server/http";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Context) {
  const user = await requireApi(request, "papers.manage");
  if (user instanceof NextResponse) return user;

  return respond(startPractice(user, Number((await params).id)));
}

import { NextResponse, type NextRequest } from "next/server";
import { requireApi } from "@/lib/permissions";
import { respond } from "@/server/http";
import { defaultLayout } from "@/server/papers";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Context) {
  const user = await requireApi(request, "papers.manage");
  if (user instanceof NextResponse) return user;

  return respond(await defaultLayout(user, Number((await params).id)));
}

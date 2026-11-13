import { NextResponse, type NextRequest } from "next/server";
import { saveLayoutForm } from "@/lib/paperForm";
import { requireApi } from "@/lib/permissions";
import { parseBody, respond } from "@/server/http";
import { savePaperLayout } from "@/server/papers";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Context) {
  const user = await requireApi(request, "papers.manage");
  if (user instanceof NextResponse) return user;
  const body = await parseBody(request, saveLayoutForm);
  if ("response" in body) return body.response;
  const { baseVersion, lockToken, ...layout } = body.data;

  return respond(await savePaperLayout(user, Number((await params).id), layout, baseVersion, lockToken));
}

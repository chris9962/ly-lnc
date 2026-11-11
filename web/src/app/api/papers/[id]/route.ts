import { NextResponse, type NextRequest } from "next/server";
import { paperMetaForm } from "@/lib/paperForm";
import { requireApi } from "@/lib/permissions";
import { parseBody, respond } from "@/server/http";
import { deletePaper, updatePaperMeta } from "@/server/papers";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Context) {
  const user = await requireApi(request, "papers.manage");
  if (user instanceof NextResponse) return user;
  const body = await parseBody(request, paperMetaForm);
  if ("response" in body) return body.response;

  return respond(updatePaperMeta(user, Number((await params).id), body.data));
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const user = await requireApi(request, "papers.manage");
  if (user instanceof NextResponse) return user;

  return respond(deletePaper(user, Number((await params).id)));
}

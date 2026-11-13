import { NextResponse, type NextRequest } from "next/server";
import { paperLockForm } from "@/lib/paperForm";
import { requireApi } from "@/lib/permissions";
import { parseBody, respond } from "@/server/http";
import { holdPaperFor, releasePaperFor } from "@/server/paperLocks";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Context) {
  const user = await requireApi(request, "papers.manage");
  if (user instanceof NextResponse) return user;
  const body = await parseBody(request, paperLockForm);
  if ("response" in body) return body.response;

  return respond(holdPaperFor(user, Number((await params).id), body.data.token));
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const user = await requireApi(request, "papers.manage");
  if (user instanceof NextResponse) return user;
  const body = await parseBody(request, paperLockForm);
  if ("response" in body) return body.response;

  return respond(releasePaperFor(user, Number((await params).id), body.data.token));
}

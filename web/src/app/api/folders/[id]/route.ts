import { NextResponse, type NextRequest } from "next/server";
import { folderForm } from "@/lib/paperForm";
import { requireApi } from "@/lib/permissions";
import { deleteFolder, renameFolder } from "@/server/folders";
import { parseBody, respond } from "@/server/http";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Context) {
  const user = await requireApi(request, "papers.manage");
  if (user instanceof NextResponse) return user;
  const body = await parseBody(request, folderForm);
  if ("response" in body) return body.response;

  return respond(renameFolder(user, Number((await params).id), body.data));
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const user = await requireApi(request, "papers.manage");
  if (user instanceof NextResponse) return user;

  return respond(deleteFolder(user, Number((await params).id)));
}

import { NextResponse, type NextRequest } from "next/server";
import { folderForm } from "@/lib/paperForm";
import { requireApi } from "@/lib/permissions";
import { createFolder } from "@/server/folders";
import { parseBody, respond } from "@/server/http";

export async function POST(request: NextRequest) {
  const user = await requireApi(request, "papers.manage");
  if (user instanceof NextResponse) return user;
  const body = await parseBody(request, folderForm);
  if ("response" in body) return body.response;

  return respond(createFolder(user, body.data));
}

import { NextResponse, type NextRequest } from "next/server";
import { requireApi } from "@/lib/permissions";
import { webpResponse } from "@/server/http";
import { pageImage } from "@/server/papers";
import { NOT_FOUND } from "@/server/result";

type Context = { params: Promise<{ id: string; page: string }> };

export async function GET(request: NextRequest, { params }: Context) {
  const user = await requireApi(request, "papers.manage");
  if (user instanceof NextResponse) return user;
  const { id, page } = await params;
  const image = await pageImage(user, Number(id), Number(page));
  if (!image) return NextResponse.json(NOT_FOUND, { status: 404 });

  return webpResponse(image);
}

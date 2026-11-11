import { NextResponse, type NextRequest } from "next/server";
import { requireApi } from "@/lib/permissions";
import { webpResponse } from "@/server/http";
import { paperImage } from "@/server/papers";
import { NOT_FOUND } from "@/server/result";

type Context = { params: Promise<{ id: string; name: string }> };

export async function GET(request: NextRequest, { params }: Context) {
  const user = await requireApi(request);
  if (user instanceof NextResponse) return user;
  const { id, name } = await params;
  const match = /^([qc])(\d+)\.webp$/.exec(name);
  const image = match && (await paperImage(user, Number(id), match[1] as "q" | "c", Number(match[2])));
  if (!image) return NextResponse.json(NOT_FOUND, { status: 404 });

  return webpResponse(image);
}

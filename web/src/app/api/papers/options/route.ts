import { NextResponse, type NextRequest } from "next/server";
import { paperOptionsQuery } from "@/lib/examForm";
import { requireApi } from "@/lib/permissions";
import { parseWith, respond } from "@/server/http";
import { paperOptions } from "@/server/papers";

export async function GET(request: NextRequest) {
  const user = await requireApi(request, "exams.manage");
  if (user instanceof NextResponse) return user;
  const query = parseWith(paperOptionsQuery, Object.fromEntries(request.nextUrl.searchParams));
  if ("response" in query) return query.response;

  return respond(paperOptions(user, query.data));
}

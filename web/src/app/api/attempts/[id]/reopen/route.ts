import { NextResponse, type NextRequest } from "next/server";
import { reopenForm } from "@/lib/examForm";
import { requireApi } from "@/lib/permissions";
import { reopenAttempt } from "@/server/exams";
import { parseBody, respond } from "@/server/http";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Context) {
  const user = await requireApi(request, "exams.manage");
  if (user instanceof NextResponse) return user;
  const body = await parseBody(request, reopenForm);
  if ("response" in body) return body.response;

  return respond(reopenAttempt(user, Number((await params).id), body.data.minutes));
}

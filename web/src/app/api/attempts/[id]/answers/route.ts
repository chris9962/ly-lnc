import { NextResponse, type NextRequest } from "next/server";
import { saveAnswerForm } from "@/lib/attemptForm";
import { requireApi } from "@/lib/permissions";
import { saveAnswer } from "@/server/attempts";
import { parseBody, respond } from "@/server/http";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Context) {
  const user = await requireApi(request);
  if (user instanceof NextResponse) return user;
  const body = await parseBody(request, saveAnswerForm);
  if ("response" in body) return body.response;

  return respond(saveAnswer(user, Number((await params).id), body.data));
}

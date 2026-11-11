import { NextResponse, type NextRequest } from "next/server";
import { updateExamForm } from "@/lib/examForm";
import { requireApi } from "@/lib/permissions";
import { deleteExam, updateExam } from "@/server/exams";
import { parseBody, respond } from "@/server/http";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Context) {
  const user = await requireApi(request, "exams.manage");
  if (user instanceof NextResponse) return user;
  const body = await parseBody(request, updateExamForm);
  if ("response" in body) return body.response;

  return respond(updateExam(user, Number((await params).id), body.data));
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const user = await requireApi(request, "exams.manage");
  if (user instanceof NextResponse) return user;

  return respond(deleteExam(user, Number((await params).id)));
}

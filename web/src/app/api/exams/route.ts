import { NextResponse, type NextRequest } from "next/server";
import { createExamForm } from "@/lib/examForm";
import { requireApi } from "@/lib/permissions";
import { createExam } from "@/server/exams";
import { parseBody, respond } from "@/server/http";

export async function POST(request: NextRequest) {
  const user = await requireApi(request, "exams.manage");
  if (user instanceof NextResponse) return user;
  const body = await parseBody(request, createExamForm);
  if ("response" in body) return body.response;

  return respond(createExam(user, body.data));
}

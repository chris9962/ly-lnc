import { NextResponse, type NextRequest } from "next/server";
import { passwordForm } from "@/lib/passwordForm";
import { homePath, requireApi } from "@/lib/permissions";
import { changePassword } from "@/server/auth";
import { parseBody, respond, setSessionCookie } from "@/server/http";
import { ok } from "@/server/result";

export async function POST(request: NextRequest) {
  const user = await requireApi(request);
  if (user instanceof NextResponse) return user;
  const body = await parseBody(request, passwordForm);
  if ("response" in body) return body.response;

  const result = await changePassword(user, body.data);
  if (!result.ok) return respond(result);

  const response = respond(ok({ redirect: homePath({ ...user, mustChangePassword: false }) }));
  setSessionCookie(response, request, result);
  return response;
}

import type { NextRequest } from "next/server";
import { loginForm } from "@/lib/loginForm";
import { homePath } from "@/lib/permissions";
import { login } from "@/server/auth";
import { clientIp, parseBody, respond, setSessionCookie } from "@/server/http";
import { ok } from "@/server/result";

export async function POST(request: NextRequest) {
  const body = await parseBody(request, loginForm);
  if ("response" in body) return body.response;

  const result = await login(body.data, clientIp(request));
  if (!result.ok) return respond(result);

  const response = respond(ok({ redirect: homePath(result.user) }));
  setSessionCookie(response, request, result);
  return response;
}

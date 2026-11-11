import { NextResponse, type NextRequest } from "next/server";
import { requireApi } from "@/lib/permissions";
import { logout } from "@/server/auth";
import { clearSessionCookie, respond } from "@/server/http";
import { SESSION_COOKIE } from "@/server/session";

export async function POST(request: NextRequest) {
  const user = await requireApi(request);
  if (user instanceof NextResponse) return user;

  const response = respond(logout(user, request.cookies.get(SESSION_COOKIE)?.value ?? ""));
  clearSessionCookie(response);
  return response;
}

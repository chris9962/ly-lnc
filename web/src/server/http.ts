import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import type { ZodType } from "zod";
import { fail, type Result } from "./result";
import { SESSION_COOKIE, type IssuedSession } from "./session";

export const respond = (result: Result) => NextResponse.json(result, { status: result.ok ? 200 : result.status });

export function parseWith<T>(schema: ZodType<T>, raw: unknown): { data: T } | { response: NextResponse } {
  const parsed = schema.safeParse(raw);
  if (parsed.success) return { data: parsed.data };
  const issue = parsed.error.issues[0];
  const field = typeof issue?.path[0] === "string" ? issue.path[0] : undefined;
  return { response: respond(fail(issue?.message ?? "Dữ liệu không hợp lệ", 400, field)) };
}

export async function parseBody<T>(request: NextRequest, schema: ZodType<T>) {
  return parseWith(schema, await request.json().catch(() => null));
}

export const clientIp = (request: NextRequest) =>
  request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";

export function setSessionCookie(response: NextResponse, request: NextRequest, session: IssuedSession) {
  response.cookies.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: "lax",
    // qua Cloudflare Tunnel trình duyệt dùng HTTPS còn máy chủ nhận HTTP, nên dựa vào header
    secure: request.headers.get("x-forwarded-proto") === "https",
    path: "/",
    expires: new Date(session.expiresAt),
  });
}

export const clearSessionCookie = (response: NextResponse) => response.cookies.delete(SESSION_COOKIE);

// đường dẫn ảnh mang số phiên bản của đề nên trình duyệt giữ lâu được; private để proxy không lưu chung
export const webpResponse = (image: Buffer) =>
  new NextResponse(new Uint8Array(image), { headers: { "content-type": "image/webp", "cache-control": "private, max-age=86400" } });

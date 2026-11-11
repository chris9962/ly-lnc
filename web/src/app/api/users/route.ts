import { NextResponse, type NextRequest } from "next/server";
import { manageAction, requireApi } from "@/lib/permissions";
import { createUsersForm, listUsersQuery } from "@/lib/userForm";
import { parseBody, parseWith, respond } from "@/server/http";
import { createUsers, listUsers } from "@/server/users";

export async function GET(request: NextRequest) {
  const query = parseWith(listUsersQuery, Object.fromEntries(request.nextUrl.searchParams));
  if ("response" in query) return query.response;
  const user = await requireApi(request, manageAction(query.data.role));
  if (user instanceof NextResponse) return user;

  return respond(listUsers(user, query.data));
}

export async function POST(request: NextRequest) {
  const body = await parseBody(request, createUsersForm);
  if ("response" in body) return body.response;
  const user = await requireApi(request, manageAction(body.data.role));
  if (user instanceof NextResponse) return user;

  return respond(await createUsers(user, body.data));
}

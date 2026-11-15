import { NextResponse, type NextRequest } from "next/server";
import { requireApi } from "@/lib/permissions";
import { bulkUsersForm } from "@/lib/userForm";
import { parseBody, respond } from "@/server/http";
import { bulkUsers } from "@/server/users";

export async function POST(request: NextRequest) {
  const user = await requireApi(request);
  if (user instanceof NextResponse) return user;
  const body = await parseBody(request, bulkUsersForm);
  if ("response" in body) return body.response;

  return respond(bulkUsers(user, body.data));
}

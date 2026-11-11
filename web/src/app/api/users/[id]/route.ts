import { NextResponse, type NextRequest } from "next/server";
import { requireApi } from "@/lib/permissions";
import { updateUserForm } from "@/lib/userForm";
import { parseBody, respond } from "@/server/http";
import { deleteUser, updateUser } from "@/server/users";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Context) {
  const user = await requireApi(request);
  if (user instanceof NextResponse) return user;
  const body = await parseBody(request, updateUserForm);
  if ("response" in body) return body.response;

  return respond(updateUser(user, Number((await params).id), body.data));
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const user = await requireApi(request);
  if (user instanceof NextResponse) return user;

  return respond(deleteUser(user, Number((await params).id)));
}

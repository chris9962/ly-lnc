import { NextResponse, type NextRequest } from "next/server";
import { paperMetaForm } from "@/lib/paperForm";
import { requireApi } from "@/lib/permissions";
import { parseWith, respond } from "@/server/http";
import { uploadPaper } from "@/server/papers";
import { fail } from "@/server/result";

export async function POST(request: NextRequest) {
  const user = await requireApi(request, "papers.manage");
  if (user instanceof NextResponse) return user;
  const form = await request.formData().catch(() => null);
  if (!form) return respond(fail("Dữ liệu không hợp lệ", 400));
  const meta = parseWith(paperMetaForm, { title: form.get("title") ?? "", grade: form.get("grade") ?? "", folderId: form.get("folderId") ?? "" });
  if ("response" in meta) return meta.response;
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) return respond(fail("Chọn file PDF", 400, "file"));

  return respond(await uploadPaper(user, meta.data, new Uint8Array(await file.arrayBuffer()), file.name));
}

import { NextResponse, type NextRequest } from "next/server";
import { formatDateTime } from "@/lib/format";
import { requireApi } from "@/lib/permissions";
import { examRoster, getExam } from "@/server/exams";
import { respond } from "@/server/http";
import { buildXlsx } from "@/server/xlsx";

type Context = { params: Promise<{ id: string }> };

const STATUS = { absent: "Chưa vào thi", working: "Đang làm", submitted: "Đã nộp" } as const;

export async function GET(request: NextRequest, { params }: Context) {
  const user = await requireApi(request, "exams.manage");
  if (user instanceof NextResponse) return user;
  const id = Number((await params).id);
  const detail = getExam(user, id);
  if (!detail.ok) return respond(detail);
  const roster = examRoster(user, id);
  if (!roster.ok) return respond(roster);

  const rows = [
    ["STT", "Họ tên", "Số điện thoại", "Trạng thái", "Điểm", "Điểm tối đa", "Giờ nộp"],
    ...roster.rows.map((row, index) => [
      index + 1,
      row.fullName,
      row.username,
      STATUS[row.status],
      row.score,
      row.maxScore,
      row.submittedAt ? formatDateTime(row.submittedAt) : null,
    ]),
  ];
  const file = buildXlsx("Bảng điểm", rows);
  const name = `Bang diem ${detail.exam.title}`.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/[^\w\- ]+/g, "").trim();
  return new NextResponse(new Uint8Array(file), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${name || "bang-diem"}.xlsx"; filename*=UTF-8''${encodeURIComponent(`Bảng điểm ${detail.exam.title}`)}.xlsx`,
      "cache-control": "no-store",
    },
  });
}

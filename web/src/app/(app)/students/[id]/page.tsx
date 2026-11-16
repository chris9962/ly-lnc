import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EditAccountButton } from "@/components/accounts/EditAccountButton";
import { StudentProfileView } from "@/components/students/StudentProfileView";
import { StatusTag } from "@/components/ui/StatusTag";
import { formatDate } from "@/lib/format";
import { isGrade } from "@/lib/grades";
import { requirePage } from "@/lib/permissions";
import { getStudentProfile } from "@/server/students";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

const gradeOf = (value: string | string[] | undefined) => (typeof value === "string" && isGrade(Number(value)) ? Number(value) : undefined);

export async function generateMetadata({ params }: Props) {
  const user = await requirePage("students.manage");
  const profile = getStudentProfile(user, Number((await params).id), undefined);
  return { title: profile.ok ? profile.student.fullName : "Học sinh" };
}

export default async function StudentPage({ params, searchParams }: Props) {
  const user = await requirePage("students.manage");
  const id = Number((await params).id);
  const profile = getStudentProfile(user, id, gradeOf((await searchParams).grade));
  if (!profile.ok) notFound();
  const { student } = profile;

  return (
    <>
      <nav aria-label="Vị trí" className="mb-2 flex flex-wrap items-center text-sm">
        <Link href="/students" className="inline-flex items-center gap-1.5 text-muted hover:text-brand">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Học sinh
        </Link>
      </nav>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="mb-2 text-2xl font-bold">{student.fullName}</h1>
          <div className="flex flex-wrap items-center gap-2">
            {student.grade !== null && <StatusTag>Khối {student.grade}</StatusTag>}
            {student.disabled ? <StatusTag tone="danger">Đã khoá</StatusTag> : student.mustChangePassword ? <StatusTag tone="warning">Mật khẩu tạm</StatusTag> : <StatusTag tone="success">Đang dùng</StatusTag>}
            <span className="font-mono text-sm text-muted">{student.username}</span>
            <span className="text-sm text-muted">Tạo ngày {formatDate(student.createdAt)}</span>
          </div>
        </div>
        <EditAccountButton account={{ id: student.id, username: student.username, fullName: student.fullName, role: "student" }} />
      </div>

      <StudentProfileView profile={profile} basePath={`/students/${id}`} examLinks />
    </>
  );
}

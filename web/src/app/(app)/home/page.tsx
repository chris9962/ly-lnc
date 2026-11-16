import { notFound } from "next/navigation";
import { RefreshAt } from "@/components/exams/AutoRefresh";
import { StudentExamCard } from "@/components/exams/StudentExamCard";
import { StudentProfileView } from "@/components/students/StudentProfileView";
import { StatusTag } from "@/components/ui/StatusTag";
import { isGrade } from "@/lib/grades";
import { requirePage } from "@/lib/permissions";
import { myExams } from "@/server/attempts";
import { getMyProfile } from "@/server/students";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export const metadata = { title: "Trang chủ" };

const gradeOf = (value: string | string[] | undefined) => (typeof value === "string" && isGrade(Number(value)) ? Number(value) : undefined);

export default async function HomePage({ searchParams }: Props) {
  const user = await requirePage("exams.take");
  const profile = getMyProfile(user, gradeOf((await searchParams).grade));
  const groups = myExams(user);
  if (!profile.ok || !groups.ok) notFound();
  const { student } = profile;
  // tới giờ một kỳ thi bắt đầu hay kết thúc thì trang tự tải lại
  const changes = [...groups.upcoming.map((exam) => exam.startsAt), ...groups.running.map((exam) => exam.endsAt)];

  return (
    <>
      <RefreshAt at={changes.length ? Math.min(...changes) : null} />
      <div className="mb-4">
        <h1 className="mb-2 text-2xl font-bold">{student.fullName}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {student.grade !== null && <StatusTag>Khối {student.grade}</StatusTag>}
          <span className="font-mono text-sm text-muted">{student.username}</span>
        </div>
      </div>

      {/* kỳ thi đang mở nằm ngay đầu trang chủ để học sinh vào thi không phải tìm */}
      {groups.running.length > 0 && (
        <section aria-labelledby="home-running" className="mb-6">
          <h2 id="home-running" className="mb-3 text-lg font-bold">
            Đang diễn ra
          </h2>
          <ul className="space-y-3">
            {groups.running.map((exam) => (
              <StudentExamCard key={exam.id} exam={exam} status="running" />
            ))}
          </ul>
        </section>
      )}

      <StudentProfileView profile={profile} basePath="/home" />
    </>
  );
}

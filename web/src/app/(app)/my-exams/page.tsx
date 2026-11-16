import { notFound } from "next/navigation";
import { RefreshAt } from "@/components/exams/AutoRefresh";
import { STATUS_NAMES } from "@/components/exams/ExamStatusTag";
import { StudentExamCard } from "@/components/exams/StudentExamCard";
import { StatusTag } from "@/components/ui/StatusTag";
import { requirePage } from "@/lib/permissions";
import { myExams } from "@/server/attempts";

export const metadata = { title: "Kỳ thi" };

const ORDER = ["running", "upcoming", "ended"] as const;

export default async function MyExamsPage() {
  const user = await requirePage("exams.take");
  const groups = myExams(user);
  if (!groups.ok) notFound();
  // tới giờ một kỳ thi bắt đầu hay kết thúc thì trang tự tải lại
  const changes = [...groups.upcoming.map((exam) => exam.startsAt), ...groups.running.map((exam) => exam.endsAt)];
  const nextChange = changes.length ? Math.min(...changes) : null;

  return (
    <>
      <RefreshAt at={nextChange} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Kỳ thi</h1>
        <StatusTag>Khối {user.grade}</StatusTag>
      </div>

      {ORDER.map((status) => (
        <section key={status} aria-labelledby={`exams-${status}`} className="mb-6 last:mb-0">
          <h2 id={`exams-${status}`} className="mb-3 text-lg font-bold">
            {STATUS_NAMES[status]}
          </h2>
          {groups[status].length ? (
            <ul className="space-y-3">
              {groups[status].map((exam) => (
                <StudentExamCard key={exam.id} exam={exam} status={status} />
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-line px-4 py-3 text-muted">Chưa có kỳ thi</p>
          )}
        </section>
      ))}
    </>
  );
}

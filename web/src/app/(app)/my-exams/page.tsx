import Link from "next/link";
import { notFound } from "next/navigation";
import { RefreshAt } from "@/components/exams/AutoRefresh";
import { StartExamButton } from "@/components/exams/StartExamButton";
import { buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusTag } from "@/components/ui/StatusTag";
import { formatDateTime, formatRange, formatTime } from "@/lib/format";
import { requirePage } from "@/lib/permissions";
import { formatScore } from "@/lib/scoring";
import { myExams, type MyExam } from "@/server/attempts";

export const metadata = { title: "Kỳ thi" };

function Score({ attempt }: { attempt: NonNullable<MyExam["attempt"]> }) {
  return (
    <p className="text-lg font-bold">
      {formatScore(attempt.score ?? 0)}
      <span className="text-base font-normal text-muted"> / {formatScore(attempt.maxScore)} điểm</span>
    </p>
  );
}

function RunningExam({ exam }: { exam: MyExam }) {
  const attempt = exam.attempt;
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-4">
      <div className="min-w-0">
        <h3 className="font-bold">{exam.title}</h3>
        <p className="text-sm text-muted">
          {exam.questionCount} câu, {exam.durationMinutes} phút, kết thúc lúc {formatTime(exam.endsAt)} {formatDateTime(exam.endsAt).split(" ")[0]}
        </p>
      </div>
      {!attempt && <StartExamButton examId={exam.id} title={exam.title} minutes={exam.durationMinutes} />}
      {attempt && !attempt.submitted && (
        <Link href={`/attempts/${attempt.id}`} className={buttonClass("primary")}>
          Làm tiếp
        </Link>
      )}
      {attempt?.submitted && (
        <div className="flex items-center gap-4">
          <Score attempt={attempt} />
          <Link href={`/attempts/${attempt.id}`} className={buttonClass("secondary")}>
            Xem bài
          </Link>
        </div>
      )}
    </li>
  );
}

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

      <Card className="mb-4">
        <h2 className="mb-3 text-lg font-bold">Đang diễn ra</h2>
        {groups.running.length ? (
          <ul className="space-y-3">
            {groups.running.map((exam) => (
              <RunningExam key={exam.id} exam={exam} />
            ))}
          </ul>
        ) : (
          <p className="text-muted">Chưa có kỳ thi</p>
        )}
      </Card>

      <Card className="mb-4">
        <h2 className="mb-3 text-lg font-bold">Sắp diễn ra</h2>
        {groups.upcoming.length ? (
          <ul className="divide-y divide-line">
            {groups.upcoming.map((exam) => (
              <li key={exam.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
                <div>
                  <h3 className="font-semibold">{exam.title}</h3>
                  <p className="text-sm text-muted">
                    {exam.questionCount} câu, {exam.durationMinutes} phút
                  </p>
                </div>
                <p className="text-sm">{formatRange(exam.startsAt, exam.endsAt)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">Chưa có kỳ thi</p>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-bold">Đã kết thúc</h2>
        {groups.ended.length ? (
          <ul className="divide-y divide-line">
            {groups.ended.map((exam) => (
              <li key={exam.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div>
                  <h3 className="font-semibold">{exam.title}</h3>
                  <p className="text-sm text-muted">{formatRange(exam.startsAt, exam.endsAt)}</p>
                </div>
                {exam.attempt ? (
                  <div className="flex items-center gap-4">
                    <Score attempt={exam.attempt} />
                    <Link href={`/attempts/${exam.attempt.id}`} className={buttonClass("secondary", "sm")}>
                      Xem bài
                    </Link>
                  </div>
                ) : (
                  <StatusTag>Không làm bài</StatusTag>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">Chưa có kỳ thi</p>
        )}
      </Card>
    </>
  );
}

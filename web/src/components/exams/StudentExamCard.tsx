import Link from "next/link";
import { ExamStatusTag } from "@/components/exams/ExamStatusTag";
import { StartExamButton } from "@/components/exams/StartExamButton";
import { buttonClass } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { StatusTag } from "@/components/ui/StatusTag";
import { formatDate, formatRange, formatTime } from "@/lib/format";
import { formatScore } from "@/lib/scoring";
import type { MyExam } from "@/server/attempts";
import type { ExamStatus } from "@/server/exams";

// màu card theo trạng thái kỳ thi, cùng tông với nhãn trạng thái; nhãn chữ vẫn có để không chỉ dựa vào màu
const TONES: Record<ExamStatus, string> = {
  running: "border-success bg-success-soft",
  upcoming: "border-warning bg-warning-soft",
  ended: "border-line bg-surface-alt",
};

function Score({ attempt }: { attempt: NonNullable<MyExam["attempt"]> }) {
  return (
    <p className="text-lg font-bold">
      {formatScore(attempt.score ?? 0)}
      <span className="text-base font-normal text-muted"> / {formatScore(attempt.maxScore)} điểm</span>
    </p>
  );
}

export function StudentExamCard({ exam, status }: { exam: MyExam; status: ExamStatus }) {
  const attempt = exam.attempt;
  return (
    <li className={cx("flex flex-wrap items-center justify-between gap-3 rounded-xl border border-l-4 p-4", TONES[status])}>
      <div className="min-w-0">
        <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <h3 className="font-bold">{exam.title}</h3>
          <ExamStatusTag status={status} />
        </div>
        <p className="text-sm text-muted">
          {exam.questionCount} câu, {exam.durationMinutes} phút
          {status === "running" ? `, kết thúc lúc ${formatTime(exam.endsAt)} ${formatDate(exam.endsAt)}` : `, ${formatRange(exam.startsAt, exam.endsAt)}`}
        </p>
      </div>
      {status === "running" && !attempt && <StartExamButton examId={exam.id} title={exam.title} minutes={exam.durationMinutes} />}
      {attempt && !attempt.submitted && (
        <Link href={`/attempts/${attempt.id}`} className={buttonClass("primary")}>
          Làm tiếp
        </Link>
      )}
      {attempt?.submitted && (
        <div className="flex items-center gap-4">
          <Score attempt={attempt} />
          <Link href={`/attempts/${attempt.id}`} className={buttonClass("secondary", status === "ended" ? "sm" : "md")}>
            Xem bài
          </Link>
        </div>
      )}
      {status === "ended" && !attempt && <StatusTag>Không làm bài</StatusTag>}
    </li>
  );
}

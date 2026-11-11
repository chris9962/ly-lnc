import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cx } from "@/components/ui/cx";
import { StatusTag } from "@/components/ui/StatusTag";
import { formatDateTime, formatDuration } from "@/lib/format";
import { KIND_NAMES } from "@/lib/paperLayout";
import { describeAnswer, imageUrl, partTitle, partsOf, questionName } from "@/lib/paperView";
import { formatScore } from "@/lib/scoring";
import type { AttemptView } from "@/server/attempts";
import { QuestionImage } from "./QuestionImage";

type Props = { view: AttemptView; backHref: string; backLabel: string; retryPaperId?: number };

export function AttemptResult({ view, backHref, backLabel }: Props) {
  const { attempt, paper, questions, review, answers } = view;
  const contexts = new Map(view.contexts.map((context) => [context.seq, context]));
  const parts = partsOf(questions);
  const working = attempt.submittedAt === null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <nav aria-label="Vị trí" className="mb-3 text-sm">
        <Link href={backHref} className="inline-flex items-center gap-1.5 text-muted hover:text-brand">
          <ArrowLeft aria-hidden="true" className="size-4" />
          {backLabel}
        </Link>
      </nav>
      <Card className="mb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-muted">
              {attempt.isPractice ? (
                "Thi thử"
              ) : attempt.readOnly ? (
                <>
                  Bài làm của{" "}
                  <Link href={`/students/${attempt.ownerId}`} className="font-semibold text-ink hover:text-brand">
                    {attempt.ownerName}
                  </Link>
                  , {attempt.ownerUsername}
                </>
              ) : (
                "Bài làm"
              )}
            </p>
            <h1 className="text-2xl font-bold">{attempt.title}</h1>
            <p className="mt-1 text-sm text-muted">
              {working
                ? `Đang làm, hạn nộp ${attempt.deadline ? formatDateTime(attempt.deadline) : ""}`
                : `Nộp lúc ${formatDateTime(attempt.submittedAt!)}, làm trong ${formatDuration(attempt.submittedAt! - attempt.startedAt)}`}
            </p>
          </div>
          {!working && (
            <div className="text-right">
              <p className="text-sm text-muted">Điểm</p>
              <p className="text-4xl font-bold text-brand">
                {formatScore(attempt.score ?? 0)}
                <span className="text-xl font-semibold text-muted"> / {formatScore(attempt.maxScore)}</span>
              </p>
            </div>
          )}
        </div>
        {review && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {parts.map((part) => {
              const right = part.questions.filter((question) => review.marks[question.seq]?.correct).length;
              const points = part.questions.reduce((sum, question) => sum + (review.marks[question.seq]?.points ?? 0), 0);
              return (
                <div key={part.number} className="rounded-lg border border-line p-3">
                  <p className="text-sm text-muted">{partTitle(part.number, part.kind)}</p>
                  <p className="text-lg font-bold">
                    {right}/{part.questions.length} câu đúng hết
                  </p>
                  <p className="text-sm text-muted">{formatScore(points)} điểm</p>
                </div>
              );
            })}
          </div>
        )}
        {!review && !working && attempt.examEndsAt && <p className="mt-4 rounded-lg bg-surface-alt px-3 py-2 text-sm">Đáp án mở sau {formatDateTime(attempt.examEndsAt)}</p>}
        {attempt.isPractice && (
          <div className="mt-4 flex gap-2">
            <Link href={`/papers/${paper.id}`} className={buttonClass("secondary")}>
              <ArrowLeft aria-hidden="true" className="size-4" />
              Về trang đề
            </Link>
          </div>
        )}
      </Card>

      {/* chưa mở đáp án thì chỉ cần bảng bài làm gọn, không cần mở từng câu */}
      {!review &&
        parts.map((part) => (
          <section key={part.number} aria-labelledby={`result-part-${part.number}`} className="mb-6">
            <h2 id={`result-part-${part.number}`} className="mb-2 text-lg font-bold">
              {partTitle(part.number, part.kind)}
            </h2>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {part.questions.map((question) => {
                const text = describeAnswer(question.shape, answers[question.seq], paper.format);
                return (
                  <li key={question.seq} className="rounded-lg border border-line bg-surface px-3 py-2">
                    <span className="block text-sm text-muted">{questionName(question)}</span>
                    <span className={cx("font-semibold", text === "Bỏ trống" && "font-normal text-muted")}>{text}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

      {review && parts.map((part) => (
        <section key={part.number} aria-labelledby={`result-part-${part.number}`} className="mb-6">
          <h2 id={`result-part-${part.number}`} className="mb-2 text-lg font-bold">
            {partTitle(part.number, part.kind)}
          </h2>
          <ul className="space-y-2">
            {part.questions.map((question) => {
              const mark = review?.marks[question.seq];
              const context = question.contextSeq !== null ? contexts.get(question.contextSeq) : undefined;
              return (
                <li key={question.seq}>
                  <details className="group rounded-xl border border-line bg-surface">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
                      <span className="w-16 font-bold">{questionName(question)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="text-sm text-muted">Bài làm </span>
                        <span className="font-semibold">{describeAnswer(question.shape, answers[question.seq], paper.format)}</span>
                        {review && (
                          <span className="block text-sm">
                            <span className="text-muted">Đáp án </span>
                            <span className="font-semibold">{describeAnswer(question.shape, review.keys[question.seq], paper.format)}</span>
                          </span>
                        )}
                      </span>
                      {mark && (
                        <StatusTag tone={mark.correct ? "success" : mark.points > 0 ? "warning" : "danger"}>
                          {mark.correct ? "Đúng" : mark.points > 0 ? "Đúng một phần" : "Sai"}, {formatScore(mark.points)} điểm
                        </StatusTag>
                      )}
                      <span aria-hidden="true" className={cx("text-muted transition-transform group-open:rotate-180")}>
                        ▾
                      </span>
                    </summary>
                    <div className="border-t border-line p-3">
                      <p className="mb-2 text-sm text-muted">{KIND_NAMES[question.shape.kind]}</p>
                      {context && (
                        <div className="mb-3 rounded-lg border-l-4 border-kind-context bg-surface-alt p-2">
                          <QuestionImage src={imageUrl(paper.id, paper.imageVersion, "c", context.seq)} width={context.imageWidth} height={context.imageHeight} alt="Đoạn dẫn chung" />
                        </div>
                      )}
                      <QuestionImage src={imageUrl(paper.id, paper.imageVersion, "q", question.seq)} width={question.imageWidth} height={question.imageHeight} alt={`Nội dung ${questionName(question).toLowerCase()}`} />
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

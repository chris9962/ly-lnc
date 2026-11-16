import { notFound } from "next/navigation";
import { AttemptResult } from "@/components/exam/AttemptResult";
import { ExamRunner } from "@/components/exam/ExamRunner";
import { requirePage } from "@/lib/permissions";
import { getAttemptView } from "@/server/attempts";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const user = await requirePage();
  const view = getAttemptView(user, Number((await params).id));
  return { title: view.ok ? view.attempt.title : "Bài làm" };
}

export default async function AttemptPage({ params }: Props) {
  const user = await requirePage();
  const view = getAttemptView(user, Number((await params).id));
  if (!view.ok) notFound();
  const { attempt } = view;

  if (attempt.submittedAt === null && !attempt.readOnly) return <ExamRunner key={`${attempt.id}-${attempt.deadline}`} view={view} />;

  const back = attempt.readOnly && attempt.examId ? { href: `/exams/${attempt.examId}`, label: "Về kỳ thi" } : attempt.isPractice ? { href: `/papers/${view.paper.id}`, label: "Về trang đề" } : { href: "/home", label: "Về trang chủ" };
  return <AttemptResult view={view} backHref={back.href} backLabel={back.label} />;
}

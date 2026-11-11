import { notFound } from "next/navigation";
import type { EditorItem } from "@/components/editor/model";
import { PaperEditor } from "@/components/editor/PaperEditor";
import { requirePage } from "@/lib/permissions";
import { getPaper } from "@/server/papers";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const user = await requirePage("papers.manage");
  const detail = getPaper(user, Number((await params).id));
  return { title: detail.ok ? `Chỉnh khung ${detail.paper.title}` : "Chỉnh khung" };
}

export default async function EditPaperPage({ params }: Props) {
  const user = await requirePage("papers.manage");
  const detail = getPaper(user, Number((await params).id));
  if (!detail.ok) notFound();
  const { paper, questions, contexts } = detail;

  // id khung chỉ dùng trong trình duyệt, ghép từ loại và số thứ tự để ổn định giữa các lần tải
  const initial: EditorItem[] = [
    ...contexts.map((context): EditorItem => ({
      id: `c${context.seq}`,
      type: "context",
      count: context.count,
      boxes: context.boxes.map((box, index) => ({ ...box, id: `c${context.seq}-${index}` })),
    })),
    ...questions.map((question): EditorItem => ({
      id: `q${question.seq}`,
      type: "question",
      label: question.label,
      shape: question.shape,
      key: question.answerKey ?? null,
      boxes: question.boxes.map((box, index) => ({ ...box, id: `q${question.seq}-${index}` })),
    })),
  ];

  return (
    <PaperEditor
      key={paper.imageVersion}
      paperId={paper.id}
      title={paper.title}
      version={paper.imageVersion}
      format={paper.format}
      pageSizes={paper.pageSizes}
      initial={initial}
      locked={paper.lockedByAttempts}
    />
  );
}

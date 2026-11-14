import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { QuestionImage } from "@/components/exam/QuestionImage";
import { flattenFolders } from "@/components/papers/folderNodes";
import { PaperActions } from "@/components/papers/PaperActions";
import { AnswerTag } from "@/components/papers/PaperTags";
import { Card } from "@/components/ui/Card";
import { StatusTag } from "@/components/ui/StatusTag";
import { formatDateTime } from "@/lib/format";
import { FORMAT_NAMES, isComplete } from "@/lib/paperLayout";
import { describeAnswer, imageUrl, partTitle, partsOf, questionName } from "@/lib/paperView";
import { requirePage } from "@/lib/permissions";
import { formatScore, maxScore } from "@/lib/scoring";
import { listFolders } from "@/server/folders";
import { getPaper } from "@/server/papers";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const user = await requirePage("papers.manage");
  const detail = getPaper(user, Number((await params).id));
  return { title: detail.ok ? detail.paper.title : "Đề thi" };
}

export default async function PaperPage({ params }: Props) {
  const user = await requirePage("papers.manage");
  const detail = getPaper(user, Number((await params).id));
  const folderList = listFolders(user);
  if (!detail.ok || !folderList.ok) notFound();
  const { paper, questions, contexts } = detail;
  const keyed = paper.questionCount > 0 && paper.keyedCount === paper.questionCount;
  const contextBySeq = new Map(contexts.map((context) => [context.seq, context]));

  return (
    <>
      <nav aria-label="Vị trí" className="mb-2 flex flex-wrap items-center text-sm">
        <Link href="/papers" className="inline-flex items-center gap-1.5 text-muted hover:text-brand">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Ngân hàng đề
        </Link>
        {paper.folderId && (
          <>
            <span className="px-1.5 text-muted">/</span>
            <Link href={`/papers?folder=${paper.folderId}`} className="text-muted hover:text-brand">
              {paper.folderName}
            </Link>
          </>
        )}
      </nav>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="mb-2 text-2xl font-bold">{paper.title}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <StatusTag>Khối {paper.grade}</StatusTag>
            <StatusTag>{FORMAT_NAMES[paper.format]}</StatusTag>
            <StatusTag>{paper.questionCount} câu</StatusTag>
            <StatusTag>Tối đa {formatScore(maxScore(questions.map((question) => question.shape), paper.scoring))} điểm</StatusTag>
            <AnswerTag questionCount={paper.questionCount} keyedCount={paper.keyedCount} />
            {paper.examCount > 0 && <StatusTag tone="warning">Dùng trong {paper.examCount} kỳ thi</StatusTag>}
          </div>
          <p className="mt-2 text-sm text-muted">
            File {paper.sourceName}, cập nhật {formatDateTime(paper.updatedAt)}
          </p>
        </div>
        <PaperActions paper={paper} folders={flattenFolders(folderList.folders)} canPractice={keyed} />
      </div>

      {paper.warnings.length > 0 && (
        <Card className="mb-4 border-warning bg-warning-soft text-warning">
          <h2 className="mb-1 font-bold">Cần kiểm tra khi chỉnh khung</h2>
          <ul className="list-disc pl-5">
            {paper.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </Card>
      )}

      {!questions.length && (
        <Card className="text-center">
          <p className="mb-3 text-muted">Chưa tìm thấy câu nào trên đề</p>
          <Link href={`/papers/${paper.id}/edit`} className="font-semibold">
            Tự vẽ khung từng câu
          </Link>
        </Card>
      )}

      {partsOf(questions).map((part) => (
        <section key={part.number} aria-labelledby={`part-${part.number}`} className="mb-6">
          <h2 id={`part-${part.number}`} className="mb-3 text-lg font-bold">
            {partTitle(part.number, part.kind)}
          </h2>
          <ol className="space-y-3">
            {part.questions.map((question, index) => {
              const context = question.contextSeq !== null ? contextBySeq.get(question.contextSeq) : undefined;
              const firstOfContext = context && part.questions[index - 1]?.contextSeq !== question.contextSeq;
              return (
                <li key={question.seq}>
                  {firstOfContext && (
                    <div className="mb-3 rounded-xl border border-l-4 border-line border-l-warning bg-surface p-3">
                      <p className="mb-2 text-sm font-semibold text-warning">Đoạn dẫn chung</p>
                      <QuestionImage src={imageUrl(paper.id, paper.imageVersion, "c", context.seq)} width={context.imageWidth} height={context.imageHeight} alt="Đoạn dẫn chung" />
                    </div>
                  )}
                  <Card className="p-3">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold">{questionName(question)}</span>
                      <span className="text-sm">
                        {isComplete(question.shape, question.answerKey) ? (
                          <>
                            <span className="text-muted">Đáp án </span>
                            <strong>{describeAnswer(question.shape, question.answerKey, paper.format)}</strong>
                          </>
                        ) : (
                          <StatusTag tone="warning">Chưa có đáp án</StatusTag>
                        )}
                      </span>
                    </div>
                    <QuestionImage src={imageUrl(paper.id, paper.imageVersion, "q", question.seq)} width={question.imageWidth} height={question.imageHeight} alt={`Nội dung ${questionName(question).toLowerCase()}`} />
                  </Card>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </>
  );
}

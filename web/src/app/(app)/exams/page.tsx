import Link from "next/link";
import { notFound } from "next/navigation";
import { CreateExamButton } from "@/components/exams/CreateExamButton";
import { ExamStatusTag } from "@/components/exams/ExamStatusTag";
import { Card } from "@/components/ui/Card";
import { FilterTabs, hrefWith } from "@/components/ui/FilterTabs";
import { Pager } from "@/components/ui/Pager";
import { SearchBox } from "@/components/ui/SearchBox";
import { listExamsQuery } from "@/lib/examForm";
import { formatRange } from "@/lib/format";
import { GRADES } from "@/lib/grades";
import { requirePage } from "@/lib/permissions";
import { listExams } from "@/server/exams";

export const metadata = { title: "Kỳ thi" };

const PATH = "/exams";
const cell = "px-3 py-2.5 align-middle";

export default async function ExamsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requirePage("exams.manage");
  const query = listExamsQuery.parse(await searchParams);
  const list = listExams(user, query);
  if (!list.ok) notFound();
  const params = { q: query.q, grade: query.grade, status: query.status === "all" ? undefined : query.status };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Kỳ thi</h1>
        <CreateExamButton defaultGrade={query.grade} />
      </div>
      <Card>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-2">
            <FilterTabs
              label="Lọc theo trạng thái"
              items={[
                { href: hrefWith(PATH, params, { status: undefined }), label: "Tất cả", active: query.status === "all" },
                { href: hrefWith(PATH, params, { status: "running" }), label: "Đang diễn ra", active: query.status === "running" },
                { href: hrefWith(PATH, params, { status: "upcoming" }), label: "Sắp diễn ra", active: query.status === "upcoming" },
                { href: hrefWith(PATH, params, { status: "ended" }), label: "Đã kết thúc", active: query.status === "ended" },
              ]}
            />
            <FilterTabs
              label="Lọc theo khối"
              items={[
                { href: hrefWith(PATH, params, { grade: undefined }), label: "Mọi khối", active: !query.grade },
                ...GRADES.map((grade) => ({ href: hrefWith(PATH, params, { grade }), label: `Khối ${grade}`, active: query.grade === grade })),
              ]}
            />
          </div>
          <SearchBox path={PATH} label="Tìm kỳ thi" value={query.q} keep={{ grade: params.grade?.toString(), status: params.status }} />
        </div>
        {list.rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                  <th scope="col" className={cell}>Kỳ thi</th>
                  <th scope="col" className={cell}>Khối</th>
                  <th scope="col" className={cell}>Thời gian</th>
                  <th scope="col" className={cell}>Trạng thái</th>
                  <th scope="col" className={cell}>Đã nộp</th>
                </tr>
              </thead>
              <tbody>
                {list.rows.map((exam) => (
                  <tr key={exam.id} className="border-b border-line last:border-0">
                    <td className={cell}>
                      <Link href={`/exams/${exam.id}`} className="font-semibold text-ink hover:text-brand">
                        {exam.title}
                      </Link>
                      <div className="text-sm text-muted">{exam.paperTitle ?? "Chưa có đề"}</div>
                    </td>
                    <td className={cell}>{exam.grade}</td>
                    <td className={cell}>
                      <div className="whitespace-nowrap">{formatRange(exam.startsAt, exam.endsAt)}</div>
                      <div className="text-sm text-muted">Làm bài {exam.durationMinutes} phút</div>
                    </td>
                    <td className={cell}>
                      <ExamStatusTag status={exam.status} />
                    </td>
                    <td className={cell}>
                      {exam.submitted}
                      {exam.started > exam.submitted && <span className="text-sm text-muted">, {exam.started - exam.submitted} đang làm</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-10 text-center text-muted">{query.q || query.grade || query.status !== "all" ? "Không có kỳ thi khớp bộ lọc" : "Chưa có kỳ thi nào"}</p>
        )}
        <Pager path={PATH} params={{ q: query.q || undefined, grade: params.grade?.toString(), status: params.status }} page={list.page} pageCount={Math.ceil(list.total / list.pageSize)} />
      </Card>
    </>
  );
}

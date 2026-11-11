import Link from "next/link";
import { notFound } from "next/navigation";
import { CreateExamButton } from "@/components/exams/CreateExamButton";
import { ExamStatusTag } from "@/components/exams/ExamStatusTag";
import { Card } from "@/components/ui/Card";
import { FilterBar } from "@/components/ui/FilterBar";
import { Pager } from "@/components/ui/Pager";
import { listExamsQuery } from "@/lib/examForm";
import { formatRange } from "@/lib/format";
import { GRADE_OPTIONS } from "@/lib/grades";
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
        <FilterBar
          path={PATH}
          searchLabel="Tìm kỳ thi theo tên"
          q={query.q}
          total={list.total}
          unit="kỳ thi"
          selects={[
            {
              name: "status",
              label: "Trạng thái",
              base: "all",
              options: [
                { value: "all", label: "Mọi trạng thái" },
                { value: "running", label: "Đang diễn ra" },
                { value: "upcoming", label: "Sắp diễn ra" },
                { value: "ended", label: "Đã kết thúc" },
              ],
            },
            { name: "grade", label: "Khối", base: "", options: GRADE_OPTIONS },
          ]}
          values={{ status: query.status, grade: query.grade?.toString() ?? "" }}
        />
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

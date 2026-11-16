import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AutoRefresh } from "@/components/exams/AutoRefresh";
import { ExamActions } from "@/components/exams/ExamActions";
import { ExamStatusTag } from "@/components/exams/ExamStatusTag";
import { RetakeButton } from "@/components/exams/RetakeButton";
import { Card } from "@/components/ui/Card";
import { FilterBar } from "@/components/ui/FilterBar";
import { hrefWith } from "@/components/ui/hrefWith";
import { Pager } from "@/components/ui/Pager";
import { SortHeader } from "@/components/ui/SortHeader";
import { StatusTag } from "@/components/ui/StatusTag";
import { rosterQuery } from "@/lib/examForm";
import { percent, scoreBands } from "@/lib/examStats";
import { formatDateTime, formatTime } from "@/lib/format";
import { PAGE_SIZE } from "@/lib/paperForm";
import { requirePage } from "@/lib/permissions";
import { nextSort, sortRoster, type RosterSort } from "@/lib/rosterSort";
import { formatScore } from "@/lib/scoring";
import { searchKey } from "@/lib/username";
import { examRoster, getExam, type RosterRow } from "@/server/exams";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

const cell = "px-3 py-2.5 align-middle";
const STATUS: Record<RosterRow["status"], { label: string; tone: "success" | "warning" | "neutral" }> = {
  submitted: { label: "Đã nộp", tone: "success" },
  working: { label: "Đang làm", tone: "warning" },
  absent: { label: "Chưa vào thi", tone: "neutral" },
};

export async function generateMetadata({ params }: Props) {
  const user = await requirePage("exams.manage");
  const detail = getExam(user, Number((await params).id));
  return { title: detail.ok ? detail.exam.title : "Kỳ thi" };
}

export default async function ExamPage({ params, searchParams }: Props) {
  const user = await requirePage("exams.manage");
  const id = Number((await params).id);
  const detail = getExam(user, id);
  const roster = examRoster(user, id);
  if (!detail.ok || !roster.ok) notFound();
  const { exam } = detail;
  const query = rosterQuery.parse(await searchParams);
  const path = `/exams/${id}`;
  const status = exam.status;

  const counts = { submitted: 0, working: 0, absent: 0 };
  for (const row of roster.rows) counts[row.status]++;
  const scored = roster.rows.filter((row) => row.score !== null);
  const average = scored.length ? scored.reduce((sum, row) => sum + row.score!, 0) / scored.length : null;
  const bands = scoreBands(scored.map((row) => ({ score: row.score!, maxScore: row.maxScore ?? 0 })));
  const share = (count: number) => (bands.total ? `${count}/${bands.total} bài, ${percent(count, bands.total)}%` : "Chưa có");

  // máy chủ lọc, sắp xếp và chia trang danh sách học sinh
  const key = searchKey(query.q);
  const matched = roster.rows.filter((row) => (query.status === "all" || row.status === query.status) && (!key || searchKey(row.fullName).includes(key) || row.username.includes(key)));
  const filtered = sortRoster(matched, query.sort, query.dir);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(query.page, pageCount);
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  // thứ tự mặc định không ghi lên đường dẫn
  const sorted = query.sort === "name" && query.dir === "asc" ? {} : { sort: query.sort, dir: query.dir };
  const params2 = { q: query.q || undefined, status: query.status === "all" ? undefined : query.status, ...sorted };
  const sortHeader = (column: RosterSort, label: string) => {
    const next = nextSort(query, column);
    const change = next.sort === "name" && next.dir === "asc" ? { sort: undefined, dir: undefined } : next;
    return <SortHeader label={label} href={hrefWith(path, params2, change)} dir={query.sort === column ? query.dir : null} className={cell} />;
  };

  return (
    <>
      {status === "running" && <AutoRefresh seconds={20} />}
      <nav aria-label="Vị trí" className="mb-2 flex flex-wrap items-center text-sm">
        <Link href="/exams" className="inline-flex items-center gap-1.5 text-muted hover:text-brand">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Kỳ thi
        </Link>
      </nav>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="mb-2 text-2xl font-bold">{exam.title}</h1>
          <div className="flex flex-wrap gap-2">
            <ExamStatusTag status={status} />
            <StatusTag>Khối {exam.grade}</StatusTag>
          </div>
        </div>
        <ExamActions
          exam={{
            id: exam.id,
            title: exam.title,
            grade: exam.grade,
            paper: exam.paperId ? { id: exam.paperId, title: exam.paperTitle ?? "" } : null,
            duration: exam.durationMinutes,
            answersAt: exam.answersAt,
            startsAt: exam.startsAt,
            endsAt: exam.endsAt,
          }}
          started={status !== "upcoming"}
          attemptCount={counts.submitted + counts.working}
        />
      </div>

      <Card className="mb-4">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <dt className="text-sm text-muted">Đề thi</dt>
            <dd className="font-semibold">
              {exam.paperId ? (
                <Link href={`/papers/${exam.paperId}`} className="text-ink hover:text-brand">
                  {exam.paperTitle}
                </Link>
              ) : (
                "Chưa có đề"
              )}
            </dd>
            <dd className="text-sm text-muted">{exam.questionCount} câu</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Bắt đầu</dt>
            <dd className="font-semibold">{formatDateTime(exam.startsAt)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Kết thúc</dt>
            <dd className="font-semibold">{formatDateTime(exam.endsAt)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Thời gian làm bài</dt>
            <dd className="font-semibold">{exam.durationMinutes} phút</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Học sinh xem đáp án</dt>
            <dd className="font-semibold">{exam.answersAt === "submit" ? "Sau khi nộp bài" : "Sau khi kỳ thi kết thúc"}</dd>
          </div>
        </dl>
      </Card>

      <div className="mb-3 grid grid-cols-3 gap-3">
        {[
          ["Đã nộp", counts.submitted],
          ["Đang làm", counts.working],
          ["Chưa vào thi", counts.absent],
        ].map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-sm text-muted">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </Card>
        ))}
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {[
          ["Điểm trung bình", average === null ? "Chưa có" : `${formatScore(Math.round(average * 100) / 100)}${exam.maxScore ? ` / ${formatScore(exam.maxScore)}` : ""}`],
          ["Đạt từ 6,5 thang 10", share(bands.from65)],
          ["Đạt từ 8 thang 10", share(bands.from8)],
        ].map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-sm text-muted">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <FilterBar
          path={path}
          searchLabel="Tìm học sinh theo tên hoặc số điện thoại"
          q={query.q}
          total={filtered.length}
          unit="học sinh"
          selects={[
            {
              name: "status",
              label: "Trạng thái bài làm",
              base: "all",
              options: [
                { value: "all", label: `Mọi trạng thái (${roster.rows.length})` },
                { value: "submitted", label: `Đã nộp (${counts.submitted})` },
                { value: "working", label: `Đang làm (${counts.working})` },
                { value: "absent", label: `Chưa vào thi (${counts.absent})` },
              ],
            },
          ]}
          values={{ status: query.status }}
          keep={sorted}
        />
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                  {sortHeader("name", "Họ tên")}
                  <th scope="col" className={cell}>Số điện thoại</th>
                  {sortHeader("status", "Trạng thái")}
                  {sortHeader("score", "Điểm")}
                  <th scope="col" className={cell}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.userId} className="border-b border-line last:border-0">
                    <td className={cell}>
                      <Link href={`/students/${row.userId}`} className="font-semibold text-ink hover:text-brand">
                        {row.fullName}
                      </Link>
                    </td>
                    <td className={`${cell} font-mono`}>{row.username}</td>
                    <td className={cell}>
                      <StatusTag tone={STATUS[row.status].tone}>{STATUS[row.status].label}</StatusTag>
                      <div className="mt-0.5 text-xs text-muted">
                        {row.status === "submitted" && row.submittedAt && `Nộp lúc ${formatTime(row.submittedAt)}`}
                        {row.status === "working" && row.deadline && `Hạn ${formatTime(row.deadline)}`}
                        {row.reopenCount > 0 && `, thi lại ${row.reopenCount} lần`}
                      </div>
                    </td>
                    <td className={`${cell} font-semibold`}>{row.score !== null ? `${formatScore(row.score)} / ${formatScore(row.maxScore ?? 0)}` : ""}</td>
                    <td className={cell}>
                      {row.attemptId && (
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/attempts/${row.attemptId}`} className="inline-flex min-h-8 items-center rounded-lg border border-line px-3 text-sm text-ink no-underline hover:bg-surface-alt">
                            Xem bài
                          </Link>
                          {row.status === "submitted" && status !== "ended" && <RetakeButton attemptId={row.attemptId} studentName={row.fullName} />}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-8 text-center text-muted">{roster.rows.length ? "Không có học sinh khớp bộ lọc" : `Khối ${exam.grade} chưa có học sinh`}</p>
        )}
        <Pager path={path} params={params2} page={page} pageCount={pageCount} />
      </Card>
    </>
  );
}

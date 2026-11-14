import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ScoreChart, type ScorePoint } from "@/components/students/ScoreChart";
import { buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cx } from "@/components/ui/cx";
import { StatusTag } from "@/components/ui/StatusTag";
import { formatDate, formatDateTime, formatTime } from "@/lib/format";
import { requirePage } from "@/lib/permissions";
import { FORMAT_NAMES } from "@/lib/paperLayout";
import { formatScore } from "@/lib/scoring";
import { onTen, yearBounds } from "@/lib/yearActivity";
import { getStudentProfile, type StudentEntry } from "@/server/students";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

const yearOf = (value: string | string[] | undefined) => (typeof value === "string" && /^\d{4}$/.test(value) ? Number(value) : undefined);

const STATUS: Record<StudentEntry["status"], { label: string; tone: "success" | "warning" | "neutral"; dot: string }> = {
  submitted: { label: "Đã nộp", tone: "success", dot: "border-brand bg-brand" },
  working: { label: "Đang làm", tone: "warning", dot: "border-warning bg-warning-soft" },
  absent: { label: "Không vào thi", tone: "neutral", dot: "border-line bg-surface" },
};

export async function generateMetadata({ params }: Props) {
  const user = await requirePage("students.manage");
  const profile = getStudentProfile(user, Number((await params).id), undefined);
  return { title: profile.ok ? profile.student.fullName : "Học sinh" };
}

export default async function StudentPage({ params, searchParams }: Props) {
  const user = await requirePage("students.manage");
  const id = Number((await params).id);
  const profile = getStudentProfile(user, id, yearOf((await searchParams).year));
  if (!profile.ok) notFound();
  const { student, year, years, entries, stats } = profile;

  const months = new Map<number, StudentEntry[]>();
  for (const entry of entries) {
    const month = Number(entry.day.slice(5, 7));
    months.set(month, [...(months.get(month) ?? []), entry]);
  }
  const points = (value: number | null) => (value === null ? "Chưa có" : formatScore(value));
  const bounds = yearBounds(year);
  const chartPoints: ScorePoint[] = entries.flatMap((entry) =>
    entry.status === "submitted" && entry.attemptId && entry.format && entry.score !== null && entry.maxScore
      ? [{ id: entry.attemptId, at: entry.at, title: entry.examTitle, format: entry.format, score: entry.score, maxScore: entry.maxScore, value: onTen(entry.score, entry.maxScore) }]
      : [],
  );

  return (
    <>
      <nav aria-label="Vị trí" className="mb-2 flex flex-wrap items-center text-sm">
        <Link href="/students" className="inline-flex items-center gap-1.5 text-muted hover:text-brand">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Học sinh
        </Link>
      </nav>
      <div className="mb-4">
        <h1 className="mb-2 text-2xl font-bold">{student.fullName}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {student.grade !== null && <StatusTag>Khối {student.grade}</StatusTag>}
          {student.disabled ? <StatusTag tone="danger">Đã khoá</StatusTag> : student.mustChangePassword ? <StatusTag tone="warning">Mật khẩu tạm</StatusTag> : <StatusTag tone="success">Đang dùng</StatusTag>}
          <span className="font-mono text-sm text-muted">{student.username}</span>
          <span className="text-sm text-muted">Tạo ngày {formatDate(student.createdAt)}</span>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Năm {year}</h2>
        <nav aria-label="Chọn năm" className="flex flex-wrap gap-1.5">
          {years.map((option) => (
            <Link key={option} href={`/students/${id}?year=${option}`} aria-current={option === year ? "page" : undefined} className={buttonClass(option === year ? "primary" : "secondary", "sm")}>
              {option}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_12rem]">
        {(["thpt", "vsat"] as const).map((format) => {
          const group = stats[format];
          return (
            <Card key={format} className="p-4">
              <h3 className="mb-3 flex items-center gap-2 font-bold">
                <span aria-hidden="true" className="h-0.5 w-5 rounded-full" style={{ background: `var(--series-${format})` }} />
                {FORMAT_NAMES[format]}
                {group.scale !== null && <span className="ml-auto text-sm font-normal text-muted">Thang điểm {formatScore(group.scale)}</span>}
              </h3>
              <dl className="grid grid-cols-3 gap-3">
                {[
                  ["Đã nộp", String(group.submitted)],
                  ["Trung bình", points(group.average)],
                  ["Cao nhất", points(group.best)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-sm text-muted">{label}</dt>
                    <dd className="whitespace-nowrap text-lg font-bold sm:text-xl">{value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          );
        })}
        <Card className="p-4">
          <h3 className="mb-3 font-bold">Chuyên cần</h3>
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            <div>
              <dt className="text-sm text-muted">Không vào thi</dt>
              <dd className="text-xl font-bold">{stats.absent}</dd>
            </div>
            {stats.working > 0 && (
              <div>
                <dt className="text-sm text-muted">Đang làm</dt>
                <dd className="text-xl font-bold">{stats.working}</dd>
              </div>
            )}
          </dl>
        </Card>
      </div>

      <Card className="mb-4">
        <h3 className="mb-3 font-bold">Điểm các bài đã nộp</h3>
        <ScoreChart year={year} from={bounds.from} to={bounds.to} points={chartPoints} />
      </Card>

      <Card>
        <h3 className="mb-4 font-bold">Dòng thời gian</h3>
        {entries.length ? (
          <div className="space-y-6">
            {[...months].map(([month, list]) => (
              <section key={month} aria-label={`Tháng ${month} năm ${year}`} className="grid gap-x-4 gap-y-2 sm:grid-cols-[5.5rem_minmax(0,1fr)]">
                <h4 className="text-sm font-semibold text-muted sm:pt-0.5">Tháng {month}</h4>
                <ol className="border-l-2 border-line">
                  {list.map((entry) => {
                    const state = STATUS[entry.status];
                    return (
                      <li key={entry.examId} className="relative pb-5 pl-5 last:pb-0">
                        <span aria-hidden="true" className={cx("absolute -left-[0.4375rem] top-1 size-3 rounded-full border-2", state.dot)} />
                        <p className="mb-1 text-sm text-muted">{formatDateTime(entry.at)}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <Link href={`/exams/${entry.examId}`} className="font-semibold text-ink hover:text-brand">
                            {entry.examTitle}
                          </Link>
                          <StatusTag tone={state.tone}>{state.label}</StatusTag>
                        </div>
                        {entry.status === "submitted" && (
                          <p className="mt-1 text-sm">
                            <span className="font-bold">
                              {entry.score === null ? "Chưa chấm" : formatScore(entry.score)}
                              {entry.score !== null && entry.maxScore ? ` / ${formatScore(entry.maxScore)}` : ""}
                            </span>
                            {entry.submittedAt && <span className="text-muted">, nộp lúc {formatTime(entry.submittedAt)}</span>}
                          </p>
                        )}
                        {entry.attemptId && (
                          <Link href={`/attempts/${entry.attemptId}`} className="mt-1 inline-block text-sm font-semibold text-brand hover:underline">
                            Xem bài
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </section>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-muted">Chưa có kỳ thi nào trong năm {year}</p>
        )}
      </Card>
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { AccountTable } from "@/components/accounts/AccountTable";
import { CreateAccountsButton } from "@/components/accounts/CreateAccountsButton";
import { Card } from "@/components/ui/Card";
import { cx } from "@/components/ui/cx";
import { Pager } from "@/components/ui/Pager";
import { SearchBox } from "@/components/ui/SearchBox";
import { GRADES } from "@/lib/grades";
import { requirePage } from "@/lib/permissions";
import { listUsersQuery } from "@/lib/userForm";
import { countStudentsByGrade, listUsers } from "@/server/users";

export const metadata = { title: "Học sinh" };

const PATH = "/students";
const tab = (active: boolean) =>
  cx("rounded-full border px-3.5 py-1 no-underline", active ? "border-brand bg-brand font-semibold text-on-brand" : "border-line bg-surface text-ink hover:bg-surface-alt");

export default async function StudentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requirePage("students.manage");
  const query = listUsersQuery.parse({ ...(await searchParams), role: "student" });
  const list = listUsers(user, query);
  const counts = countStudentsByGrade(user);
  if (!list.ok || !counts.ok) notFound();

  const total = GRADES.reduce((sum, grade) => sum + (counts.counts[grade] ?? 0), 0);
  const gradeParam = query.grade ? String(query.grade) : undefined;
  const hrefFor = (grade?: number) => {
    const search = new URLSearchParams();
    if (grade) search.set("grade", String(grade));
    if (query.q) search.set("q", query.q);
    return search.size ? `${PATH}?${search}` : PATH;
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Học sinh</h1>
        <CreateAccountsButton role="student" label="Thêm học sinh" defaultGrade={query.grade} />
      </div>
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="Lọc theo khối" className="flex flex-wrap gap-1.5">
            <Link href={hrefFor()} className={tab(!query.grade)} aria-current={!query.grade ? "page" : undefined}>
              Tất cả ({total})
            </Link>
            {GRADES.map((grade) => (
              <Link key={grade} href={hrefFor(grade)} className={tab(query.grade === grade)} aria-current={query.grade === grade ? "page" : undefined}>
                Khối {grade} ({counts.counts[grade] ?? 0})
              </Link>
            ))}
          </nav>
          <SearchBox path={PATH} label="Tìm học sinh" value={query.q} keep={{ grade: gradeParam }} />
        </div>
        <AccountTable accounts={list.rows} showGrade emptyLabel="Chưa có học sinh" usernameLabel="Số điện thoại" />
        <Pager path={PATH} params={{ grade: gradeParam, q: query.q || undefined }} page={list.page} pageCount={Math.ceil(list.total / list.pageSize)} />
      </Card>
    </>
  );
}

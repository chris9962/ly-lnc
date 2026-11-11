import { notFound } from "next/navigation";
import { AccountTable } from "@/components/accounts/AccountTable";
import { CreateAccountsButton } from "@/components/accounts/CreateAccountsButton";
import { Card } from "@/components/ui/Card";
import { FilterBar } from "@/components/ui/FilterBar";
import { Pager } from "@/components/ui/Pager";
import { GRADES } from "@/lib/grades";
import { requirePage } from "@/lib/permissions";
import { listUsersQuery } from "@/lib/userForm";
import { countStudentsByGrade, listUsers } from "@/server/users";

export const metadata = { title: "Học sinh" };

const PATH = "/students";

export default async function StudentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requirePage("students.manage");
  const query = listUsersQuery.parse({ ...(await searchParams), role: "student" });
  const list = listUsers(user, query);
  const counts = countStudentsByGrade(user);
  if (!list.ok || !counts.ok) notFound();

  const total = GRADES.reduce((sum, grade) => sum + (counts.counts[grade] ?? 0), 0);
  const gradeParam = query.grade ? String(query.grade) : undefined;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Học sinh</h1>
        <CreateAccountsButton role="student" label="Thêm học sinh" defaultGrade={query.grade} />
      </div>
      <Card>
        <FilterBar
          path={PATH}
          searchLabel="Tìm học sinh theo tên hoặc số điện thoại"
          q={query.q}
          total={list.total}
          unit="học sinh"
          selects={[
            {
              name: "grade",
              label: "Khối",
              base: "",
              options: [{ value: "", label: `Mọi khối (${total})` }, ...GRADES.map((grade) => ({ value: String(grade), label: `Khối ${grade} (${counts.counts[grade] ?? 0})` }))],
            },
          ]}
          values={{ grade: gradeParam ?? "" }}
        />
        <AccountTable accounts={list.rows} showGrade emptyLabel="Chưa có học sinh" usernameLabel="Số điện thoại" />
        <Pager path={PATH} params={{ grade: gradeParam, q: query.q || undefined }} page={list.page} pageCount={Math.ceil(list.total / list.pageSize)} />
      </Card>
    </>
  );
}

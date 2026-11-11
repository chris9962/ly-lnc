import { notFound } from "next/navigation";
import { AccountTable } from "@/components/accounts/AccountTable";
import { CreateAccountsButton } from "@/components/accounts/CreateAccountsButton";
import { Card } from "@/components/ui/Card";
import { FilterBar } from "@/components/ui/FilterBar";
import { Pager } from "@/components/ui/Pager";
import { requirePage } from "@/lib/permissions";
import { listUsersQuery } from "@/lib/userForm";
import { listUsers } from "@/server/users";

export const metadata = { title: "Giáo viên" };

const PATH = "/teachers";

export default async function TeachersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requirePage("teachers.manage");
  const query = listUsersQuery.parse({ ...(await searchParams), role: "teacher", grade: undefined });
  const list = listUsers(user, query);
  if (!list.ok) notFound();

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Giáo viên</h1>
        <CreateAccountsButton role="teacher" label="Thêm giáo viên" />
      </div>
      <Card>
        <FilterBar path={PATH} searchLabel="Tìm giáo viên theo tên" q={query.q} total={list.total} unit="giáo viên" />
        <AccountTable accounts={list.rows} emptyLabel="Chưa có giáo viên" />
        <Pager path={PATH} params={{ q: query.q || undefined }} page={list.page} pageCount={Math.ceil(list.total / list.pageSize)} />
      </Card>
    </>
  );
}

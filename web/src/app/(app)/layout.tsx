import Link from "next/link";
import { Logo } from "@/components/Logo";
import { UserMenu } from "@/components/UserMenu";
import { can, homePath, requirePage, type SessionUser } from "@/lib/permissions";
import { SITE_NAME } from "@/lib/site";

const roleLabel = (user: SessionUser) => (user.role === "admin" ? "Quản trị viên" : user.role === "teacher" ? "Giáo viên" : `Học sinh khối ${user.grade}`);

const navLink = "rounded-lg px-3 py-1.5 text-ink no-underline hover:bg-surface-alt";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // layout chỉ dựng thanh điều hướng, mỗi trang vẫn tự kiểm quyền của mình
  const user = await requirePage();
  return (
    <>
      <header className="no-print border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl items-center gap-x-5 px-4 py-2">
          <Link href={homePath(user)} className="flex items-center gap-2 text-lg font-bold tracking-wider text-ink no-underline">
            <Logo />
            {SITE_NAME}
          </Link>
          <nav aria-label="Chính" className="flex flex-1 flex-wrap gap-1">
            {can(user, "students.manage") && (
              <Link href="/students" className={navLink}>
                Học sinh
              </Link>
            )}
            {can(user, "teachers.manage") && (
              <Link href="/teachers" className={navLink}>
                Giáo viên
              </Link>
            )}
            {can(user, "exams.take") && (
              <Link href="/my-exams" className={navLink}>
                Kỳ thi
              </Link>
            )}
          </nav>
          <UserMenu fullName={user.fullName} username={user.username} roleLabel={roleLabel(user)} />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-12 pt-6">{children}</main>
    </>
  );
}

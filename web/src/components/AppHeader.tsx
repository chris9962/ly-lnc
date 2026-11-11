import Link from "next/link";
import { Logo } from "@/components/Logo";
import { NavLinks } from "@/components/NavLinks";
import { UserMenu } from "@/components/UserMenu";
import { can, homePath, type SessionUser } from "@/lib/permissions";
import { SITE_NAME } from "@/lib/site";
import { cx } from "./ui/cx";

const roleLabel = (user: SessionUser) => (user.role === "admin" ? "Quản trị viên" : user.role === "teacher" ? "Giáo viên" : `Học sinh khối ${user.grade}`);

export function AppHeader({ user, wide }: { user: SessionUser; wide?: boolean }) {
  const links = [
    can(user, "exams.manage") && { href: "/exams", label: "Kỳ thi" },
    can(user, "papers.manage") && { href: "/papers", label: "Ngân hàng đề" },
    can(user, "students.manage") && { href: "/students", label: "Học sinh" },
    can(user, "teachers.manage") && { href: "/teachers", label: "Giáo viên" },
    can(user, "exams.take") && { href: "/my-exams", label: "Kỳ thi" },
  ].filter((link): link is { href: string; label: string } => !!link);

  return (
    <header className="no-print border-b border-line bg-surface">
      <div className={cx("mx-auto flex flex-wrap items-center justify-between gap-x-5 gap-y-1 px-4 py-2", wide ? "max-w-none" : "max-w-6xl")}>
        <Link href={homePath(user)} className="flex items-center gap-2 text-lg font-bold tracking-wider text-ink no-underline">
          <Logo />
          {SITE_NAME}
        </Link>
        <NavLinks links={links} />
        <UserMenu fullName={user.fullName} username={user.username} roleLabel={roleLabel(user)} />
      </div>
    </header>
  );
}

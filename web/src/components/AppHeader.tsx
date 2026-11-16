import { cookies } from "next/headers";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { NavLinks } from "@/components/NavLinks";
import { UserMenu } from "@/components/UserMenu";
import { can, homePath, type SessionUser } from "@/lib/permissions";
import { SITE_HEADER_LINES } from "@/lib/site";
import { skinOf, THEME_COOKIE, themeLocked, themeOf } from "@/lib/theme";
import { cx } from "./ui/cx";

const roleLabel = (user: SessionUser) => (user.role === "admin" ? "Quản trị viên" : user.role === "teacher" ? "Giáo viên" : `Học sinh khối ${user.grade}`);

export async function AppHeader({ user, wide }: { user: SessionUser; wide?: boolean }) {
  const skin = skinOf(user.role);
  const theme = themeOf(user.role, (await cookies()).get(THEME_COOKIE)?.value);
  const links = [
    can(user, "exams.manage") && { href: "/exams", label: "Kỳ thi" },
    can(user, "papers.manage") && { href: "/papers", label: "Ngân hàng đề" },
    can(user, "students.manage") && { href: "/students", label: "Học sinh" },
    can(user, "teachers.manage") && { href: "/teachers", label: "Giáo viên" },
  ].filter((link): link is { href: string; label: string } => !!link);

  return (
    <header className={cx("no-print sticky top-0 z-40 box-border h-(--header-h) border-b border-line", skin === "space" ? "space-surface" : "bg-surface")}>
      {/* màn rộng chia ba cột để menu nằm đúng giữa thanh, không lệch theo bề rộng tên và tài khoản */}
      <div className={cx("mx-auto flex h-full flex-wrap content-center items-center justify-between gap-x-5 gap-y-1 px-4 sm:grid sm:grid-cols-[1fr_auto_1fr]", wide ? "max-w-none" : "max-w-6xl")}>
        <Link href={homePath(user)} className="flex items-center gap-2 justify-self-start text-ink no-underline">
          <Logo />
          <span className="flex flex-col leading-none">
            <span className="whitespace-nowrap text-sm font-extrabold leading-none tracking-wide sm:text-base">{SITE_HEADER_LINES[0]}</span>
            <span className="mt-1 text-xs font-semibold leading-none text-muted">{SITE_HEADER_LINES[1]}</span>
          </span>
        </Link>
        {/* học sinh chỉ có một trang nên không có menu; ô trống giữ cột giữa để nút tài khoản vẫn nằm bên phải */}
        {links.length ? <NavLinks links={links} /> : <span aria-hidden="true" className="hidden sm:block" />}
        <div className="justify-self-end">
          <UserMenu fullName={user.fullName} username={user.username} roleLabel={roleLabel(user)} theme={theme} themeLocked={themeLocked(user.role)} />
        </div>
      </div>
    </header>
  );
}

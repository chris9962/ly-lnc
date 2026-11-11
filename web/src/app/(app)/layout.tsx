import { AppHeader } from "@/components/AppHeader";
import { requirePage } from "@/lib/permissions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // layout chỉ dựng thanh điều hướng, mỗi trang vẫn tự kiểm quyền của mình
  const user = await requirePage();
  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto max-w-6xl px-4 pb-12 pt-6">{children}</main>
    </>
  );
}

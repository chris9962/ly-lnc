import { AppHeader } from "@/components/AppHeader";
import { CosmosBand, Rocket } from "@/components/CosmosBand";
import { requirePage } from "@/lib/permissions";
import { skinOf } from "@/lib/theme";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // layout chỉ dựng thanh điều hướng, mỗi trang vẫn tự kiểm quyền của mình
  const user = await requirePage();
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader user={user} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-12 pt-6">{children}</main>
      {skinOf(user.role) === "space" && (
        <>
          <CosmosBand />
          <Rocket />
        </>
      )}
    </div>
  );
}

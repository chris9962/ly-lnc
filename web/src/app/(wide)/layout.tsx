import { AppHeader } from "@/components/AppHeader";
import { requirePage } from "@/lib/permissions";

// trang chỉnh khung cần cả bề ngang màn hình cho trang đề và cột nhập đáp án
export default async function WideLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePage();
  return (
    <>
      <AppHeader user={user} wide />
      <main>{children}</main>
    </>
  );
}

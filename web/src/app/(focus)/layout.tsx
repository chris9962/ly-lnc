import { requirePage } from "@/lib/permissions";

// trang làm bài có thanh riêng, bỏ thanh điều hướng để học sinh tập trung
export default async function FocusLayout({ children }: { children: React.ReactNode }) {
  await requirePage();
  return <main>{children}</main>;
}

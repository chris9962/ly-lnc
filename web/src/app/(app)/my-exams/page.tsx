import { Card } from "@/components/ui/Card";
import { StatusTag } from "@/components/ui/StatusTag";
import { requirePage } from "@/lib/permissions";

export const metadata = { title: "Kỳ thi" };

const SECTIONS = ["Đang diễn ra", "Sắp diễn ra", "Đã kết thúc"];

export default async function MyExamsPage() {
  const user = await requirePage("exams.take");
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Kỳ thi</h1>
        <StatusTag>Khối {user.grade}</StatusTag>
      </div>
      {SECTIONS.map((title) => (
        <Card key={title} className="mb-4">
          <h2 className="mb-2 text-lg font-bold">{title}</h2>
          <p className="text-muted">Chưa có kỳ thi</p>
        </Card>
      ))}
    </>
  );
}

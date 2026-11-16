import { notFound } from "next/navigation";
import { RefreshAt } from "@/components/exams/AutoRefresh";
import { StudentExamCard } from "@/components/exams/StudentExamCard";
import { StudentProfileView } from "@/components/students/StudentProfileView";
import { isGrade } from "@/lib/grades";
import { requirePage } from "@/lib/permissions";
import { myExams } from "@/server/attempts";
import { getMyProfile } from "@/server/students";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export const metadata = { title: "Trang chủ" };

const gradeOf = (value: string | string[] | undefined) => (typeof value === "string" && isGrade(Number(value)) ? Number(value) : undefined);

export default async function HomePage({ searchParams }: Props) {
  const user = await requirePage("exams.take");
  const profile = getMyProfile(user, gradeOf((await searchParams).grade));
  const groups = myExams(user);
  if (!profile.ok || !groups.ok) notFound();
  // tới giờ một kỳ thi bắt đầu hay kết thúc thì trang tự tải lại
  const changes = [...groups.upcoming.map((exam) => exam.startsAt), ...groups.running.map((exam) => exam.endsAt)];

  return (
    <>
      <RefreshAt at={changes.length ? Math.min(...changes) : null} />
      {/* tên và tài khoản đã có ở nút góc phải, trang chỉ giữ tiêu đề cho trình đọc màn hình */}
      <h1 className="sr-only">Trang chủ</h1>

      {/* kỳ thi đang mở nằm ngay đầu trang chủ để học sinh vào thi không phải tìm */}
      {groups.running.length > 0 && (
        <section aria-labelledby="home-running" className="mb-6">
          <h2 id="home-running" className="mb-3 text-lg font-bold">
            Đang diễn ra
          </h2>
          <ul className="space-y-3">
            {groups.running.map((exam) => (
              <StudentExamCard key={exam.id} exam={exam} status="running" />
            ))}
          </ul>
        </section>
      )}

      {/* chưa có kỳ thi sắp tới thì ẩn cả mục, không để ô trống */}
      {groups.upcoming.length > 0 && (
        <section aria-labelledby="home-upcoming" className="mb-6">
          <h2 id="home-upcoming" className="mb-3 text-lg font-bold">
            Sắp diễn ra
          </h2>
          <ul className="space-y-3">
            {groups.upcoming.map((exam) => (
              <StudentExamCard key={exam.id} exam={exam} status="upcoming" />
            ))}
          </ul>
        </section>
      )}

      <StudentProfileView profile={profile} basePath="/home" hideAbsent />
    </>
  );
}

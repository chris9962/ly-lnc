import { StatusTag } from "@/components/ui/StatusTag";
import type { ExamStatus } from "@/server/exams";

export const STATUS_NAMES: Record<ExamStatus, string> = { upcoming: "Sắp diễn ra", running: "Đang diễn ra", ended: "Đã kết thúc" };

export function ExamStatusTag({ status }: { status: ExamStatus }) {
  return <StatusTag tone={status === "running" ? "success" : status === "upcoming" ? "warning" : "neutral"}>{STATUS_NAMES[status]}</StatusTag>;
}

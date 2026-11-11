import { StatusTag } from "@/components/ui/StatusTag";

export function AnswerTag({ questionCount, keyedCount }: { questionCount: number; keyedCount: number }) {
  if (questionCount > 0 && keyedCount === questionCount) return <StatusTag tone="success">Đủ đáp án</StatusTag>;
  if (keyedCount === 0) return <StatusTag>Chưa có đáp án</StatusTag>;
  return <StatusTag tone="warning">Thiếu {questionCount - keyedCount} đáp án</StatusTag>;
}

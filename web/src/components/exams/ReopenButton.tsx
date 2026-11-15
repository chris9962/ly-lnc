"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/TextField";
import { callApi, type ApiFail } from "@/lib/api";

type Props = { attemptId: number; studentName: string; defaultMinutes: number; submitted: boolean };

// hai nút gọi cùng một thao tác ở máy chủ: hạn mới bằng lúc bấm cộng số phút nhập, không cộng vào hạn cũ
const EXTEND_NOTES = [
  "Học sinh còn đúng số phút này, tính từ lúc bấm Gia hạn.",
  "Số phút này không cộng dồn với thời gian đang còn.",
  "Ví dụ: đang còn 40 phút, nhập 30 thì học sinh còn 30 phút.",
];
const REOPEN_NOTES = [
  "Học sinh làm tiếp bài cũ, các câu đã chọn vẫn còn.",
  "Học sinh có đúng số phút này, tính từ lúc bấm Cho thi lại.",
  "Hệ thống xoá điểm cũ và chấm lại khi học sinh nộp bài hoặc hết giờ.",
];

export function ReopenButton({ attemptId, studentName, defaultMinutes, submitted }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiFail | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const result = await callApi(`/api/attempts/${attemptId}/reopen`, "POST", Object.fromEntries(new FormData(event.currentTarget)));
    setPending(false);
    if (!result.ok) return setError(result);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button
        size="sm"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        {submitted ? "Cho thi lại" : "Gia hạn"}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={submitted ? `Cho ${studentName} thi lại?` : `Gia hạn bài của ${studentName}?`} closeOnOutside={!pending}>
        <form onSubmit={submit} noValidate>
          {error && !error.field && (
            <p role="alert" className="mb-3 text-sm text-danger">
              {error.message}
            </p>
          )}
          <div className="mb-4 space-y-1 text-sm text-muted">
            {(submitted ? REOPEN_NOTES : EXTEND_NOTES).map((note) => (
              <p key={note}>{note}</p>
            ))}
          </div>
          <div className="w-48">
            <TextField label="Số phút làm tiếp" name="minutes" type="number" min={1} max={300} defaultValue={defaultMinutes} error={error?.field === "minutes" ? error.message : undefined} autoFocus />
          </div>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setOpen(false)} disabled={pending}>
              Huỷ
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {submitted ? "Cho thi lại" : "Gia hạn"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

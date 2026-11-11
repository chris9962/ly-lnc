"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/TextField";
import { callApi, type ApiFail } from "@/lib/api";

type Props = { attemptId: number; studentName: string; defaultMinutes: number; submitted: boolean };

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

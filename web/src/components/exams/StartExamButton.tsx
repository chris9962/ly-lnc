"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { callApi } from "@/lib/api";

export function StartExamButton({ examId, title, minutes }: { examId: number; title: string; minutes: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function start() {
    setPending(true);
    const result = await callApi<{ attemptId: number }>(`/api/exams/${examId}/start`, "POST");
    if (!result.ok) {
      setPending(false);
      setError(result.message);
      return;
    }
    router.push(`/attempts/${result.attemptId}`);
  }

  return (
    <>
      <Button
        variant="primary"
        onClick={() => {
          setError(undefined);
          setOpen(true);
        }}
      >
        Vào thi
      </Button>
      <ConfirmDialog
        open={open}
        question={`Bắt đầu làm bài ${title} trong ${minutes} phút?`}
        confirmLabel="Bắt đầu"
        pending={pending}
        error={error}
        onConfirm={start}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

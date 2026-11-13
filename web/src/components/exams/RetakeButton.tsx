"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { callApi } from "@/lib/api";

type Props = { attemptId: number; studentName: string };

export function RetakeButton({ attemptId, studentName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function confirm() {
    setPending(true);
    const result = await callApi(`/api/attempts/${attemptId}/retake`, "POST");
    setPending(false);
    if (!result.ok) return setError(result.message);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button
        size="sm"
        onClick={() => {
          setError(undefined);
          setOpen(true);
        }}
      >
        Cho thi lại
      </Button>
      <ConfirmDialog open={open} question={`Xoá bài đã nộp và cho ${studentName} thi lại từ đầu?`} confirmLabel="Cho thi lại" danger pending={pending} error={error} onConfirm={confirm} onClose={() => setOpen(false)} />
    </>
  );
}

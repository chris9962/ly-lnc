"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, buttonClass } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { callApi } from "@/lib/api";
import { ExamFormDialog, type ExamFormValues } from "./ExamFormDialog";

type Props = { exam: ExamFormValues & { id: number }; started: boolean; attemptCount: number };

export function ExamActions({ exam, started, attemptCount }: Props) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"edit" | "delete" | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function remove() {
    setPending(true);
    const result = await callApi(`/api/exams/${exam.id}`, "DELETE");
    if (!result.ok) {
      setPending(false);
      setError(result.message);
      return;
    }
    router.replace("/exams");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <a href={`/api/exams/${exam.id}/export`} className={buttonClass("secondary")} download>
        Tải bảng điểm Excel
      </a>
      <Button onClick={() => setDialog("edit")}>Sửa kỳ thi</Button>
      <Button
        variant="danger"
        onClick={() => {
          setError(undefined);
          setDialog("delete");
        }}
      >
        Xoá kỳ thi
      </Button>
      {dialog === "edit" && <ExamFormDialog open onClose={() => setDialog(null)} initial={exam} started={started} locked={attemptCount > 0} />}
      <ConfirmDialog
        open={dialog === "delete"}
        question={attemptCount ? `Xoá kỳ thi ${exam.title} cùng ${attemptCount} bài làm?` : `Xoá kỳ thi ${exam.title}?`}
        confirmLabel="Xoá kỳ thi"
        danger
        pending={pending}
        error={error}
        onConfirm={remove}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}

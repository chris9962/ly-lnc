"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ExamFormDialog, type ExamFormValues } from "./ExamFormDialog";

const HOUR = 60 * 60 * 1000;

export function CreateExamButton({ defaultGrade }: { defaultGrade?: number }) {
  const [initial, setInitial] = useState<ExamFormValues | null>(null);

  // giờ gợi ý tính lúc bấm nút để luôn là giờ hiện tại, không phải giờ tải trang
  function open() {
    const start = Math.ceil(Date.now() / (15 * 60 * 1000)) * 15 * 60 * 1000;
    setInitial({ title: "", grade: defaultGrade ?? null, paper: null, duration: 45, answersAt: "end", startsAt: start, endsAt: start + 2 * HOUR });
  }

  return (
    <>
      <Button variant="primary" onClick={open}>
        Tạo kỳ thi
      </Button>
      {initial && <ExamFormDialog open onClose={() => setInitial(null)} initial={initial} />}
    </>
  );
}

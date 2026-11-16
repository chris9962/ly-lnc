"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Segmented } from "@/components/ui/Segmented";
import { Select } from "@/components/ui/Select";
import { TextField } from "@/components/ui/TextField";
import { callApi, type ApiFail } from "@/lib/api";
import type { AnswersAt } from "@/lib/examForm";
import { formatDateTime } from "@/lib/format";
import { GRADES } from "@/lib/grades";
import { PaperPicker, type PickedPaper } from "./PaperPicker";

export type ExamFormValues = {
  id?: number;
  title: string;
  grade: number | null;
  paper: PickedPaper | null;
  duration: number;
  answersAt: AnswersAt;
  startsAt: number | null;
  endsAt: number | null;
};

type Props = { open: boolean; onClose: () => void; initial: ExamFormValues; started?: boolean; locked?: boolean };

const split = (timestamp: number | null) => {
  if (timestamp === null) return ["", ""];
  const [date, time] = formatDateTime(timestamp).split(" ");
  return [date, time];
};

export function ExamFormDialog({ open, onClose, initial, started, locked }: Props) {
  const router = useRouter();
  // tạo mới mặc định thi ngay; sửa kỳ thi chưa bắt đầu thì giữ giờ hẹn cũ
  const [mode, setMode] = useState<"now" | "scheduled">(initial.id !== undefined && initial.startsAt && !started ? "scheduled" : "now");
  const [grade, setGrade] = useState(initial.grade);
  const [paper, setPaper] = useState(initial.paper);
  const [answersAt, setAnswersAt] = useState(initial.answersAt);
  const [error, setError] = useState<ApiFail | null>(null);
  const [pending, setPending] = useState(false);
  const [startDate, startTime] = split(initial.startsAt);
  const [endDate, endTime] = split(initial.endsAt);
  const editing = initial.id !== undefined;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const raw = { ...Object.fromEntries(new FormData(event.currentTarget)), mode, answersAt, paperId: paper?.id ?? "" };
    const result = editing ? await callApi(`/api/exams/${initial.id}`, "PATCH", raw) : await callApi<{ id: number }>("/api/exams", "POST", raw);
    setPending(false);
    if (!result.ok) return setError(result);
    onClose();
    if (!editing && "id" in result) router.push(`/exams/${result.id}`);
    router.refresh();
  }

  const errorOf = (field: string) => (error?.field === field ? error.message : undefined);

  return (
    <Dialog open={open} onClose={onClose} title={editing ? "Sửa kỳ thi" : "Tạo kỳ thi"} closeOnOutside={!pending} wide>
      <form onSubmit={submit} noValidate>
        {error && !error.field && <Alert>{error.message}</Alert>}
        <TextField label="Tên kỳ thi" name="title" defaultValue={initial.title} maxLength={150} error={errorOf("title")} autoFocus={!editing} />
        <div className="sm:w-40">
          <Select
            label="Khối"
            name="grade"
            value={grade ? String(grade) : ""}
            onChange={(event) => setGrade(Number(event.target.value) || null)}
            placeholder="Chọn khối"
            options={GRADES.map((value) => ({ value: String(value), label: `Khối ${value}` }))}
            error={errorOf("grade")}
          />
        </div>
        {locked ? (
          <div className="mb-4">
            <span className="mb-1 block font-semibold">Đề thi</span>
            <p className="rounded-lg border border-line bg-surface-alt px-3 py-2">{paper?.title}</p>
          </div>
        ) : (
          <PaperPicker value={paper} onChange={setPaper} grade={grade} error={errorOf("paperId")} />
        )}
        <div className="grid items-start gap-x-4 sm:grid-cols-2">
          <TextField label="Số phút làm bài" name="duration" type="number" min={1} max={300} defaultValue={initial.duration} error={errorOf("duration")} />
          {!started && (
            <Segmented
              label="Bắt đầu"
              name="mode-choice"
              value={mode}
              onChange={setMode}
              options={[
                { value: "now", label: "Thi ngay" },
                { value: "scheduled", label: "Hẹn giờ" },
              ]}
            />
          )}
        </div>
        <div className="grid gap-x-4 sm:grid-cols-2">
          {mode === "scheduled" && !started && (
            <fieldset className="sm:col-span-2">
              <legend className="sr-only">Giờ bắt đầu</legend>
              <div className="grid grid-cols-2 gap-x-4">
                <TextField label="Ngày bắt đầu" name="startDate" defaultValue={startDate} placeholder="05/11/2026" inputMode="numeric" error={errorOf("startDate")} />
                <TextField label="Giờ bắt đầu" name="startTime" defaultValue={startTime} placeholder="07:30" inputMode="numeric" error={errorOf("startTime")} />
              </div>
            </fieldset>
          )}
          <fieldset className="sm:col-span-2">
            <legend className="sr-only">Giờ kết thúc</legend>
            <div className="grid grid-cols-2 gap-x-4">
              <TextField label="Ngày kết thúc" name="endDate" defaultValue={endDate} placeholder="05/11/2026" inputMode="numeric" error={errorOf("endDate")} />
              <TextField label="Giờ kết thúc" name="endTime" defaultValue={endTime} placeholder="09:00" inputMode="numeric" error={errorOf("endTime")} />
            </div>
          </fieldset>
        </div>
        <Segmented
          label="Học sinh xem đáp án"
          name="answers-choice"
          value={answersAt}
          onChange={setAnswersAt}
          options={[
            { value: "end", label: "Sau khi kỳ thi kết thúc" },
            { value: "submit", label: "Sau khi nộp bài" },
          ]}
        />
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={pending}>
            Huỷ
          </Button>
          <Button type="submit" variant="primary" disabled={pending}>
            {editing ? "Lưu" : "Tạo kỳ thi"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

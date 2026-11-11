"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button, buttonClass } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Dialog } from "@/components/ui/Dialog";
import { Select } from "@/components/ui/Select";
import { TextField } from "@/components/ui/TextField";
import { callApi, type ApiFail } from "@/lib/api";
import { GRADES } from "@/lib/grades";
import { folderOptions, type FolderNode } from "./folderNodes";

type Props = {
  paper: { id: number; title: string; grade: number; folderId: number | null; examCount: number };
  folders: FolderNode[];
  canPractice: boolean;
};

export function PaperActions({ paper, folders, canPractice }: Props) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"edit" | "delete" | null>(null);
  const [error, setError] = useState<ApiFail | null>(null);
  const [pending, setPending] = useState(false);

  function open(next: "edit" | "delete") {
    setError(null);
    setDialog(next);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const result = await callApi(`/api/papers/${paper.id}`, "PATCH", Object.fromEntries(new FormData(event.currentTarget)));
    setPending(false);
    if (!result.ok) return setError(result);
    setDialog(null);
    router.refresh();
  }

  async function remove() {
    setPending(true);
    const result = await callApi(`/api/papers/${paper.id}`, "DELETE");
    if (!result.ok) {
      setPending(false);
      return setError(result);
    }
    router.replace("/papers");
    router.refresh();
  }

  async function practice() {
    setPending(true);
    const result = await callApi<{ attemptId: number }>(`/api/papers/${paper.id}/practice`, "POST");
    if (!result.ok) {
      setPending(false);
      setError(result);
      return;
    }
    router.push(`/attempts/${result.attemptId}`);
  }

  const errorOf = (field: string) => (error?.field === field ? error.message : undefined);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {canPractice && (
          <Button variant="primary" onClick={practice} disabled={pending}>
            Thi thử
          </Button>
        )}
        <Link href={`/papers/${paper.id}/edit`} className={buttonClass(canPractice ? "secondary" : "primary")}>
          Chỉnh khung và đáp án
        </Link>
        <Button onClick={() => open("edit")}>Sửa thông tin</Button>
        {/* đề đang dùng trong kỳ thi thì máy chủ không cho xoá, nên không hiện nút */}
        {paper.examCount === 0 && (
          <Button variant="danger" onClick={() => open("delete")}>
            Xoá đề
          </Button>
        )}
      </div>
      {error && dialog === null && (
        <div className="mt-3">
          <Alert>{error.message}</Alert>
        </div>
      )}

      <Dialog open={dialog === "edit"} onClose={() => setDialog(null)} title="Sửa thông tin đề" closeOnOutside={!pending}>
        <form onSubmit={save} noValidate>
          {error && !error.field && <Alert>{error.message}</Alert>}
          <TextField label="Tên đề" name="title" defaultValue={paper.title} maxLength={150} error={errorOf("title")} />
          <div className="grid gap-x-3 sm:grid-cols-[8rem_1fr]">
            <Select label="Khối" name="grade" defaultValue={String(paper.grade)} options={GRADES.map((grade) => ({ value: String(grade), label: `Khối ${grade}` }))} error={errorOf("grade")} />
            <Select label="Thư mục" name="folderId" defaultValue={paper.folderId ? String(paper.folderId) : ""} options={folderOptions(folders)} error={errorOf("folderId")} />
          </div>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setDialog(null)} disabled={pending}>
              Huỷ
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              Lưu
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={dialog === "delete"}
        question={`Xoá đề ${paper.title}?`}
        confirmLabel="Xoá đề"
        danger
        pending={pending}
        error={error?.message}
        onConfirm={remove}
        onClose={() => setDialog(null)}
      />
    </>
  );
}

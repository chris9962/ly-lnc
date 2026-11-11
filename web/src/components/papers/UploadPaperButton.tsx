"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FileField } from "@/components/ui/FileField";
import { Select } from "@/components/ui/Select";
import { TextField } from "@/components/ui/TextField";
import type { ApiFail, ApiResult } from "@/lib/api";
import { GRADES } from "@/lib/grades";
import { folderOptions, type FolderNode } from "./folderNodes";

type Props = { folders: FolderNode[]; defaultFolder?: number; defaultGrade?: number };

const titleFromFile = (name: string) => name.replace(/\.pdf$/i, "").replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();

export function UploadPaperButton({ folders, defaultFolder, defaultGrade }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<ApiFail | null>(null);
  const [pending, setPending] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    let result: ApiResult<{ id: number }>;
    try {
      const response = await fetch("/api/papers", { method: "POST", body: new FormData(event.currentTarget) });
      result = await response.json();
    } catch {
      result = { ok: false, message: "Không kết nối được máy chủ", status: 0 };
    }
    if (!result.ok) {
      setPending(false);
      setError(result);
      return;
    }
    // giáo viên kiểm tra khung và đáp án ngay sau khi up
    router.push(`/papers/${result.id}/edit`);
  }

  const errorOf = (field: string) => (error?.field === field ? error.message : undefined);

  return (
    <>
      <Button
        variant="primary"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        Tải đề lên
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Tải đề PDF lên" closeOnOutside={!pending}>
        <form onSubmit={submit} noValidate>
          {error && !error.field && <Alert>{error.message}</Alert>}
          <FileField
            label="File đề"
            name="file"
            accept="application/pdf,.pdf"
            error={errorOf("file")}
            onPick={(file) => {
              // điền sẵn tên đề theo tên file nếu ô tên còn trống
              if (file && titleRef.current && !titleRef.current.value.trim()) titleRef.current.value = titleFromFile(file.name);
            }}
          />
          <TextField ref={titleRef} label="Tên đề" name="title" maxLength={150} error={errorOf("title")} />
          <div className="grid gap-x-3 sm:grid-cols-[8rem_1fr]">
            <Select
              label="Khối"
              name="grade"
              defaultValue={defaultGrade ? String(defaultGrade) : ""}
              placeholder="Chọn khối"
              options={GRADES.map((grade) => ({ value: String(grade), label: `Khối ${grade}` }))}
              error={errorOf("grade")}
            />
            <Select label="Thư mục" name="folderId" defaultValue={defaultFolder ? String(defaultFolder) : ""} options={folderOptions(folders)} error={errorOf("folderId")} />
          </div>
          <div className="flex items-center justify-end gap-2">
            {pending && (
              <span role="status" className="mr-auto flex items-center gap-2 text-sm text-muted">
                <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-line border-t-brand" />
                Đang cắt đề thành từng câu
              </span>
            )}
            <Button onClick={() => setOpen(false)} disabled={pending}>
              Huỷ
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              Tải lên và cắt câu
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

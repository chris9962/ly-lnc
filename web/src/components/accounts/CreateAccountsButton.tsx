"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Select } from "@/components/ui/Select";
import { TextArea } from "@/components/ui/TextField";
import { callApi, type ApiFail } from "@/lib/api";
import { GRADES } from "@/lib/grades";
import { IssuedAccounts, type IssuedAccount } from "./IssuedAccounts";

type Props = { role: "teacher" | "student"; label: string; defaultGrade?: number };

export function CreateAccountsButton({ role, label, defaultGrade }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [issued, setIssued] = useState<IssuedAccount[] | null>(null);
  const [error, setError] = useState<ApiFail | null>(null);
  const [pending, setPending] = useState(false);
  const errorOf = (field: string) => (error?.field === field ? error.message : undefined);

  function close() {
    setOpen(false);
    setIssued(null);
    setError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const raw = { role, grade: "", ...Object.fromEntries(new FormData(event.currentTarget)) };
    const result = await callApi<{ issued: IssuedAccount[] }>("/api/users", "POST", raw);
    setPending(false);
    if (!result.ok) {
      setError(result);
      return;
    }
    setError(null);
    setIssued(result.issued);
    router.refresh();
  }

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Dialog open={open} onClose={close} title={label} wide closeOnOutside={!issued && !pending}>
        {issued ? (
          <IssuedAccounts issued={issued} onClose={close} />
        ) : (
          <form onSubmit={submit} noValidate>
            {error && !error.field && <Alert>{error.message}</Alert>}
            {role === "student" && (
              <Select
                label="Khối"
                name="grade"
                defaultValue={defaultGrade ? String(defaultGrade) : ""}
                placeholder="Chọn khối"
                options={GRADES.map((grade) => ({ value: String(grade), label: `Khối ${grade}` }))}
                error={errorOf("grade")}
                className="max-w-48"
              />
            )}
            <TextArea
              label={role === "student" ? "Họ tên và số điện thoại, mỗi dòng một người" : "Họ tên, mỗi dòng một người"}
              name="names"
              placeholder={role === "student" ? "Nguyễn Văn An 0912345678" : "Nguyễn Văn An"}
              error={errorOf("names")}
            />
            <div className="flex justify-end gap-2">
              <Button onClick={close} disabled={pending}>
                Huỷ
              </Button>
              <Button type="submit" variant="primary" disabled={pending}>
                Tạo tài khoản
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}

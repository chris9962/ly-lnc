"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/TextField";
import { callApi, type ApiFail } from "@/lib/api";
import { MAX_NAME_LENGTH } from "@/lib/userForm";

type Account = { id: number; username: string; fullName: string; role: "admin" | "teacher" | "student" };
type Props = { account: Account; label?: string; size?: "md" | "sm" };

export function EditAccountButton({ account, label = "Sửa", size = "md" }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiFail | null>(null);
  const isStudent = account.role === "student";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const result = await callApi(`/api/users/${account.id}`, "PATCH", Object.fromEntries(new FormData(event.currentTarget)));
    setPending(false);
    if (!result.ok) return setError(result);
    setOpen(false);
    router.refresh();
  }

  const errorOf = (field: string) => (error?.field === field ? error.message : undefined);

  return (
    <>
      <Button
        size={size}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        {label}
      </Button>
      {open && (
        <Dialog open onClose={() => setOpen(false)} title="Sửa thông tin" closeOnOutside={!pending}>
          <form onSubmit={submit} noValidate>
            {error && !error.field && <Alert>{error.message}</Alert>}
            <TextField label="Họ tên" name="fullName" defaultValue={account.fullName} maxLength={MAX_NAME_LENGTH} autoComplete="off" error={errorOf("fullName")} autoFocus />
            {isStudent && <TextField label="Số điện thoại đăng nhập" name="phone" type="tel" inputMode="numeric" defaultValue={account.username} autoComplete="off" error={errorOf("phone")} />}
            <div className="flex justify-end gap-2">
              <Button onClick={() => setOpen(false)} disabled={pending}>
                Huỷ
              </Button>
              <Button type="submit" variant="primary" disabled={pending}>
                Lưu
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}

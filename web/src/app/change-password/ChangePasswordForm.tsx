"use client";

import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { PasswordField } from "@/components/ui/PasswordField";
import { callApi, type ApiFail } from "@/lib/api";

export function ChangePasswordForm() {
  const [error, setError] = useState<ApiFail | null>(null);
  const [pending, setPending] = useState(false);
  const errorOf = (field: string) => (error?.field === field ? error.message : undefined);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const result = await callApi<{ redirect: string }>("/api/auth/password", "POST", Object.fromEntries(new FormData(event.currentTarget)));
    if (result.ok) {
      window.location.assign(result.redirect);
      return;
    }
    setError(result);
    setPending(false);
  }

  return (
    <form onSubmit={submit} noValidate>
      {error && !error.field && <Alert>{error.message}</Alert>}
      <PasswordField label="Mật khẩu hiện tại" name="current" autoComplete="current-password" error={errorOf("current")} />
      <PasswordField label="Mật khẩu mới" name="next" autoComplete="new-password" error={errorOf("next")} />
      <PasswordField label="Nhập lại mật khẩu mới" name="confirm" autoComplete="new-password" error={errorOf("confirm")} />
      <Button type="submit" variant="primary" className="w-full" disabled={pending}>
        Đổi mật khẩu
      </Button>
    </form>
  );
}

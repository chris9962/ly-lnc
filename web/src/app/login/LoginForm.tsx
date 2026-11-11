"use client";

import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { PasswordField } from "@/components/ui/PasswordField";
import { TextField } from "@/components/ui/TextField";
import { callApi, type ApiFail } from "@/lib/api";

export function LoginForm() {
  const [error, setError] = useState<ApiFail | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const result = await callApi<{ redirect: string }>("/api/auth/login", "POST", Object.fromEntries(new FormData(event.currentTarget)));
    if (result.ok) {
      // tải lại cả trang để mọi thành phần máy chủ đọc phiên mới
      window.location.assign(result.redirect);
      return;
    }
    setError(result);
    setPending(false);
  }

  return (
    <form onSubmit={submit} noValidate>
      {error && !error.field && <Alert>{error.message}</Alert>}
      <TextField label="Tên đăng nhập hoặc số điện thoại" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} error={error?.field === "username" ? error.message : undefined} />
      <PasswordField label="Mật khẩu" name="password" autoComplete="current-password" error={error?.field === "password" ? error.message : undefined} />
      <Button type="submit" variant="primary" className="w-full" disabled={pending}>
        Đăng nhập
      </Button>
    </form>
  );
}

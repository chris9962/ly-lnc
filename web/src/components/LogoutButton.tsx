"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { callApi } from "@/lib/api";
import { buttonClass } from "./ui/Button";

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    await callApi("/api/auth/logout", "POST");
    router.replace("/login");
    router.refresh();
  }

  return (
    <button type="button" className={className ?? buttonClass("secondary", "sm")} onClick={logout} disabled={pending}>
      Đăng xuất
    </button>
  );
}

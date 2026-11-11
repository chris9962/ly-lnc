"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { callApi } from "@/lib/api";
import { Button } from "./ui/Button";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    await callApi("/api/auth/logout", "POST");
    router.replace("/login");
    router.refresh();
  }

  return (
    <Button size="sm" onClick={logout} disabled={pending}>
      Đăng xuất
    </Button>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Dialog } from "@/components/ui/Dialog";
import { Select } from "@/components/ui/Select";
import { callApi } from "@/lib/api";
import { GRADES } from "@/lib/grades";
import { IssuedAccounts, type IssuedAccount } from "./IssuedAccounts";

type Account = { id: number; username: string; fullName: string; grade: number | null; disabled: boolean };

export function GradeSelect({ account }: { account: Account }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function change(grade: string) {
    setPending(true);
    await callApi(`/api/users/${account.id}`, "PATCH", { grade });
    setPending(false);
    router.refresh();
  }

  return (
    <Select
      compact
      label={`Khối của ${account.fullName}`}
      value={String(account.grade ?? "")}
      disabled={pending}
      onChange={(event) => change(event.target.value)}
      options={GRADES.map((grade) => ({ value: String(grade), label: String(grade) }))}
    />
  );
}

export function AccountRowActions({ account }: { account: Account }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState<"reset" | "delete" | null>(null);
  const [issued, setIssued] = useState<IssuedAccount | null>(null);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  function closeConfirm() {
    setConfirm(null);
    setError(undefined);
  }

  async function run<T extends object>(url: string, method: "POST" | "PATCH" | "DELETE", body?: unknown) {
    setPending(true);
    const result = await callApi<T>(url, method, body);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return null;
    }
    closeConfirm();
    router.refresh();
    return result;
  }

  async function reset() {
    const result = await run<{ issued: IssuedAccount }>(`/api/users/${account.id}/reset-password`, "POST");
    if (result) setIssued(result.issued);
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      <Button size="sm" onClick={() => setConfirm("reset")}>
        Đặt lại mật khẩu
      </Button>
      <Button size="sm" disabled={pending} onClick={() => run(`/api/users/${account.id}`, "PATCH", { disabled: !account.disabled })}>
        {account.disabled ? "Mở khoá" : "Khoá"}
      </Button>
      <Button size="sm" variant="danger" onClick={() => setConfirm("delete")}>
        Xoá
      </Button>

      <ConfirmDialog
        open={confirm === "reset"}
        question={`Đặt lại mật khẩu của ${account.username}?`}
        confirmLabel="Đặt lại"
        pending={pending}
        error={error}
        onConfirm={reset}
        onClose={closeConfirm}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        question={`Xoá tài khoản ${account.username}?`}
        confirmLabel="Xoá"
        danger
        pending={pending}
        error={error}
        onConfirm={() => run(`/api/users/${account.id}`, "DELETE")}
        onClose={closeConfirm}
      />
      <Dialog open={!!issued} onClose={() => setIssued(null)} title="Đặt lại mật khẩu" wide closeOnOutside={false}>
        {issued && <IssuedAccounts issued={[issued]} onClose={() => setIssued(null)} />}
      </Dialog>
    </div>
  );
}

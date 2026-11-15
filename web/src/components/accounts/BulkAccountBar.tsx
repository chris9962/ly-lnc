"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Select } from "@/components/ui/Select";
import { callApi } from "@/lib/api";
import { GRADES } from "@/lib/grades";

type Props = { selected: number[]; allIds: number[]; pageFullySelected: boolean; onSelectAll: () => void; onClear: () => void };
type Pending = { action: "grade"; grade: number } | { action: "delete" };

export function BulkAccountBar({ selected, allIds, pageFullySelected, onSelectAll, onClear }: Props) {
  const router = useRouter();
  const [confirm, setConfirm] = useState<Pending | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const count = selected.length;

  function close() {
    setConfirm(null);
    setError(undefined);
  }

  async function run() {
    if (!confirm) return;
    setPending(true);
    const result = await callApi("/api/users/bulk", "POST", { ...confirm, ids: selected });
    setPending(false);
    if (!result.ok) return setError(result.message);
    close();
    onClear();
    router.refresh();
  }

  return (
    <div role="region" aria-label="Thao tác với học sinh đã chọn" className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-line bg-surface-alt px-3 py-2">
      <p className="font-semibold" aria-live="polite">
        Đã chọn {count} học sinh
      </p>
      {pageFullySelected && allIds.length > count && (
        <button type="button" onClick={onSelectAll} className="cursor-pointer rounded-md px-2 py-1 text-sm font-semibold text-brand hover:bg-surface">
          Chọn cả {allIds.length} học sinh đang lọc
        </button>
      )}
      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        <Select
          compact
          label="Chuyển khối các học sinh đã chọn"
          placeholder="Chuyển khối"
          value=""
          onChange={(event) => setConfirm({ action: "grade", grade: Number(event.target.value) })}
          options={GRADES.map((grade) => ({ value: String(grade), label: `Sang khối ${grade}` }))}
        />
        <Button size="sm" variant="danger" onClick={() => setConfirm({ action: "delete" })}>
          Xoá
        </Button>
        <Button size="sm" onClick={onClear}>
          Bỏ chọn
        </Button>
      </div>

      <ConfirmDialog
        open={confirm?.action === "grade"}
        question={`Chuyển ${count} học sinh sang khối ${confirm?.action === "grade" ? confirm.grade : ""}?`}
        confirmLabel="Chuyển khối"
        pending={pending}
        error={error}
        onConfirm={run}
        onClose={close}
      />
      <ConfirmDialog
        open={confirm?.action === "delete"}
        question={`Xoá ${count} tài khoản cùng mọi bài làm?`}
        confirmLabel="Xoá"
        danger
        pending={pending}
        error={error}
        onConfirm={run}
        onClose={close}
      />
    </div>
  );
}

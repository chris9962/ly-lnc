"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cx } from "@/components/ui/cx";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/TextField";
import { callApi, type ApiFail } from "@/lib/api";
import type { FolderNode } from "./folderNodes";

type Props = { nodes: FolderNode[]; current?: number; hrefFor: Record<string, string>; allHref: string; total: number };

type Editing = { mode: "create"; parentId: number | null; parentName?: string } | { mode: "rename"; folder: FolderNode } | null;

const row = "flex min-h-9 items-center gap-2 rounded-lg pr-1 no-underline";

function FolderIcon({ open }: { open?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 shrink-0">
      <path d={open ? "M2 6a2 2 0 0 1 2-2h3l2 2h7a2 2 0 0 1 2 2v1H5l-3 7z" : "M2 6a2 2 0 0 1 2-2h3l2 2h7a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z"} fill="currentColor" opacity="0.85" />
    </svg>
  );
}

export function FolderTree({ nodes, current, hrefFor, allHref, total }: Props) {
  const router = useRouter();
  const [menuFor, setMenuFor] = useState<number | null>(null);
  const [editing, setEditing] = useState<Editing>(null);
  const [removing, setRemoving] = useState<FolderNode | null>(null);
  const [error, setError] = useState<ApiFail | null>(null);
  const [pending, setPending] = useState(false);
  const menuRef = useRef<HTMLLIElement>(null);

  // menu thao tác đóng khi bấm ra ngoài hoặc nhấn Esc
  useEffect(() => {
    if (menuFor === null) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuFor(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuFor(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuFor]);

  function open(next: Editing) {
    setMenuFor(null);
    setError(null);
    setEditing(next);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setPending(true);
    const name = String(new FormData(event.currentTarget).get("name") ?? "");
    const result =
      editing.mode === "create"
        ? await callApi<{ id: number }>("/api/folders", "POST", { name, parentId: editing.parentId })
        : await callApi(`/api/folders/${editing.folder.id}`, "PATCH", { name, parentId: editing.folder.parentId });
    setPending(false);
    if (!result.ok) return setError(result);
    setEditing(null);
    router.refresh();
  }

  async function remove() {
    if (!removing) return;
    setPending(true);
    const result = await callApi(`/api/folders/${removing.id}`, "DELETE");
    setPending(false);
    if (!result.ok) return setError(result);
    const wasCurrent = removing.id === current;
    setRemoving(null);
    if (wasCurrent) router.push(allHref);
    router.refresh();
  }

  return (
    <nav aria-label="Thư mục" className="text-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="font-bold">Thư mục</h2>
        <Button size="sm" onClick={() => open({ mode: "create", parentId: null })}>
          Thư mục mới
        </Button>
      </div>
      <ul className="space-y-0.5">
        <li>
          <Link href={allHref} aria-current={current === undefined ? "page" : undefined} className={cx(row, "pl-2", current === undefined ? "bg-brand text-on-brand" : "text-ink hover:bg-surface-alt")}>
            <span className="flex-1 font-semibold">Tất cả đề</span>
            <span className={current === undefined ? "" : "text-muted"}>{total}</span>
          </Link>
        </li>
        {nodes.map((node) => {
          const active = node.id === current;
          return (
            <li key={node.id} className="relative" ref={menuFor === node.id ? menuRef : undefined}>
              <div className={cx(row, active ? "bg-brand text-on-brand" : "text-ink hover:bg-surface-alt")} style={{ paddingLeft: `${8 + node.depth * 16}px` }}>
                <Link href={hrefFor[node.id]} aria-current={active ? "page" : undefined} className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-inherit no-underline">
                  <FolderIcon open={active} />
                  <span className="truncate">{node.name}</span>
                  <span className={cx("ml-auto pl-1", active ? "" : "text-muted")}>{node.paperCount}</span>
                </Link>
                <button
                  type="button"
                  aria-label={`Thao tác thư mục ${node.name}`}
                  aria-expanded={menuFor === node.id}
                  onClick={() => setMenuFor(menuFor === node.id ? null : node.id)}
                  className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-md text-inherit hover:bg-black/10"
                >
                  <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4">
                    <circle cx="4" cy="10" r="1.6" fill="currentColor" />
                    <circle cx="10" cy="10" r="1.6" fill="currentColor" />
                    <circle cx="16" cy="10" r="1.6" fill="currentColor" />
                  </svg>
                </button>
              </div>
              {menuFor === node.id && (
                <div role="group" aria-label={`Thao tác thư mục ${node.name}`} className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-line bg-surface p-1 shadow-lg">
                  <button type="button" className="flex min-h-9 w-full cursor-pointer items-center rounded-md px-3 text-left hover:bg-surface-alt" onClick={() => open({ mode: "create", parentId: node.id, parentName: node.name })}>
                    Thêm thư mục con
                  </button>
                  <button type="button" className="flex min-h-9 w-full cursor-pointer items-center rounded-md px-3 text-left hover:bg-surface-alt" onClick={() => open({ mode: "rename", folder: node })}>
                    Đổi tên
                  </button>
                  <button
                    type="button"
                    className="flex min-h-9 w-full cursor-pointer items-center rounded-md px-3 text-left text-danger hover:bg-danger-soft"
                    onClick={() => {
                      setMenuFor(null);
                      setError(null);
                      setRemoving(node);
                    }}
                  >
                    Xoá thư mục
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {!nodes.length && <p className="mt-2 px-2 text-muted">Chưa có thư mục</p>}

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        closeOnOutside={!pending}
        title={editing?.mode === "rename" ? "Đổi tên thư mục" : editing?.parentName ? `Thư mục mới trong ${editing.parentName}` : "Thư mục mới"}
      >
        <form onSubmit={save} noValidate>
          {error && !error.field && <Alert>{error.message}</Alert>}
          <TextField label="Tên thư mục" name="name" defaultValue={editing?.mode === "rename" ? editing.folder.name : ""} autoFocus maxLength={60} error={error?.field === "name" ? error.message : undefined} />
          <div className="flex justify-end gap-2">
            <Button onClick={() => setEditing(null)} disabled={pending}>
              Huỷ
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {editing?.mode === "rename" ? "Lưu" : "Tạo thư mục"}
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={removing !== null}
        question={`Xoá thư mục ${removing?.name ?? ""}?`}
        confirmLabel="Xoá thư mục"
        danger
        pending={pending}
        error={error?.message}
        onConfirm={remove}
        onClose={() => setRemoving(null)}
      />
    </nav>
  );
}

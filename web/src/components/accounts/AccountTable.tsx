"use client";

import Link from "next/link";
import { useState } from "react";
import { Checkbox } from "@/components/ui/Checkbox";
import { StatusTag } from "@/components/ui/StatusTag";
import { formatDate } from "@/lib/format";
import type { UserListItem } from "@/server/users";
import { AccountRowActions, GradeSelect } from "./AccountRowActions";
import { BulkAccountBar } from "./BulkAccountBar";

function Status({ account }: { account: UserListItem }) {
  if (account.disabled) return <StatusTag tone="danger">Đã khoá</StatusTag>;
  if (account.mustChangePassword) return <StatusTag tone="warning">Mật khẩu tạm</StatusTag>;
  return <StatusTag tone="success">Đang dùng</StatusTag>;
}

const cell = "px-3 py-2 align-middle";

// selectableIds là id của mọi dòng khớp bộ lọc, gồm cả các trang khác; có giá trị thì bảng hiện ô chọn
type Props = { accounts: UserListItem[]; showGrade?: boolean; emptyLabel: string; usernameLabel?: string; profilePath?: string; selectableIds?: number[] };

export function AccountTable({ accounts, showGrade, emptyLabel, usernameLabel = "Tên đăng nhập", profilePath, selectableIds }: Props) {
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set());
  if (!accounts.length) return <p className="py-6 text-center text-muted">{emptyLabel}</p>;

  // tài khoản vừa bị xoá ở nơi khác thì không còn tính là đang chọn
  const chosen = selectableIds ? selectableIds.filter((id) => selected.has(id)) : [];
  const onPage = accounts.filter((account) => selected.has(account.id)).length;
  const pageFullySelected = onPage === accounts.length;

  function toggle(ids: number[], on: boolean) {
    const next = new Set(selected);
    for (const id of ids) {
      if (on) next.add(id);
      else next.delete(id);
    }
    setSelected(next);
  }

  return (
    <>
      {selectableIds && chosen.length > 0 && (
        <BulkAccountBar selected={chosen} allIds={selectableIds} pageFullySelected={pageFullySelected} onSelectAll={() => setSelected(new Set(selectableIds))} onClear={() => setSelected(new Set())} />
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
              {selectableIds && (
                <th scope="col" className="w-10 py-2 pl-1 align-middle">
                  <Checkbox
                    label="Chọn mọi học sinh trên trang này"
                    checked={pageFullySelected}
                    indeterminate={onPage > 0 && !pageFullySelected}
                    onChange={(event) => toggle(accounts.map((account) => account.id), event.target.checked)}
                  />
                </th>
              )}
              <th scope="col" className={cell}>Họ tên</th>
              <th scope="col" className={cell}>{usernameLabel}</th>
              {showGrade && <th scope="col" className={cell}>Khối</th>}
              <th scope="col" className={cell}>Trạng thái</th>
              <th scope="col" className={cell}>Ngày tạo</th>
              <th scope="col" className={cell}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account.id} className="border-b border-line last:border-0">
                {selectableIds && (
                  <td className="w-10 py-2 pl-1 align-middle">
                    <Checkbox label={`Chọn ${account.fullName}`} checked={selected.has(account.id)} onChange={(event) => toggle([account.id], event.target.checked)} />
                  </td>
                )}
                <td className={cell}>
                  {profilePath ? (
                    <Link href={`${profilePath}/${account.id}`} className="font-semibold text-ink hover:text-brand">
                      {account.fullName}
                    </Link>
                  ) : (
                    account.fullName
                  )}
                </td>
                <td className={`${cell} font-mono`}>{account.username}</td>
                {showGrade && (
                  <td className={cell}>
                    <GradeSelect account={account} />
                  </td>
                )}
                <td className={cell}>
                  <Status account={account} />
                </td>
                <td className={`${cell} whitespace-nowrap`}>{formatDate(account.createdAt)}</td>
                <td className={cell}>
                  <AccountRowActions account={account} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

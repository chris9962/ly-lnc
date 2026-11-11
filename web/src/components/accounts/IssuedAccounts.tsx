"use client";

import { Button } from "@/components/ui/Button";
import { StatusTag } from "@/components/ui/StatusTag";

export type IssuedAccount = { fullName: string; username: string; password: string };

export function IssuedAccounts({ issued, onClose }: { issued: IssuedAccount[]; onClose: () => void }) {
  const asText = issued.map((account) => `${account.fullName}\t${account.username}\t${account.password}`).join("\n");
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="text-base font-bold">Tài khoản vừa cấp</h3>
        <StatusTag tone="warning">Mật khẩu tạm chỉ hiện một lần</StatusTag>
      </div>
      <div className="max-h-80 overflow-auto rounded-lg border border-line">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-surface-alt text-xs uppercase tracking-wide text-muted">
              <th scope="col" className="px-3 py-2">Họ tên</th>
              <th scope="col" className="px-3 py-2">Tên đăng nhập</th>
              <th scope="col" className="px-3 py-2">Mật khẩu tạm</th>
            </tr>
          </thead>
          <tbody>
            {issued.map((account) => (
              <tr key={account.username} className="border-b border-line last:border-0">
                <td className="px-3 py-2">{account.fullName}</td>
                <td className="px-3 py-2 font-mono">{account.username}</td>
                <td className="px-3 py-2 font-mono">{account.password}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="no-print mt-4 flex flex-wrap justify-end gap-2">
        <Button size="sm" onClick={() => navigator.clipboard.writeText(asText)}>
          Chép
        </Button>
        <Button size="sm" onClick={() => window.print()}>
          In
        </Button>
        <Button size="sm" variant="primary" onClick={onClose}>
          Đóng
        </Button>
      </div>
    </div>
  );
}

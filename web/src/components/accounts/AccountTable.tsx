import { StatusTag } from "@/components/ui/StatusTag";
import { formatDate } from "@/lib/format";
import type { UserListItem } from "@/server/users";
import { AccountRowActions, GradeSelect } from "./AccountRowActions";

function Status({ account }: { account: UserListItem }) {
  if (account.disabled) return <StatusTag tone="danger">Đã khoá</StatusTag>;
  if (account.mustChangePassword) return <StatusTag tone="warning">Mật khẩu tạm</StatusTag>;
  return <StatusTag tone="success">Đang dùng</StatusTag>;
}

const cell = "px-3 py-2 align-middle";

type Props = { accounts: UserListItem[]; showGrade?: boolean; emptyLabel: string; usernameLabel?: string };

export function AccountTable({ accounts, showGrade, emptyLabel, usernameLabel = "Tên đăng nhập" }: Props) {
  if (!accounts.length) return <p className="py-6 text-center text-muted">{emptyLabel}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
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
              <td className={cell}>{account.fullName}</td>
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
  );
}

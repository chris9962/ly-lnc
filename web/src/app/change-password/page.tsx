import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import { buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusTag } from "@/components/ui/StatusTag";
import { homePath, requirePage } from "@/lib/permissions";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const metadata = { title: "Đổi mật khẩu" };

export default async function ChangePasswordPage() {
  const user = await requirePage(undefined, { allowTemporaryPassword: true });
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <h1 className="text-2xl font-bold">Đổi mật khẩu</h1>
        <p className="mb-4 mt-1 flex flex-wrap items-center gap-2 text-muted">
          {user.fullName} ({user.username}){user.mustChangePassword && <StatusTag tone="warning">Mật khẩu tạm</StatusTag>}
        </p>
        <ChangePasswordForm />
        <div className="mt-4 flex justify-between gap-2">
          {user.mustChangePassword ? (
            <span />
          ) : (
            <Link href={homePath(user)} className={buttonClass("secondary", "sm")}>
              <ArrowLeft aria-hidden="true" className="size-4" />
              Quay lại
            </Link>
          )}
          <LogoutButton />
        </div>
      </Card>
    </main>
  );
}

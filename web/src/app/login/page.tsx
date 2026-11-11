import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Card } from "@/components/ui/Card";
import { currentUser, homePath } from "@/lib/permissions";
import { SITE_NAME } from "@/lib/site";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Đăng nhập" };

export default async function LoginPage() {
  const user = await currentUser();
  if (user) redirect(homePath(user));
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <div className="mb-5 flex items-center gap-3">
          <Logo size={52} />
          <h1 className="text-3xl font-bold tracking-wider">{SITE_NAME}</h1>
        </div>
        <LoginForm />
      </Card>
    </main>
  );
}

import { redirect } from "next/navigation";
import { CosmosBand, Rocket } from "@/components/CosmosBand";
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
    <main className="relative flex min-h-screen items-center justify-center p-4">
      <CosmosBand className="absolute inset-x-0 bottom-0" />
      <Rocket />
      <Card className="relative w-full max-w-sm">
        <div className="mb-5 flex items-center gap-3">
          <Logo size={52} />
          <h1 className="text-lg font-bold leading-snug">{SITE_NAME}</h1>
        </div>
        <LoginForm />
      </Card>
    </main>
  );
}

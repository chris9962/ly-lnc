import { redirect } from "next/navigation";
import { homePath, requirePage } from "@/lib/permissions";

export default async function HomePage() {
  redirect(homePath(await requirePage()));
}

import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { ShootingStars } from "@/components/CosmosBand";
import { SITE_NAME } from "@/lib/site";
import { currentUser } from "@/lib/permissions";
import { skinOf, THEME_COOKIE, themeOf } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: SITE_NAME, template: `%s - ${SITE_NAME}` },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const role = (await currentUser())?.role;
  const skin = skinOf(role);
  const theme = themeOf(role, (await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html lang="vi" data-theme={theme === "system" ? undefined : theme} data-skin={skin} data-glass={role === "student" ? "" : undefined} data-nav={role === "student" ? "none" : undefined}>
      <body>
        {skin === "space" && <ShootingStars />}
        {children}
      </body>
    </html>
  );
}

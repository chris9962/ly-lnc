import type { Metadata, Viewport } from "next";
import { SITE_NAME } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: SITE_NAME, template: `%s - ${SITE_NAME}` },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}

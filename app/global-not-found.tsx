import type { Metadata } from "next";
import Link from "next/link";
import { Public_Sans } from "next/font/google";
import "./globals.css";

const publicSans = Public_Sans({ variable: "--font-public-sans", subsets: ["latin"] });

export const metadata: Metadata = { title: "Page not found · CM Project Monitor" };

/** Addresses that match no route at all (pages that call notFound() use app/[locale]/not-found.tsx). */
export default function GlobalNotFound() {
  return (
    <html lang="en" className={`${publicSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
          <p className="text-sm font-medium text-muted-foreground">404</p>
          <h1 className="text-[28px] leading-tight font-bold tracking-tight text-navy">Page not found</h1>
          <p className="max-w-sm text-sm text-muted-foreground">This page doesn&apos;t exist, or it is outside the area you have access to.</p>
          <Link href="/" className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
            Go to home
          </Link>
        </main>
      </body>
    </html>
  );
}

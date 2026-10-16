import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRightIcon } from "lucide-react";
import { AdminHeader } from "@/components/app-shell/admin-header";
import { PasswordChangedToast } from "@/components/account/password-changed-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { STATES, STATE_CODES } from "@/config/states";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Select state" };

export default function SelectStatePage() {
  return (
    <>
      <AdminHeader />
      <Suspense>
        <PasswordChangedToast />
      </Suspense>
      <main className="flex-1 bg-muted/30">
        <div className="mx-auto w-full max-w-3xl px-4 py-12">
          <h1 className="text-2xl font-semibold tracking-tight">Select a state</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            As an administrator you can work in any state. You can switch later from the user menu.
          </p>
          <Suspense
            fallback={
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <Skeleton className="h-40" />
                <Skeleton className="h-40" />
              </div>
            }
          >
            <StateCards />
          </Suspense>
        </div>
      </main>
    </>
  );
}

async function StateCards() {
  await requireAdmin();

  const stats = await Promise.all(
    STATE_CODES.map(async (code) => {
      const [districts, projects] = await Promise.all([
        db.district.count({ where: { state: { code } } }),
        db.project.count({ where: { district: { state: { code } } } }),
      ]);
      return { code, districts, projects };
    }),
  );

  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2">
      {stats.map(({ code, districts, projects }) => {
        const s = STATES[code];
        return (
          <Link
            key={code}
            href={`/${code.toLowerCase()}`}
            className="group relative overflow-hidden rounded-xl border bg-card p-6 shadow-xs transition hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: s.theme.primary }} />
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xl font-semibold">{s.name}</div>
                <div className="text-muted-foreground">{s.nameLocal}</div>
              </div>
              <ArrowRightIcon className="size-5 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
            </div>
            <div className="mt-6 flex gap-6 text-sm">
              <span>
                <span className="font-semibold tabular-nums">{districts}</span>{" "}
                <span className="text-muted-foreground">districts</span>
              </span>
              <span>
                <span className="font-semibold tabular-nums">{projects}</span>{" "}
                <span className="text-muted-foreground">projects</span>
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

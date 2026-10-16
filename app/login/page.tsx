import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { LandmarkIcon, SatelliteIcon, ClipboardCheckIcon, MapIcon, ShieldIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { STATES, STATE_CODES } from "@/config/states";
import { DEMO_ACCOUNTS } from "@/config/demo-accounts";
import { getCurrentPortal } from "@/lib/portal";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

const FEATURES = [
  { icon: MapIcon, text: "State and district view of every reported project" },
  { icon: SatelliteIcon, text: "Dated satellite, drone and field imagery for each site" },
  { icon: ClipboardCheckIcon, text: "Progress, issues and directives in one place" },
];

export default function LoginPage() {
  return (
    <main className="grid min-h-svh lg:grid-cols-[1.1fr_1fr]">
      <Suspense fallback={<LoginSkeleton />}>
        <PortalLogin />
      </Suspense>
    </main>
  );
}

/** Branding and demo accounts depend on which portal (address) this is. */
async function PortalLogin() {
  const portal = await getCurrentPortal();
  if (!portal) notFound();

  const state = portal.kind === "state" ? STATES[portal.stateCode] : null;
  const accent = state?.theme.primary ?? "#0f172a";
  const demoAccounts = DEMO_ACCOUNTS.filter((a) => a.portal === portal.id);

  return (
    <>
      <section className="relative hidden flex-col justify-between overflow-hidden bg-slate-900 p-10 text-slate-100 lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <span aria-hidden className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: accent }} />
        <div className="relative flex items-center gap-2.5 text-sm font-medium tracking-wide">
          <LandmarkIcon className="size-5" />
          {state ? (
            <>
              Chief Minister&apos;s Office, {state.name}
              <span className="font-normal text-slate-400">{state.nameLocal}</span>
            </>
          ) : (
            "Chief Minister's Office · Administration"
          )}
        </div>

        <div className="relative max-w-md">
          <h1 className="text-3xl font-semibold leading-tight">
            {state ? `${state.name} Infrastructure Project Monitoring` : "Infrastructure Project Monitoring"}
          </h1>
          <p className="mt-3 text-slate-300">
            A verification layer over district project reporting — see what is happening on the ground, date by date.
          </p>
          <ul className="mt-8 grid gap-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm text-slate-200">
                <Icon className="mt-0.5 size-4 shrink-0 text-slate-400" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex gap-6 text-sm text-slate-400">
          {state ? (
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full" style={{ backgroundColor: accent }} />
              {state.name} · {state.nameLocal}
            </span>
          ) : (
            STATE_CODES.map((code) => (
              <span key={code} className="flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ backgroundColor: STATES[code].theme.primary }} />
                {STATES[code].name}
              </span>
            ))
          )}
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <div className="mb-6 flex items-center gap-2 text-sm font-medium lg:hidden" style={{ color: accent }}>
              <LandmarkIcon className="size-4" />
              {state ? `CM Project Monitor · ${state.name}` : "CM Project Monitor · Administration"}
            </div>
            <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              {!state && <ShieldIcon className="size-5 text-muted-foreground" />}
              {state ? "Sign in" : "Administrator sign in"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {state
                ? `Use your official ${state.name} account to continue.`
                : "This portal is for system administrators only."}
            </p>
          </div>
          <Suspense>
            <LoginForm demoAccounts={demoAccounts} />
          </Suspense>
        </div>
      </section>
    </>
  );
}

function LoginSkeleton() {
  return (
    <>
      <section className="hidden bg-slate-900 lg:block" />
      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="grid w-full max-w-sm gap-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </section>
    </>
  );
}

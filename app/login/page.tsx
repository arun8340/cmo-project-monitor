import type { Metadata } from "next";
import { Suspense } from "react";
import { LandmarkIcon, SatelliteIcon, ClipboardCheckIcon, MapIcon } from "lucide-react";
import { STATES, STATE_CODES } from "@/config/states";
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
        <div className="relative flex items-center gap-2.5 text-sm font-medium tracking-wide">
          <LandmarkIcon className="size-5" />
          Chief Minister&apos;s Office
        </div>

        <div className="relative max-w-md">
          <h1 className="text-3xl font-semibold leading-tight">Infrastructure Project Monitoring</h1>
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
          {STATE_CODES.map((code) => (
            <span key={code} className="flex items-center gap-2">
              <span className="size-2 rounded-full" style={{ backgroundColor: STATES[code].theme.primary }} />
              {STATES[code].name} · {STATES[code].nameLocal}
            </span>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <div className="mb-6 flex items-center gap-2 text-sm font-medium text-muted-foreground lg:hidden">
              <LandmarkIcon className="size-4" />
              CM Project Monitor
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
            <p className="mt-1 text-sm text-muted-foreground">Use your official account to continue.</p>
          </div>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

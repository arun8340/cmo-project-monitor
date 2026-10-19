import Link from "next/link";
import type { ReactNode } from "react";

/** Page title (with optional name in the other language), a subtitle and actions on the right. */
export function PageHeader({
  title,
  titleSecondary,
  subtitle,
  badges,
  actions,
}: {
  title: ReactNode;
  titleSecondary?: string | null;
  subtitle?: ReactNode;
  badges?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h1 className="text-[28px] leading-tight font-bold tracking-tight text-navy">
            {title}
            {titleSecondary && <span className="ml-2 text-xl font-semibold text-muted-foreground">{titleSecondary}</span>}
          </h1>
          {badges}
        </div>
        {subtitle && <p className="mt-1 text-[15px] text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export type Tone = "default" | "ok" | "info" | "warn" | "bad" | "stall";

const TONE_TEXT: Record<Tone, string> = {
  default: "text-navy",
  ok: "text-ok",
  info: "text-info",
  warn: "text-warn",
  bad: "text-bad",
  stall: "text-stall",
};

/** Headline number card (the KPI row). Becomes a link when `href` is given. */
export function StatCard({ label, value, hint, tone = "default", href }: { label: ReactNode; value: ReactNode; hint?: ReactNode; tone?: Tone; href?: string }) {
  const body = (
    <>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={`mt-1 text-[34px] leading-none font-bold tracking-tight tabular-nums ${TONE_TEXT[tone]}`}>{value}</div>
      {hint && <div className="mt-2 text-[13px] text-muted-foreground">{hint}</div>}
    </>
  );
  const cls = "block rounded-xl border bg-card px-4 py-4 sm:px-5";
  return href ? (
    <Link href={href} className={`${cls} transition hover:border-input hover:shadow-sm`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Smaller fact card (label above value), e.g. budget or dates on a project. */
export function FactCard({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <div className="text-[13px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate text-lg font-bold text-navy">{value}</div>
    </div>
  );
}

/** White card with a heading, optional description and an action (link) on the right. */
export function Panel({
  title,
  description,
  action,
  children,
  className = "",
  id,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section className={`rounded-xl border bg-card p-4 sm:p-5 ${className}`} aria-labelledby={id}>
      {(title || action) && (
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            {title && (
              <h2 id={id} className="flex items-center gap-2 text-lg font-bold text-navy">
                {title}
              </h2>
            )}
            {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Text link in the panel style ("View all"). */
export function PanelLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-sm font-semibold text-link hover:text-navy hover:underline">
      {children}
    </Link>
  );
}

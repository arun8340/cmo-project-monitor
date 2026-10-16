"use client";

import Form from "next/form";
import { useRef } from "react";
import { SearchIcon, XIcon } from "lucide-react";
import { SORTS, type SortKey } from "@/lib/data/sorts";

type Props = { action: string; q: string; status: string | null; sort: SortKey };

/** Search + sort. Submits as URL search params (works without JavaScript too). */
export function ListControls({ action, q, status, sort }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <Form ref={formRef} action={action} className="flex flex-col gap-2 sm:flex-row sm:items-center" role="search">
      {status && <input type="hidden" name="status" value={status.toLowerCase()} />}
      <div className="relative flex-1">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          key={q}
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search projects by name…"
          aria-label="Search projects"
          className="h-9 w-full rounded-lg border bg-background pr-8 pl-8 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        {q && (
          <a
            href={status ? `${action}?status=${status.toLowerCase()}` : action}
            aria-label="Clear search"
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
          >
            <XIcon className="size-4" />
          </a>
        )}
      </div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        Sort
        <select
          name="sort"
          defaultValue={sort}
          onChange={() => formRef.current?.requestSubmit()}
          className="h-9 rounded-lg border bg-background px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {Object.entries(SORTS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="sr-only">
        Search
      </button>
    </Form>
  );
}

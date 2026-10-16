"use client";

import type { ComponentProps } from "react";

/** A <select> inside a filter form that applies the filter as soon as it changes. */
export function AutoSubmitSelect(props: ComponentProps<"select">) {
  return <select {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()} />;
}

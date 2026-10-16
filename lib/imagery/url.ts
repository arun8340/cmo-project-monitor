/** Access-checked URL for an imagery file (see app/api/imagery/[id]/route.ts). */
export function imageryUrl(id: string, variant: "thumb" | "display" | "original" = "display") {
  return `/api/imagery/${id}?v=${variant}`;
}

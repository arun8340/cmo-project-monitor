/** Project list sort options (shared by the server query and the client sort menu). */
export const SORTS = {
  behind: "Most behind schedule",
  name: "Name",
  progress: "Progress",
  budget: "Budget",
  end: "Planned end date",
} as const;

export type SortKey = keyof typeof SORTS;

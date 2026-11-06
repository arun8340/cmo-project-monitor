/**
 * States shown as "Coming soon" on the public main page. Display only — to add
 * a state for real, add it to config/states.ts and seed its data, then remove
 * it from here.
 */
export const UPCOMING_STATES = [
  { code: "GJ", name: "Gujarat", nameLocal: "गुजरात" },
  { code: "MP", name: "Madhya Pradesh", nameLocal: "मध्य प्रदेश" },
  { code: "UP", name: "Uttar Pradesh", nameLocal: "उत्तर प्रदेश" },
  { code: "KA", name: "Karnataka", nameLocal: "कर्नाटक" },
] as const;

/**
 * Department display helpers shared by the server and the maps: order, short
 * codes for tiles, and a categorical colour per department (map pins, tiles,
 * legends). Colours are always paired with the department's name in a legend
 * or tooltip, never used alone.
 */
export const DEPT_ORDER = ["PWD", "METRO", "DRAINAGE", "URBAN", "RNB", "RURAL", "MGNREGA"];

export const DEPT_SHORT: Record<string, string> = {
  PWD: "PWD",
  METRO: "MET",
  DRAINAGE: "D&S",
  URBAN: "URB",
  RNB: "R&B",
  RURAL: "RUR",
  MGNREGA: "MGN",
};

export const DEPT_COLOR: Record<string, string> = {
  PWD: "#1d4e89", // blue
  METRO: "#6b3fa0", // purple
  DRAINAGE: "#0f8a8a", // teal
  URBAN: "#d9730d", // orange
  RNB: "#8a5a2b", // brown
  RURAL: "#2f8f46", // green
  MGNREGA: "#c2417d", // pink
};

export const deptColor = (code: string) => DEPT_COLOR[code] ?? "#5b6472";
export const deptShort = (code: string) => DEPT_SHORT[code] ?? code.slice(0, 3);

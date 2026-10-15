import type { StateCode } from "../../config/states";

export type DepartmentSeed = {
  code: string;
  name: string;
  nameLocal: string;
};

const BASE: { code: string; name: string; local: Record<StateCode, string> }[] = [
  { code: "PWD", name: "PWD", local: { RJ: "सार्वजनिक निर्माण विभाग", MH: "सार्वजनिक बांधकाम विभाग" } },
  { code: "METRO", name: "Metro", local: { RJ: "मेट्रो", MH: "मेट्रो" } },
  { code: "DRAINAGE", name: "Drainage & Sewer", local: { RJ: "जल निकासी एवं सीवरेज", MH: "जलनिःसारण व मलनिःसारण" } },
  { code: "URBAN", name: "Urban", local: { RJ: "नगरीय विकास", MH: "नगर विकास" } },
  { code: "RNB", name: "Roads & Buildings", local: { RJ: "सड़क एवं भवन", MH: "रस्ते व इमारती" } },
  { code: "RURAL", name: "Rural", local: { RJ: "ग्रामीण विकास", MH: "ग्रामविकास" } },
  { code: "MGNREGA", name: "MGNREGA", local: { RJ: "मनरेगा", MH: "मनरेगा" } },
];

export function departmentsFor(state: StateCode): DepartmentSeed[] {
  return BASE.map((d) => ({ code: d.code, name: d.name, nameLocal: d.local[state] }));
}

/**
 * Checks the Hindi and Marathi catalogues against English: every key present,
 * no stray keys, the same {placeholders}, valid ICU syntax, and no `#` in
 * Marathi plurals (it would print Devanagari digits).
 *   npm run check:messages
 */
import { IntlMessageFormat } from "intl-messageformat";
import en from "../messages/en.json";
import hi from "../messages/hi.json";
import mr from "../messages/mr.json";

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(tree)) {
    if (typeof v === "string") out[prefix + k] = v;
    else Object.assign(out, flatten(v, `${prefix}${k}.`));
  }
  return out;
}

/** Argument names used in a message ("{count, plural, …}" → count). */
const args = (msg: string) => new Set([...msg.matchAll(/\{\s*(\w+)\s*[,}]/g)].map((m) => m[1]));

const base = flatten(en);
let problems = 0;
const report = (msg: string) => {
  problems++;
  console.log(`  ✘ ${msg}`);
};

for (const [locale, tree] of Object.entries({ hi, mr })) {
  console.log(`${locale}:`);
  const t = flatten(tree as Tree);
  for (const [key, english] of Object.entries(base)) {
    const text = t[key];
    if (text === undefined) {
      report(`missing ${key}`);
      continue;
    }
    const want = [...args(english)].sort().join(",");
    const got = [...args(text)].sort().join(",");
    if (want !== got) report(`${key}: placeholders {${got}} ≠ English {${want}}`);
    // Marathi's default number format uses Devanagari digits; `#` in a plural would
    // print them, while every other number in the app uses Latin digits. Use the
    // argument itself instead (e.g. "{count} प्रकल्प").
    if (locale === "mr" && text.includes("#")) report(`${key}: use the argument (e.g. {count}) instead of # so digits stay Latin`);
    try {
      new IntlMessageFormat(text, locale);
    } catch (e) {
      report(`${key}: invalid message (${(e as Error).message})`);
    }
  }
  for (const key of Object.keys(t)) if (!(key in base)) report(`unused key ${key}`);
}

if (problems) {
  console.log(`\n${problems} problem(s)`);
  process.exit(1);
}
console.log(`\n✔ hi and mr match en (${Object.keys(base).length} messages)`);

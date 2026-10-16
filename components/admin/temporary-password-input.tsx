"use client";

import { useState } from "react";
import { EyeIcon, EyeOffIcon, WandSparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// No look-alike characters (0/O, 1/l/I), so it can be read out or typed from a note.
const LETTERS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";

function generate() {
  const pick = (set: string, n: number) => Array.from(crypto.getRandomValues(new Uint32Array(n)), (x) => set[x % set.length]).join("");
  // e.g. "Kpw7-Rmx4-Tq9h": 12 characters, always letters and digits.
  return [pick(LETTERS, 3) + pick(DIGITS, 1), pick(LETTERS, 3) + pick(DIGITS, 1), pick(LETTERS, 3) + pick(DIGITS, 1)].join("-");
}

/** Password field with show/hide and a "Generate" button, for passwords the Admin sets. */
export function TemporaryPasswordInput({ id, invalid, name = "password" }: { id: string; invalid?: boolean; name?: string }) {
  const [value, setValue] = useState("");
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="new-password"
          spellCheck={false}
          className="pr-9 font-mono"
          aria-invalid={invalid || undefined}
          required
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute top-1/2 right-1.5 grid size-6 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:text-foreground"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
        </button>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setValue(generate());
          setVisible(true);
        }}
      >
        <WandSparklesIcon />
        Generate
      </Button>
    </div>
  );
}

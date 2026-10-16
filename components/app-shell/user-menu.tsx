"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRightIcon, ChevronDownIcon, KeyRoundIcon, LogOutIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/app/actions/auth";

type Props = {
  name: string;
  roleName: string;
  scopeLabel: string;
  isAdmin: boolean;
};

function initials(name: string) {
  return name
    .split(/[\s,]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function UserMenu({ name, roleName, scopeLabel, isAdmin }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 text-left outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/40">
        <span className="flex size-8 items-center justify-center rounded-full bg-white/15 text-xs font-semibold">
          {initials(name)}
        </span>
        <span className="hidden min-w-0 sm:block">
          <span className="block truncate text-sm font-medium leading-tight">{name}</span>
          <span className="block truncate text-xs leading-tight text-white/70">{roleName}</span>
        </span>
        <ChevronDownIcon className="size-4 text-white/70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <span className="block text-sm font-medium text-foreground">{name}</span>
            <span className="block font-normal">{roleName}</span>
            <span className="block font-normal">{scopeLabel}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/change-password")}>
          <KeyRoundIcon />
          Change password
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem onClick={() => router.push("/select-state")}>
            <ArrowLeftRightIcon />
            Switch state
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          variant="destructive"
          disabled={pending}
          onClick={() => startTransition(() => signOutAction())}
        >
          <LogOutIcon />
          {pending ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

/** Shows a confirmation once after a redirect, then drops the query flag from the URL. */
export function OnceToast({ message }: { message: string }) {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    toast.success(message);
    router.replace(pathname, { scroll: false });
  }, [message, pathname, router]);
  return null;
}

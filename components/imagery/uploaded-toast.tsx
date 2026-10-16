"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

/** Confirms a finished upload once, then drops `?uploaded=` from the URL. */
export function UploadedToast({ count }: { count: number }) {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (count > 0) {
      toast.success(`${count} image${count === 1 ? "" : "s"} uploaded`);
      router.replace(pathname, { scroll: false });
    }
  }, [count, pathname, router]);
  return null;
}

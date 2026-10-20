"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

/** Confirms a finished upload once, then drops `?uploaded=` from the URL. */
export function UploadedToast({ count }: { count: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("gallery");
  useEffect(() => {
    if (count > 0) {
      toast.success(t("uploadedToast", { count }));
      router.replace(pathname, { scroll: false });
    }
  }, [count, pathname, router, t]);
  return null;
}

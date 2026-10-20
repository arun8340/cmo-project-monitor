import type messages from "../messages/en.json";
import type { Locale } from "@/lib/i18n/config";

// Type-checks translation keys against the English catalogue.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}

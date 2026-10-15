import type { DefaultSession } from "next-auth";
import type { RoleKey } from "@/lib/constants";
import type { StateCode } from "@/config/states";

declare module "next-auth" {
  interface User {
    role: RoleKey;
    stateCode: StateCode | null;
  }

  interface Session {
    user: {
      id: string;
      role: RoleKey;
      stateCode: StateCode | null;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: RoleKey;
    stateCode: StateCode | null;
  }
}

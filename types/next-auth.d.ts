import type { DefaultSession } from "next-auth";
import type { RoleKey } from "@/lib/constants";
import type { StateCode } from "@/config/states";
import type { PortalId } from "@/config/portals";

declare module "next-auth" {
  interface User {
    role: RoleKey;
    stateCode: StateCode | null;
    /** The portal this session was issued on; it is only valid there. */
    portal: PortalId;
  }

  interface Session {
    user: {
      id: string;
      role: RoleKey;
      stateCode: StateCode | null;
      portal: PortalId;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: RoleKey;
    stateCode: StateCode | null;
    portal: PortalId;
  }
}

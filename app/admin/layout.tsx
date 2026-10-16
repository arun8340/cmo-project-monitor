import { AdminHeader } from "@/components/app-shell/admin-header";

/** Admin portal pages. Each page authorizes with requireAdmin(); Proxy also blocks /admin on state portals. */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      <AdminHeader />
      <div className="flex-1 bg-muted/30">{children}</div>
    </>
  );
}

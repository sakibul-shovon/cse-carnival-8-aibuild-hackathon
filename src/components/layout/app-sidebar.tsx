import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { SidebarNav } from "./sidebar-nav";

export function AppSidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex h-16 items-center border-b border-sidebar-border px-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GraduationCap className="size-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-bold tracking-tight text-sidebar-foreground">
            CampusOS
          </span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <SidebarNav />
      </div>
      <div className="border-t border-sidebar-border p-4">
        <p className="text-xs text-text-subtle">
          CampusOS — your campus, one place.
        </p>
      </div>
    </aside>
  );
}

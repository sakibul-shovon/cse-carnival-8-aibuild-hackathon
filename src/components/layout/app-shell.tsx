"use client";

import { usePathname } from "next/navigation";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";

// Auth routes render standalone (no sidebar/header chrome).
const BARE_PREFIXES = ["/login", "/signup"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isBare = BARE_PREFIXES.some((p) => pathname.startsWith(p));

  if (isBare) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

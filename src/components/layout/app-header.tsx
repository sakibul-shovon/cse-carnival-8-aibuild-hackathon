"use client";

import * as React from "react";
import Link from "next/link";
import { Bot, GraduationCap, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarNav } from "./sidebar-nav";
import { UserMenu } from "./user-menu";

export function AppHeader() {
  const [open, setOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border bg-surface px-4 lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Open navigation menu">
            <Menu className="size-5" aria-hidden="true" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b border-sidebar-border">
            <SheetTitle className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <GraduationCap className="size-4" aria-hidden="true" />
              </span>
              CampusOS
            </SheetTitle>
          </SheetHeader>
          <div className="py-4">
            <SidebarNav onNavigate={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <Link
        href="/dashboard"
        className="flex items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <GraduationCap className="size-4" aria-hidden="true" />
        </span>
        <span className="font-bold tracking-tight">CampusOS</span>
      </Link>

      <div className="ml-auto flex items-center gap-1">
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="text-ai-accent hover:text-ai-accent"
        >
          <Link href="/ai" aria-label="Open AI Agent">
            <Bot className="size-5" aria-hidden="true" />
          </Link>
        </Button>
        <UserMenu compact />
      </div>
    </header>
  );
}

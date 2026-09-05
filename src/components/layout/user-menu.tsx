"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { cn } from "cn";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type Identity = { name: string; student_id: string };

export function UserMenu({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [identity, setIdentity] = React.useState<Identity | null>(null);
  const [signingOut, setSigningOut] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!active) return;
      const m = (user?.user_metadata ?? {}) as {
        name?: string;
        student_id?: string;
      };
      setIdentity({ name: m.name ?? "", student_id: m.student_id ?? "" });
    });
    return () => {
      active = false;
    };
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  if (compact) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleSignOut}
        disabled={signingOut}
        aria-label="Sign out"
        title={identity?.name ? `Sign out (${identity.name})` : "Sign out"}
      >
        <LogOut className="size-5" aria-hidden="true" />
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground"
        aria-hidden="true"
      >
        <User className="size-4" />
      </span>
      <div className={cn("min-w-0 flex-1")}>
        <p className="truncate text-sm font-medium text-sidebar-foreground">
          {identity?.name || "Student"}
        </p>
        {identity?.student_id ? (
          <p className="truncate text-xs text-text-subtle">
            {identity.student_id}
          </p>
        ) : null}
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleSignOut}
        disabled={signingOut}
        aria-label="Sign out"
        title="Sign out"
      >
        <LogOut aria-hidden="true" />
      </Button>
    </div>
  );
}

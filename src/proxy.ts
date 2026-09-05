import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16 "proxy" convention (formerly "middleware"). Runs before routes to
// refresh the Supabase session and gate non-public paths behind auth.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

// API routes are excluded — they read the session themselves.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

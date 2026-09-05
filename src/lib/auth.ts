import { createClient } from "./supabase/server";

export interface SessionUser {
  student_id: string;
  name: string;
  email: string;
}

// Server-side reader for the signed-in user. Identity for actions (AI, booking,
// registration) is derived from here, never from client-supplied values.
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const meta = (user.user_metadata ?? {}) as {
    student_id?: string;
    name?: string;
  };
  return {
    student_id: meta.student_id ?? "",
    name: meta.name ?? "",
    email: user.email ?? "",
  };
}

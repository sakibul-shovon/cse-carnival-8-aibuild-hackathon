/**
 * Admin Supabase client for use in scripts and server-side operations
 * that run outside of a Next.js request context (e.g., seed scripts, test runners).
 *
 * Uses the service role key — NEVER expose this to the browser.
 */
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function createAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase credentials. Check your .env file.');
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey);
}

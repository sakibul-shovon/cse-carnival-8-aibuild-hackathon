import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // We use process.env here but since it's the browser client,
  // Next.js will inline NEXT_PUBLIC_ variables.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

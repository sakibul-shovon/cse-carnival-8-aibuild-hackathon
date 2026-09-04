import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!url || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const db = createClient(url, serviceKey);

  // Check if rooms table exists
  const { data, error } = await db.from('rooms').select('count').limit(0);
  if (!error) {
    console.log('✅ Tables already exist in Supabase. No migration needed.');
    return;
  }

  console.log('⚠️  Tables not found. Error:', error.message);
  console.log('\nTo apply the schema, run the SQL in supabase/migrations/0001_initial_schema.sql');
  console.log('via your Supabase Dashboard → SQL Editor.\n');
  console.log('URL:', url);
}

main().catch(console.error);

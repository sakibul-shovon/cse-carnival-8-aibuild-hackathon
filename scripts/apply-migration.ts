import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

// Read the single source-of-truth migration file (idempotent, re-runnable).
const MIGRATION_SQL = readFileSync(
  join(process.cwd(), 'supabase', 'migrations', '0001_initial_schema.sql'),
  'utf-8'
);

async function applyMigration() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!url || !serviceKey) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  // Extract project ref
  const projectRef = url.replace('https://', '').replace('.supabase.co', '');
  console.log(`\n🔑  Project: ${projectRef}`);
  console.log('⏳  Applying migration via Supabase Management API...\n');

  // Try via Management API
  try {
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ query: MIGRATION_SQL }),
      }
    );

    const body = await response.text();
    if (response.ok) {
      console.log('✅  Migration applied via Management API.');
    } else {
      console.log('⚠️  Management API failed:', response.status, body.slice(0, 200));
      console.log('\n📋  Please apply the schema manually in Supabase SQL Editor:');
      console.log('    1. Go to https://supabase.com/dashboard/project/' + projectRef + '/editor');
      console.log('    2. Run the contents of: supabase/migrations/0001_initial_schema.sql\n');
    }
  } catch (err) {
    console.log('⚠️  Fetch error:', err);
    console.log('\n📋  Please apply the schema manually in Supabase SQL Editor:');
    console.log('    1. Go to https://supabase.com/dashboard/project/' + projectRef + '/editor');
    console.log('    2. Run the contents of: supabase/migrations/0001_initial_schema.sql\n');
  }

  // Verify tables now exist
  const db = createClient(url, serviceKey);
  const { error } = await db.from('rooms').select('count').limit(0);
  if (!error) {
    console.log('✅  Verification: rooms table is accessible.');
  } else {
    console.log('❌  Verification failed:', error.message);
    console.log('\n⚡  IMPORTANT: You must run the SQL migration in your Supabase dashboard before running verify.');
  }
}

applyMigration().catch(console.error);

const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vrdurepiazvavuvmeoth:ZMhdxn6mVYDjusy1@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log('Connected to database.');

    // 0. Clean up family invites referencing this child
    console.log('Nullifying family invites used_by referencing Test Child...');
    await client.query("UPDATE public.family_invites SET used_by = NULL, used_at = NULL WHERE used_by = '7a9fa0c7-7003-48e3-abdc-732b9e3e9dcb';");

    // 1. Delete Test Child auth user (will cascade to profiles and everything else)
    console.log('Deleting Test Child...');
    await client.query("DELETE FROM auth.users WHERE id = '7a9fa0c7-7003-48e3-abdc-732b9e3e9dcb';");
    console.log('Test Child deleted successfully.');

    // 2. Wipe completions and history for all profiles
    console.log('Wiping routine completions...');
    await client.query("DELETE FROM public.routine_completions;");

    console.log('Wiping spark ledger...');
    await client.query("DELETE FROM public.spark_ledger;");

    console.log('Wiping value score events...');
    await client.query("DELETE FROM public.value_score_events;");

    console.log('Wiping child value scores...');
    await client.query("DELETE FROM public.child_value_scores;");

    console.log('Wiping emotional check-ins...');
    await client.query("DELETE FROM public.emotional_checkins;");

    console.log('Wiping companion interactions...');
    await client.query("DELETE FROM public.companion_interactions;");

    // 3. Reset companion stage & bonding score to initial state
    console.log('Resetting companions to initial state...');
    await client.query("UPDATE public.companions SET bonding_score = 5, stage = 'egg', stage_unlocked_at = jsonb_build_object('egg', NOW()::text);");

    // 4. Reset goal microtasks
    console.log('Resetting goal microtasks...');
    await client.query("UPDATE public.goal_microtasks SET status = 'pending', completed_at = NULL, completed_by = NULL;");

    // 5. Reset goals status
    console.log('Resetting goals status...');
    await client.query("UPDATE public.goals SET status = 'active';");

    // 6. Refresh materialized view
    console.log('Refreshing emotional weekly summary view...');
    await client.query("REFRESH MATERIALIZED VIEW public.emotional_weekly_summary;");

    console.log('--- DATABASE WIPE COMPLETED SUCCESSFULLY ---');
  } catch (err) {
    console.error('Error during database wipe:', err);
  } finally {
    await client.end();
  }
}
run();

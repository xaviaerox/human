const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vrdurepiazvavuvmeoth:ZMhdxn6mVYDjusy1@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to PG!');

    // Query Mikel profile
    console.log('Querying profile for Mikel...');
    const resProfile = await client.query("SELECT * FROM public.profiles WHERE display_name = 'Mikel';");
    console.log(JSON.stringify(resProfile.rows, null, 2));

    if (resProfile.rows.length > 0) {
      const childId = resProfile.rows[0].id;
      // Query auth user
      console.log(`Querying auth.users for childId ${childId}...`);
      const resUser = await client.query(`SELECT id, email, raw_app_meta_data, raw_user_meta_data, created_at FROM auth.users WHERE id = '${childId}';`);
      console.log(JSON.stringify(resUser.rows, null, 2));
    } else {
      console.log('Mikel profile not found.');
    }

  } catch (err) {
    console.error('Error running check:', err);
  } finally {
    await client.end();
  }
}

run();

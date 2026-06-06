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

    console.log('Updating password for mikeltorres@gmail.com to "12345678"...');
    // We use crypt from pgcrypto to hash '12345678' using bcrypt ('bf')
    const res = await client.query(`
      UPDATE auth.users 
      SET encrypted_password = crypt('12345678', gen_salt('bf')) 
      WHERE email = 'mikeltorres@gmail.com'
      RETURNING id, email;
    `);

    console.log('Update result:', JSON.stringify(res.rows, null, 2));
    if (res.rows.length > 0) {
      console.log('Password reset successfully!');
    } else {
      console.log('User mikeltorres@gmail.com not found.');
    }

  } catch (err) {
    console.error('Error resetting password:', err);
  } finally {
    await client.end();
  }
}

run();

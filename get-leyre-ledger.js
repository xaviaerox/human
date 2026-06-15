const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vrdurepiazvavuvmeoth:H80dPeuAXSoe7i9H@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    const res = await client.query("SELECT * FROM spark_ledger WHERE child_id = '2cbd61c9-af7e-4e62-9a7b-183b99fd6af6' ORDER BY created_at ASC");
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();

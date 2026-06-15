const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function getConnectionString() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  try {
    const envPath = path.join(__dirname, '.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/^DATABASE_URL=(.*)$/m);
      if (match) {
        return match[1].trim();
      }
    }
  } catch (err) {
    // ignore
  }
  return null;
}

const connectionString = getConnectionString();
if (!connectionString) {
  console.error('Error: DATABASE_URL variable not set in process.env or .env.local');
  process.exit(1);
}


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

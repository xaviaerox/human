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
    console.log('Connected to DB');
    
    const completionsRes = await client.query(`
      SELECT rc.id, rc.child_id, rc.routine_id, p.display_name, r.title, r.spark_value
      FROM routine_completions rc
      JOIN profiles p ON rc.child_id = p.id
      JOIN routines r ON rc.routine_id = r.id
    `);
    
    console.log('Found ' + completionsRes.rows.length + ' completions. Testing deletes...');
    
    for (const row of completionsRes.rows) {
      console.log('Testing delete of completion ' + row.id + ' (' + row.display_name + ' - ' + row.title + ', worth ' + row.spark_value + ' sparks)...');
      try {
        await client.query('BEGIN');
        await client.query("DELETE FROM routine_completions WHERE id = $1", [row.id]);
        console.log('  => SUCCESS');
        await client.query('ROLLBACK');
      } catch (err) {
        console.log('  => FAILED: ' + err.message);
        await client.query('ROLLBACK');
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();

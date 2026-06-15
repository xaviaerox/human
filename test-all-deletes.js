const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vrdurepiazvavuvmeoth:H80dPeuAXSoe7i9H@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

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

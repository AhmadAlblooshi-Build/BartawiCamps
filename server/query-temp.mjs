import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'bartawi_cms',
  user: 'postgres',
  password: 'postgres'
});

async function runQueries() {
  try {
    // Query 1: Count rooms in Camp 1
    const q1 = await pool.query(`
      SELECT COUNT(*) FROM rooms r
      JOIN camps c ON r.camp_id = c.id
      WHERE c.name ILIKE '%camp 1%' OR c.name ILIKE '%camp-1%'
    `);
    console.log('=== QUERY 1: Rooms in Camp 1 ===');
    console.log('Count:', q1.rows[0].count);
    console.log('');

    // Query 2: Room numbers
    const q2 = await pool.query(`
      SELECT room_number FROM rooms
      ORDER BY room_number LIMIT 20
    `);
    console.log('=== QUERY 2: Room numbers (first 20) ===');
    q2.rows.forEach(r => console.log(r.room_number));
    console.log('');

    // Query 3: Rooms with occupancy
    const q3 = await pool.query(`
      SELECT COUNT(*) FROM room_occupancy
    `);
    console.log('=== QUERY 3: Rooms with occupancy records ===');
    console.log('Count:', q3.rows[0].count);

    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    await pool.end();
    process.exit(1);
  }
}

runQueries();

// server/src/db.js
// -----------------------------------------------------------
// PostgreSQL connection pool used by the running app.
//
// Schema initialization is now handled by migrate.js (using
// Postgrator), NOT by this file. The old initSchema() function
// has been removed because it ran schema.sql with DROP TABLE
// statements on every deploy, wiping all data. Migrations
// give us additive, durable schema changes instead.
//
// Works with Railway/Render (uses DATABASE_URL) and local dev
// (falls back to PG* environment variables).
// -----------------------------------------------------------
 
import pg from 'pg';
import dotenv from 'dotenv';
 
dotenv.config();
 
const { Pool } = pg;
 
// Railway/Render provides DATABASE_URL. Fall back to individual
// vars for local dev. SSL is required on Railway/Render in prod.
const useSSL =
  process.env.DATABASE_SSL === 'true' || process.env.NODE_ENV === 'production';
 
export const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: useSSL ? { rejectUnauthorized: false } : false,
      }
    : {
        host: process.env.PGHOST || 'localhost',
        port: Number(process.env.PGPORT || 5432),
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || 'postgres',
        database: process.env.PGDATABASE || 'omgparea',
      }
);
 
export const query = (text, params) => pool.query(text, params);
 
// Small helper for transactions — used by seed.js and the
// scenario submission endpoint to ensure all-or-nothing writes.
export async function withTx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
 

// server/src/db.js
// -----------------------------------------------------------
// PostgreSQL connection pool + schema init.
// Works with Railway/Render (uses DATABASE_URL) and local dev.
// -----------------------------------------------------------

import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

// Railway/Render provides DATABASE_URL. Fall back to individual
// vars for local dev. SSL is required on Railway/Render in prod.
const useSSL = process.env.DATABASE_SSL === 'true' || process.env.NODE_ENV === 'production';

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

// Small helper for transactions
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

// Schema initialization — runs schema.sql
export async function initSchema() {
  const sqlPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await pool.query(sql);
  console.log('✓ Schema initialized');
}

// Allow running directly: `node src/db.js --init`
if (process.argv.includes('--init')) {
  initSchema()
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Schema init failed:', err);
      process.exit(1);
    });
}

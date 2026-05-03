// server/src/migrate.js
// -----------------------------------------------------------
// Hand-rolled migration runner. Simple, predictable, no
// external migration library. Runs as a pre-deploy step.
//
// What it does, in order:
//   1. Connect to the database (using DATABASE_URL or PG* vars).
//   2. Create the schemaversion tracking table if missing.
//      Safe to run repeatedly — uses CREATE TABLE IF NOT EXISTS.
//   3. Read which migration versions have already been applied.
//   4. Find every migration file in server/migrations/, sort
//      them by filename, and run any not yet applied.
//   5. Record each applied migration in schemaversion.
//   6. If the database has zero organizations rows (truly fresh
//      database), run the initial seed.
//
// Migration files use the naming convention:
//   NNN.do.short-name.sql      e.g. 001.do.initial-schema.sql
// The leading number is the version. We never re-run migrations
// that schemaversion shows as already applied.
//
// Existing data is NEVER touched unless a migration explicitly
// modifies it. This is the whole point of the system.
// -----------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const useSSL =
  process.env.DATABASE_SSL === 'true' || process.env.NODE_ENV === 'production';

const client = new pg.Client(
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

// Parse the leading version number off a filename like "001.do.initial-schema.sql"
function parseVersion(filename) {
  const m = /^(\d+)\./.exec(filename);
  if (!m) return null;
  return parseInt(m[1], 10);
}

async function ensureSchemaversionTable() {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schemaversion (
      version BIGINT PRIMARY KEY,
      name    TEXT NOT NULL,
      run_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedVersions() {
  const res = await client.query(
    `SELECT version FROM schemaversion ORDER BY version ASC`
  );
  return new Set(res.rows.map((r) => Number(r.version)));
}

async function listMigrationFiles() {
  const dir = path.resolve(__dirname, '../migrations');
  if (!fs.existsSync(dir)) {
    throw new Error(`Migrations folder not found at ${dir}`);
  }
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql') && !f.includes('.undo.'))
    .sort();
  return files.map((f) => ({
    filename: f,
    version:  parseVersion(f),
    fullPath: path.join(dir, f),
  })).filter((m) => m.version !== null);
}

async function runMigration(m) {
  const sql = fs.readFileSync(m.fullPath, 'utf8');
  console.log(`\u25B6 Running migration ${m.version}: ${m.filename}`);

  // Wrap each migration in a transaction so it's all-or-nothing
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query(
      `INSERT INTO schemaversion (version, name) VALUES ($1, $2)
       ON CONFLICT (version) DO NOTHING`,
      [m.version, m.filename]
    );
    await client.query('COMMIT');
    console.log(`\u2713 Applied migration ${m.version}: ${m.filename}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw new Error(`Migration ${m.version} (${m.filename}) failed: ${err.message}`);
  }
}

async function main() {
  await client.connect();

  await ensureSchemaversionTable();

  const applied = await getAppliedVersions();
  const all     = await listMigrationFiles();
  const pending = all.filter((m) => !applied.has(m.version));

  if (pending.length === 0) {
    console.log(`\u2713 Database is up to date \u2014 ${all.length} migration(s) on file, all applied.`);
  } else {
    console.log(`\u25B6 Applying ${pending.length} pending migration(s)\u2026`);
    for (const m of pending) {
      await runMigration(m);
    }
    console.log(`\u2713 Successfully applied ${pending.length} migration(s).`);
  }

  // Decide whether to seed: only if the database is brand new
  // (organizations table is empty). The seed inserts demo data.
  const orgRes = await client.query(
    `SELECT COUNT(*)::int AS n FROM organizations`
  );
  const orgCount = orgRes.rows[0].n;

  if (orgCount === 0) {
    console.log('\u2713 Database is empty \u2014 running initial seed\u2026');
    await client.end();
    const { spawnSync } = await import('node:child_process');
    const seedPath = path.resolve(__dirname, 'seed.js');
    const result = spawnSync('node', [seedPath], { stdio: 'inherit' });
    if (result.status !== 0) {
      console.error('\u2717 Seed script failed.');
      process.exit(result.status ?? 1);
    }
  } else {
    console.log(`\u2713 Database already has ${orgCount} organization(s) \u2014 skipping seed.`);
    await client.end();
  }
}

main().catch(async (err) => {
  console.error('\u2717 Migration runner failed:', err.message || err);
  try {
    await client.end();
  } catch {
    // Connection may already be closed
  }
  process.exit(1);
});

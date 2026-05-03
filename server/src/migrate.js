// server/src/migrate.js
// -----------------------------------------------------------
// Migration runner. Replaces the old "drop everything and
// recreate every deploy" approach with a proper migration
// system that only runs new SQL files since the last run.
//
// Uses Postgrator. On startup it:
//   1. Reads all server/migrations/*.sql files
//   2. Compares them against the schemaversion table
//      (auto-created on first run)
//   3. Runs any migrations the database has not yet seen
//   4. Updates schemaversion so they will not run again
//
// Existing data in the database is NEVER touched unless a
// new migration explicitly modifies it.
//
// Run by: railway.json preDeployCommand on every deploy.
// Manually: `npm run migrate` from inside the server folder.
// -----------------------------------------------------------
 
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import Postgrator from 'postgrator';
import dotenv from 'dotenv';
 
dotenv.config();
 
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
 
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
 
async function main() {
  await client.connect();
 
  // server/migrations lives one folder up from server/src
  const migrationPattern = path.resolve(__dirname, '../migrations/*');
 
  const postgrator = new Postgrator({
    migrationPattern,
    driver: 'pg',
    database: process.env.PGDATABASE || 'omgparea',
    schemaTable: 'schemaversion',
    execQuery: (q) => client.query(q),
  });
 
  postgrator.on('migration-started', (m) =>
    console.log(`▶ Running migration ${m.version}: ${m.name}`)
  );
  postgrator.on('migration-finished', (m) =>
    console.log(`✓ Applied migration ${m.version}: ${m.name}`)
  );
 
  // Migrate to the most recent migration found in the folder
  const applied = await postgrator.migrate();
 
  if (applied.length === 0) {
    console.log('✓ Database is already up to date — no new migrations to run.');
  } else {
    console.log(`✓ Successfully applied ${applied.length} migration(s).`);
  }
 
  // Decide whether to seed: only if the database is brand new
  // (i.e. organizations table is empty). Postgrator just created
  // every table when migration 001 ran on a fresh database.
  const orgRes = await client.query('SELECT COUNT(*)::int AS n FROM organizations');
  const orgCount = orgRes.rows[0].n;
 
  if (orgCount === 0) {
    console.log('✓ Database is empty — running initial seed…');
    await client.end();
    // Run seed.js as a child process so it uses its own connection pool
    const { spawnSync } = await import('node:child_process');
    const seedPath = path.resolve(__dirname, 'seed.js');
    const result = spawnSync('node', [seedPath], { stdio: 'inherit' });
    if (result.status !== 0) {
      console.error('✗ Seed script failed.');
      process.exit(result.status ?? 1);
    }
  } else {
    console.log(`✓ Database already has ${orgCount} organization(s) — skipping seed.`);
    await client.end();
  }
}
 
main().catch(async (err) => {
  console.error('✗ Migration failed:', err);
  try {
    await client.end();
  } catch {
    // Ignore — connection may already be closed
  }
  process.exit(1);
});
 

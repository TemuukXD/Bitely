import { ensureDatabaseReady, db } from './db.js';

async function run() {
  try {
    console.log('Initializing Bitely PostGIS database & Ulaanbaatar seed data...');
    await ensureDatabaseReady();
    console.log('Database initialization complete!');
  } catch (err) {
    console.error('Database initialization failed:', err);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

run();

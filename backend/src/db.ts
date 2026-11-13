import { Pool } from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const db = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://devuser:devpassword@localhost:5432/food_discovery',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

/**
 * Ensures the PostGIS schema, backward-compatible columns, and Ulaanbaatar seed data
 * are present even if the user had an older Docker volume from an earlier run.
 */
export async function ensureDatabaseReady(): Promise<void> {
  const client = await db.connect();
  try {
    const schemaPath = path.resolve(__dirname, '../../database/01_schema.sql');
    const seedPath = path.resolve(__dirname, '../../database/02_seed_ulaanbaatar.sql');

    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await client.query(schemaSql);
    }

    // Backward-compatibility migrations if tables were created from an older schema version
    await client.query(`
      ALTER TABLE venues ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
      ALTER TABLE venues ADD COLUMN IF NOT EXISTS signature_dishes TEXT[] NOT NULL DEFAULT '{}';
      ALTER TABLE venues ADD COLUMN IF NOT EXISTS avg_spend_mnt INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE venues ADD COLUMN IF NOT EXISTS phone VARCHAR(64);
      ALTER TABLE reviews ADD COLUMN IF NOT EXISTS spend_per_person_mnt INTEGER DEFAULT 0;
      ALTER TABLE reviews ADD COLUMN IF NOT EXISTS photo_urls TEXT[] NOT NULL DEFAULT '{}';
      ALTER TABLE reviews ADD COLUMN IF NOT EXISTS exif_distance_meters NUMERIC(8,2);
      ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_urls TEXT[] NOT NULL DEFAULT '{}';
    `);

    const { rows } = await client.query('SELECT COUNT(*)::int AS cnt FROM venues');
    if ((rows[0]?.cnt ?? 0) < 12 && fs.existsSync(seedPath)) {
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      await client.query(seedSql);
      console.log('✅ Seeded Ulaanbaatar venues, operating hours, verified reviews, and social notes.');
    }
  } finally {
    client.release();
  }
}

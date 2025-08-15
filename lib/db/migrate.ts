import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

config({
  path: '.env.local',
});

const runMigrate = async () => {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL is not defined');
  }

  const connection = postgres(process.env.POSTGRES_URL, { max: 1 });
  const db = drizzle(connection);

  const _start = Date.now();
  await migrate(db, { migrationsFolder: './lib/db/migrations' });
  const _end = Date.now();
  process.exit(0);
};

runMigrate().catch((_err) => {
  process.exit(1);
});

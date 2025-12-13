import { defineConfig } from 'drizzle-kit';

// Default to local development database
// For cloud, set DATABASE_URL environment variable
const connectionString =
  process.env.DATABASE_URL ??
  'postgres://postgres:postgres@db.localtest.me:5432/history_portal';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './drizzle',
  casing: 'snake_case',
  dbCredentials: {
    url: connectionString,
  },
});

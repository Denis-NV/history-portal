import { defineConfig } from 'drizzle-kit';

import { connectionString } from './src/config';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './drizzle',
  casing: 'snake_case',
  dbCredentials: {
    url: connectionString,
  },
});

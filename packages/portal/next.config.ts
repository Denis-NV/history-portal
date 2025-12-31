import type { NextConfig } from "next";
import { config } from "dotenv";
import { join } from "path";

// Load DATABASE_URL from db package
// Priority: .env.test (ephemeral test branch) > .env.local (local development)
// This allows both local dev and E2E tests to work correctly
config({ path: join(__dirname, "../db/.env.test") });
config({ path: join(__dirname, "../db/.env.local") });

const nextConfig: NextConfig = {
  // Required for Docker/Cloud Run deployment
  output: "standalone",

  // Required for monorepo - trace dependencies from workspace root
  // This ensures imports from other packages (db, utils) are included in the standalone build
  outputFileTracingRoot: join(__dirname, "../../"),
};

export default nextConfig;

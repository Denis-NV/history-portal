import type { NextConfig } from "next";
import { config } from "dotenv";
import { join } from "path";

// Load DATABASE_URL from db package for local development
config({ path: join(__dirname, "../db/.env.local") });

const nextConfig: NextConfig = {
  // Required for Docker/Cloud Run deployment
  output: "standalone",

  // Required for monorepo - trace dependencies from workspace root
  // This ensures imports from other packages (db, utils) are included in the standalone build
  outputFileTracingRoot: join(__dirname, "../../"),
};

export default nextConfig;

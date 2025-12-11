import type { NextConfig } from "next";
import { join } from "path";

const nextConfig: NextConfig = {
  // Required for Docker/Cloud Run deployment
  output: "standalone",

  // Required for monorepo - trace dependencies from workspace root
  // This ensures imports from other packages (db, utils) are included in the standalone build
  outputFileTracingRoot: join(__dirname, "../../"),
};

export default nextConfig;

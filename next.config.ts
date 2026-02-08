import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Docker/Cloud Run deployment
  output: "standalone",
  // postgres.js uses Node.js TCP/TLS — must not be bundled by Next.js
  serverExternalPackages: ["postgres"],
};

export default nextConfig;

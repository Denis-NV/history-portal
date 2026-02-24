import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Docker/Cloud Run deployment
  output: "standalone",
  // These packages use Node.js-specific APIs (TCP, TLS, async_hooks)
  // and must not be bundled by webpack
  serverExternalPackages: [
    "postgres",
    "@opentelemetry/sdk-node",
    "@opentelemetry/api",
    "@opentelemetry/exporter-trace-otlp-proto",
    "@opentelemetry/exporter-metrics-otlp-proto",
    "@opentelemetry/resource-detector-gcp",
    "google-auth-library",
    "pino",
  ],
};

export default nextConfig;

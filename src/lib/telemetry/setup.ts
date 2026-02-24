import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { gcpDetector } from "@opentelemetry/resource-detector-gcp";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { FetchInstrumentation } from "@opentelemetry/instrumentation-fetch";
import { GoogleAuth } from "google-auth-library";

// ─────────────────────────────────────────────────────────────────────────────
// OpenTelemetry SDK Setup
// ─────────────────────────────────────────────────────────────────────────────
// Called once from instrumentation.ts when the Next.js server starts.
// Configures traces, metrics, and auto-instrumentation for HTTP/fetch.
//
// In production (Cloud Run): exports to GCP via OTLP (telemetry.googleapis.com)
// In development: disabled by default, enable with OTEL_ENABLED=true
// ─────────────────────────────────────────────────────────────────────────────

export function setupTelemetry() {
  const isProduction = process.env.NODE_ENV === "production";

  // In dev, only enable if explicitly requested
  if (!isProduction && process.env.OTEL_ENABLED !== "true") {
    return;
  }

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]:
      process.env.OTEL_SERVICE_NAME ?? "history-portal",
    [ATTR_SERVICE_VERSION]: process.env.npm_package_version ?? "0.0.0",
  });

  // GCP OTLP endpoint — Cloud Run authenticates via service account metadata.
  // google-auth-library fetches an access token automatically and
  // the OTel exporter sends it as a Bearer token in the Authorization header.
  // For local dev, defaults to localhost:4318 (local OTel collector).
  const traceExporter = isProduction
    ? createGcpExporter(OTLPTraceExporter, "/v1/traces")
    : new OTLPTraceExporter();

  const metricExporter = isProduction
    ? createGcpExporter(OTLPMetricExporter, "/v1/metrics")
    : new OTLPMetricExporter();

  const sdk = new NodeSDK({
    resource,
    resourceDetectors: [gcpDetector],
    traceExporter,
    metricReader: new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 60_000, // Batch metrics every 60s
    }),
    instrumentations: [
      new HttpInstrumentation(),
      new FetchInstrumentation(),
    ],
  });

  sdk.start();

  // Cloud Run sends SIGTERM before shutting down containers.
  // Flush pending spans/metrics so nothing is lost.
  process.on("SIGTERM", () => {
    sdk.shutdown().catch(console.error);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GCP OTLP Exporter Factory
// ─────────────────────────────────────────────────────────────────────────────
// Creates an OTLP exporter that authenticates to telemetry.googleapis.com
// using the Cloud Run service account's access token.
// ─────────────────────────────────────────────────────────────────────────────

function createGcpExporter<
  T extends new (config: { url: string; headers: Record<string, string> }) => InstanceType<T>,
>(
  ExporterClass: T,
  path: string,
): InstanceType<T> {
  const endpoint = "https://telemetry.googleapis.com";

  // google-auth-library handles token refresh automatically on Cloud Run.
  // We fetch a token at startup — the library caches and refreshes it.
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });

  // The OTLP exporter doesn't support async headers natively, so we
  // set up a token that refreshes in the background. The first export
  // may use a slightly stale token, but GoogleAuth handles refresh.
  let cachedToken = "";
  const refreshToken = async () => {
    try {
      const client = await auth.getClient();
      const tokenResponse = await client.getAccessToken();
      cachedToken = tokenResponse.token ?? "";
    } catch {
      // Token refresh failures are non-fatal — next refresh will retry
    }
  };

  // Initial token fetch (non-blocking)
  refreshToken();
  // Refresh every 45 minutes (tokens last 60 minutes)
  setInterval(refreshToken, 45 * 60 * 1000).unref();

  // Use a Proxy for headers so the exporter always reads the latest token
  return new ExporterClass({
    url: `${endpoint}${path}`,
    headers: new Proxy({} as Record<string, string>, {
      get(_, prop) {
        if (prop === "Authorization") return `Bearer ${cachedToken}`;
        return undefined;
      },
      ownKeys() {
        return ["Authorization"];
      },
      getOwnPropertyDescriptor(_, prop) {
        if (prop === "Authorization") {
          return {
            value: `Bearer ${cachedToken}`,
            enumerable: true,
            configurable: true,
          };
        }
        return undefined;
      },
    }),
  });
}

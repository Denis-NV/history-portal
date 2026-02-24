// ─────────────────────────────────────────────────────────────────────────────
// Next.js Instrumentation Hook
// ─────────────────────────────────────────────────────────────────────────────
// Next.js automatically loads this file once when the server starts,
// before any route handler runs. This ensures OpenTelemetry is initialized
// before the first request arrives.
//
// See: https://nextjs.org/docs/app/guides/instrumentation
// ─────────────────────────────────────────────────────────────────────────────

export async function register() {
  // Only initialize on the Node.js server runtime (not Edge or client)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { setupTelemetry } = await import("./lib/telemetry/setup");
    setupTelemetry();
  }
}

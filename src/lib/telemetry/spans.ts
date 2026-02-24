import { trace, SpanStatusCode, type Span } from "@opentelemetry/api";

// ─────────────────────────────────────────────────────────────────────────────
// Custom Span Helper
// ─────────────────────────────────────────────────────────────────────────────
// Wraps an async operation in a named OTel span with automatic error handling.
// Use this to add custom spans around important operations (e.g., DB, auth).
//
// @example
// ```ts
// const result = await withSpan("db.withRLS", { userId }, async (span) => {
//   return db.transaction(/* ... */);
// });
// ```
// ─────────────────────────────────────────────────────────────────────────────

const tracer = trace.getTracer("history-portal");

export async function withSpan<T>(
  name: string,
  attributes: Record<string, string | number | boolean>,
  fn: (span: Span) => Promise<T>,
): Promise<T> {
  return tracer.startActiveSpan(name, { attributes }, async (span) => {
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : "Unknown error",
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

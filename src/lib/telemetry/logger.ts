import pino from "pino";
import { trace, context } from "@opentelemetry/api";

// ─────────────────────────────────────────────────────────────────────────────
// Structured Logger with GCP Trace Correlation
// ─────────────────────────────────────────────────────────────────────────────
// Outputs JSON to stdout, which Cloud Run captures → Cloud Logging.
//
// Key GCP integration:
// - Maps pino levels → GCP severity (error → ERROR, info → INFO)
// - Injects logging.googleapis.com/trace and spanId from the active OTel span
// - This links logs to traces in Cloud Trace (click trace → see related logs)
// ─────────────────────────────────────────────────────────────────────────────

const gcpProject = process.env.GCP_PROJECT_ID;

const severityMap: Record<string, string> = {
  trace: "DEBUG",
  debug: "DEBUG",
  info: "INFO",
  warn: "WARNING",
  error: "ERROR",
  fatal: "CRITICAL",
};

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  messageKey: "message",
  formatters: {
    // Map pino numeric levels to GCP severity strings
    level(label) {
      return { severity: severityMap[label] ?? "DEFAULT" };
    },
    // Inject OTel trace context into every log line
    log(object) {
      const span = trace.getSpan(context.active());
      if (span && gcpProject) {
        const spanContext = span.spanContext();
        return {
          ...object,
          "logging.googleapis.com/trace": `projects/${gcpProject}/traces/${spanContext.traceId}`,
          "logging.googleapis.com/spanId": spanContext.spanId,
          "logging.googleapis.com/trace_sampled": !!(
            spanContext.traceFlags & 1
          ),
        };
      }
      return object;
    },
  },
});

/**
 * Create a child logger scoped to a component.
 *
 * @example
 * ```ts
 * const log = getLogger("api.cards");
 * log.error({ err: error }, "Failed to fetch cards");
 * ```
 */
export const getLogger = (component: string) => logger.child({ component });

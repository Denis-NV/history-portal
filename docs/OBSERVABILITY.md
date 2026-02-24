# Observability

History Portal uses [OpenTelemetry](https://opentelemetry.io/) (OTel) for distributed tracing and metrics, and [pino](https://github.com/pinojs/pino) for structured logging. All telemetry is exported to **GCP Cloud Observability** via the native [OTLP endpoint](https://cloud.google.com/stackdriver/docs/reference/telemetry/overview).

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Next.js Server (Cloud Run)                                  │
│                                                              │
│  instrumentation.ts → setupTelemetry()                       │
│       │                                                      │
│       ├─ HTTP auto-instrumentation (incoming/outgoing)       │
│       ├─ Fetch auto-instrumentation                          │
│       ├─ Custom spans (withRLS, withAdminAccess)             │
│       └─ Pino logger (JSON with trace IDs)                   │
│                                                              │
│  Exporters:                                                  │
│       ├─ OTLPTraceExporter  ──→ telemetry.googleapis.com     │
│       └─ OTLPMetricExporter ──→ telemetry.googleapis.com     │
│                                                              │
│  stdout (JSON logs) ──→ Cloud Run ──→ Cloud Logging          │
└──────────────────────────────────────────────────────────────┘

GCP Cloud Observability:
  ├─ Cloud Trace    — distributed traces (request waterfalls)
  ├─ Cloud Logging  — structured logs (correlated with traces)
  └─ Cloud Monitoring — metrics and dashboards
```

## How Traces Work

When a request hits an API route, OTel creates a **trace** (a tree of **spans**):

```
Trace: abc-123
│
├─ HTTP GET /api/cards              ← auto-instrumented
│  └─ db.withRLS { userId: "..." }  ← custom span from rls.ts
│
├─ HTTP GET /api/health/db          ← auto-instrumented
│  └─ (db.execute)
```

Each span records:
- **Name** — what operation was performed
- **Duration** — how long it took
- **Attributes** — metadata (userId, db.rls, etc.)
- **Status** — OK or ERROR (with exception details)

## How Log-Trace Correlation Works

Pino logs include GCP-specific fields that link them to traces:

```json
{
  "severity": "ERROR",
  "message": "Failed to fetch cards",
  "component": "api.cards",
  "err": { "message": "connection refused", "stack": "..." },
  "logging.googleapis.com/trace": "projects/my-project/traces/abc-123",
  "logging.googleapis.com/spanId": "def-456",
  "logging.googleapis.com/trace_sampled": true
}
```

In GCP Console:
1. Open **Cloud Trace** → find a trace
2. Click **"View logs"** → jumps to Cloud Logging with only logs from that request
3. Or: open **Cloud Logging** → filter by trace ID → see the full trace

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OTEL_SERVICE_NAME` | `history-portal` | Service name in traces |
| `GCP_PROJECT_ID` | — | GCP project for trace correlation in logs |
| `LOG_LEVEL` | `info` | Pino log level (`debug`, `info`, `warn`, `error`) |
| `OTEL_ENABLED` | — | Set to `true` to enable OTel in development |
| `NODE_ENV` | — | When `production`, OTel exports to GCP automatically |

### Behavior by Environment

| Environment | OTel | Logging | Export Target |
|-------------|------|---------|---------------|
| **Production** (Cloud Run) | Enabled | JSON to stdout → Cloud Logging | `telemetry.googleapis.com` |
| **Development** | Disabled by default | JSON to stdout (terminal) | `localhost:4318` (if enabled) |
| **Tests** | Disabled | Not initialized | — |

To enable OTel in local development:
```bash
# In .env.local
OTEL_ENABLED=true
```

This exports to `localhost:4318`. You can run a local [OTel Collector](https://opentelemetry.io/docs/collector/) to visualize traces locally, or simply check the terminal for structured log output.

## Adding Custom Spans

Use `withSpan` from `@/lib/telemetry` to wrap important operations:

```typescript
import { withSpan } from "@/lib/telemetry";

const result = await withSpan(
  "myService.doWork",           // Span name (shown in Cloud Trace)
  { "key": "value" },           // Attributes (filterable metadata)
  async (span) => {
    // Your async operation here
    // Errors are automatically captured and the span is marked ERROR
    return someResult;
  },
);
```

## Adding Structured Logs

Use `getLogger` from `@/lib/telemetry` to create component-scoped loggers:

```typescript
import { getLogger } from "@/lib/telemetry";

const log = getLogger("api.cards");

log.info({ userId }, "Fetching cards");
log.error({ err: error }, "Failed to fetch cards");
log.warn({ count: cards.length }, "Large result set");
```

When called inside an active OTel span, the trace ID is automatically injected.

## GCP Console Navigation

### Cloud Trace
1. Go to [Cloud Trace](https://console.cloud.google.com/traces) in GCP Console
2. Filter by service name, latency, or status
3. Click a trace to see the span waterfall
4. Click a span to see attributes, events, and linked logs

### Cloud Logging
1. Go to [Cloud Logging](https://console.cloud.google.com/logs) in GCP Console
2. Filter by `severity`, `component`, or trace ID
3. Example query: `jsonPayload.component="api.cards" AND severity="ERROR"`

### Cloud Monitoring
1. Go to [Cloud Monitoring](https://console.cloud.google.com/monitoring) in GCP Console
2. Use Metrics Explorer to query OTel metrics
3. Create dashboards for request latency, error rates, etc.

## Authentication (Cloud Run → GCP)

The OTel exporters authenticate to `telemetry.googleapis.com` using the Cloud Run service account's access token, managed by `google-auth-library`. The service account needs:
- `roles/cloudtrace.agent` — write traces
- `roles/monitoring.metricWriter` — write metrics

These IAM roles are provisioned in `infra/index.ts`.

## Cost

For a personal project, you'll stay well within the free tier:
- **Cloud Trace**: 2.5M spans/month free
- **Cloud Logging**: 50 GB/month free
- **Cloud Monitoring**: 150 MB metrics ingestion/month free, all GCP metrics free

See [GCP pricing](https://cloud.google.com/stackdriver/pricing) for details.

## Key Files

| File | Purpose |
|------|---------|
| `src/instrumentation.ts` | Next.js entry point — calls `setupTelemetry()` on server start |
| `src/lib/telemetry/setup.ts` | OTel SDK configuration, exporters, auto-instrumentation |
| `src/lib/telemetry/spans.ts` | `withSpan()` helper for custom spans |
| `src/lib/telemetry/logger.ts` | Pino logger with GCP severity mapping + trace correlation |
| `src/lib/telemetry/index.ts` | Barrel re-exports |
| `src/db/rls.ts` | Custom spans on `withRLS()` and `withAdminAccess()` |
| `infra/index.ts` | Cloud Run env vars + IAM roles for telemetry export |

import {
  diag,
  DiagConsoleLogger,
  DiagLogLevel,
  trace
} from "@opentelemetry/api";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { NodeSDK } from "@opentelemetry/sdk-node";

let started = false;

export async function maybeStartOtel(serviceName: string) {
  if (started) return;
  if (String(process.env.OTEL_ENABLED || "false") !== "true") return;
  started = true;

  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR);

  const endpoint =
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318";

  const sdk = new NodeSDK({
    serviceName,
    traceExporter: new OTLPTraceExporter({
      url: `${endpoint.replace(/\/$/, "")}/v1/traces`
    }),
    instrumentations: [getNodeAutoInstrumentations()]
  });

  await sdk.start();

  trace.getTracer(serviceName);
}

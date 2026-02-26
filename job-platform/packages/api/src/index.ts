import "dotenv/config";
import { maybeStartOtel } from "./otel.js";
import Fastify from "fastify";
import { z } from "zod";
import { prisma } from "./prisma.js";
import { queue } from "./queue.js";
import { publishOutboxOnce } from "./outbox.js";
import { presignGetObject } from "./s3.js";
import type { Prisma } from "@prisma/client";
import rateLimit from "@fastify/rate-limit";
import { JOB_TYPES, makeDlqQueue } from "@jp/shared";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import client from "prom-client";

await maybeStartOtel(process.env.OTEL_SERVICE_NAME || "jp-api");

const app = Fastify({
  genReqId: (req) => {
    const h = req.headers["x-request-id"];
    const v = Array.isArray(h) ? h[0] : h;
    return (v && v.length ? v : randomUUID()).slice(0, 128);
  },
  logger: {
    level: process.env.LOG_LEVEL || "info",
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.x-api-key",
        "req.headers.idempotency-key"
      ],
      remove: true
    }
  }
});

await app.register(rateLimit, {
  max: Number(process.env.RATE_LIMIT_MAX || 120),
  timeWindow: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000)
});

app.addHook("onRequest", async (req, reply) => {
  reply.header("x-request-id", req.id);
});

const tracer = trace.getTracer("jp-api");

async function withSpan<T>(name: string, fn: () => Promise<T>): Promise<T> {
  return tracer.startActiveSpan(name, async (span) => {
    try {
      const out = await fn();
      span.setStatus({ code: SpanStatusCode.OK });
      return out;
    } catch (err: any) {
      span.recordException(err);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: String(err?.message || err)
      });
      throw err;
    } finally {
      span.end();
    }
  });
}

const dlq = makeDlqQueue();

const metricsEnabled =
  process.env.METRICS_ENABLED === "true" || process.env.METRICS_ENABLED === "1";

const metricsRegister = new client.Registry();
if (metricsEnabled) {
  client.collectDefaultMetrics({ register: metricsRegister });
}

function getAuthHeader(req: any): string | undefined {
  const h = req.headers?.authorization;
  const v = Array.isArray(h) ? h[0] : h;
  return typeof v === "string" && v.length ? v : undefined;
}

function getApiKeyHeader(req: any): string | undefined {
  const h = req.headers?.["x-api-key"];
  const v = Array.isArray(h) ? h[0] : h;
  return typeof v === "string" && v.length ? v : undefined;
}

function safeEq(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function requireApiKey(req: any, reply: any): void {
  const expected = process.env.API_KEY;
  if (!expected) return;

  const apiKey = getApiKeyHeader(req);
  const auth = getAuthHeader(req);
  const bearer = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length) : undefined;
  const provided = bearer || apiKey;

  if (!provided || !safeEq(provided, expected)) {
    void reply.code(401).send({ error: "unauthorized" });
  }
}

app.get("/health", async () => ({ ok: true }));

app.get("/ready", async (_req, reply) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    return reply.code(503).send({ ok: false, dependency: "db" });
  }

  try {
    await queue.waitUntilReady();
    await queue.getJobCounts();
  } catch (err) {
    return reply.code(503).send({ ok: false, dependency: "redis" });
  }

  return reply.code(200).send({ ok: true });
});

app.get("/metrics", async (_req, reply) => {
  if (!metricsEnabled) return reply.code(404).send({ error: "not_found" });
  const body = await metricsRegister.metrics();
  reply.header("content-type", metricsRegister.contentType);
  return reply.code(200).send(body);
});

const createJobSchema = z.object({
  type: z.enum(JOB_TYPES),
  payload: z.unknown().optional()
});

const listJobsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  cursor: z.string().uuid().optional(),
  status: z.enum(["queued", "processing", "succeeded", "failed", "cancelled"]).optional(),
  type: z.enum(JOB_TYPES).optional()
});

const reportGeneratePayloadSchema = z
  .object({
    rows: z.coerce.number().int().min(1).max(50_000).optional().default(50),
    value: z.string().max(2_000).optional().default("demo")
  })
  .strict();

app.post("/jobs", async (req, reply) => {
  requireApiKey(req, reply);
  if (reply.sent) return;

  const idempotencyKeyHeader = req.headers["idempotency-key"]; // string | string[] | undefined
  const idempotencyKey = Array.isArray(idempotencyKeyHeader)
    ? idempotencyKeyHeader[0]
    : idempotencyKeyHeader;

  const body = createJobSchema.parse(req.body ?? {});

  const payload =
    body.type === "report.generate"
      ? reportGeneratePayloadSchema.parse(body.payload ?? {})
      : (body.payload ?? {});

  if (idempotencyKey) {
    const existing = await prisma.job.findUnique({ where: { idempotencyKey } });
    if (existing) return reply.code(200).send(existing);
  }

  const job = await withSpan("job.create", async () => {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const created = await tx.job.create({
        data: {
          type: body.type,
          payload: payload as any,
          idempotencyKey: idempotencyKey || null
        }
      });

      await tx.outboxEvent.create({
        data: {
          type: "JOB_ENQUEUE",
          payload: { jobId: created.id, jobType: created.type }
        }
      });

      return created;
    });
  });

  // best-effort: publish without blocking request too much
  void publishOutboxOnce(10);

  return reply.code(201).send(job);
});

app.post("/jobs/:id/cancel", async (req, reply) => {
  requireApiKey(req, reply);
  if (reply.sent) return;

  const params = z.object({ id: z.string().uuid() }).parse(req.params);
  const job = await prisma.job.findUnique({ where: { id: params.id } });
  if (!job) return reply.code(404).send({ error: "not_found" });

  if (job.status === "succeeded") {
    return reply.code(409).send({ error: "cannot_cancel_succeeded" });
  }

  const now = new Date();
  const updated = await prisma.job.update({
    where: { id: params.id },
    data:
      job.status === "queued"
        ? { cancelRequested: true, status: "cancelled", cancelledAt: now }
        : { cancelRequested: true }
  });

  // best-effort: remove from queue if it was queued
  try {
    await queue.remove(params.id);
  } catch (err) {
    // ignore
  }

  return reply.code(200).send(updated);
});

app.post("/jobs/:id/retry", async (req, reply) => {
  requireApiKey(req, reply);
  if (reply.sent) return;

  const params = z.object({ id: z.string().uuid() }).parse(req.params);
  const existing = await prisma.job.findUnique({ where: { id: params.id } });
  if (!existing) return reply.code(404).send({ error: "not_found" });

  if (existing.status !== "failed" && existing.status !== "cancelled") {
    return reply.code(409).send({ error: "can_only_retry_failed_or_cancelled" });
  }

  const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const job = await tx.job.update({
      where: { id: params.id },
      data: {
        status: "queued",
        attempts: 0,
        lastError: null,
        cancelRequested: false,
        cancelledAt: null
      }
    });

    await tx.outboxEvent.create({
      data: {
        type: "JOB_ENQUEUE",
        payload: { jobId: job.id, jobType: job.type }
      }
    });

    return job;
  });

  void publishOutboxOnce(10);
  return reply.code(200).send(updated);
});

app.get("/queue", async (req, reply) => {
  requireApiKey(req, reply);
  if (reply.sent) return;

  await queue.waitUntilReady();
  await dlq.waitUntilReady();

  const [q, d] = await Promise.all([queue.getJobCounts(), dlq.getJobCounts()]);
  return reply.code(200).send({
    queue: { name: queue.name, counts: q },
    dlq: { name: dlq.name, counts: d }
  });
});

app.get("/dlq/jobs", async (req, reply) => {
  requireApiKey(req, reply);
  if (reply.sent) return;

  const q = z
    .object({
      start: z.coerce.number().int().min(0).optional().default(0),
      end: z.coerce.number().int().min(0).max(200).optional().default(25)
    })
    .parse(req.query ?? {});

  await dlq.waitUntilReady();
  const jobs = await dlq.getJobs(["waiting", "active", "delayed", "failed", "completed"], q.start, q.end);
  return reply.code(200).send({
    items: jobs.map((j) => ({
      id: j.id,
      name: j.name,
      data: j.data,
      timestamp: j.timestamp,
      processedOn: j.processedOn,
      finishedOn: j.finishedOn,
      attemptsMade: j.attemptsMade,
      failedReason: (j as any).failedReason
    }))
  });
});

app.get("/jobs", async (req, reply) => {
  requireApiKey(req, reply);
  if (reply.sent) return;

  const q = listJobsQuerySchema.parse(req.query ?? {});
  const where: any = {};
  if (q.status) where.status = q.status;
  if (q.type) where.type = q.type;

  const jobs = await prisma.job.findMany({
    where,
    take: q.limit,
    skip: q.cursor ? 1 : 0,
    cursor: q.cursor ? { id: q.cursor } : undefined,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }]
  });

  const nextCursor = jobs.length === q.limit ? jobs[jobs.length - 1]!.id : null;
  return reply.code(200).send({ items: jobs, nextCursor });
});

app.get("/jobs/:id", async (req, reply) => {
  requireApiKey(req, reply);
  if (reply.sent) return;

  const params = z.object({ id: z.string().uuid() }).parse(req.params);
  const job = await prisma.job.findUnique({ where: { id: params.id } });
  if (!job) return reply.code(404).send({ error: "not_found" });
  return reply.code(200).send(job);
});

app.get("/jobs/:id/artifact", async (req, reply) => {
  requireApiKey(req, reply);
  if (reply.sent) return;

  const params = z.object({ id: z.string().uuid() }).parse(req.params);
  const job = await prisma.job.findUnique({ where: { id: params.id } });
  if (!job) return reply.code(404).send({ error: "not_found" });
  if (!job.artifactKey) return reply.code(404).send({ error: "no_artifact" });

  if (job.artifactBucket) {
    const url = await presignGetObject({
      bucket: job.artifactBucket,
      key: job.artifactKey,
      expiresInSeconds: 600
    });
    return reply.code(200).send({
      type: "s3",
      bucket: job.artifactBucket,
      key: job.artifactKey,
      url
    });
  }

  return reply.code(200).send({
    type: "local",
    path: job.artifactKey
  });
});

const port = Number(process.env.API_PORT || 4010);
const host = "0.0.0.0";

const pollMs = Number(process.env.OUTBOX_POLL_MS || 1000);
setInterval(() => {
  void publishOutboxOnce();
}, pollMs).unref();

await app.listen({ port, host });

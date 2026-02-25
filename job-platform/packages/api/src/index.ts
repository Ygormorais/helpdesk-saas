import "dotenv/config";
import { maybeStartOtel } from "./otel.js";
import Fastify from "fastify";
import { z } from "zod";
import { prisma } from "./prisma.js";
import { queue } from "./queue.js";
import { publishOutboxOnce } from "./outbox.js";
import { presignGetObject } from "./s3.js";
import type { Prisma } from "@prisma/client";

await maybeStartOtel(process.env.OTEL_SERVICE_NAME || "jp-api");

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info"
  }
});

app.get("/health", async () => ({ ok: true }));

const createJobSchema = z.object({
  type: z.string().min(1),
  payload: z.any().optional().default({})
});

app.post("/jobs", async (req, reply) => {
  const idempotencyKeyHeader = req.headers["idempotency-key"]; // string | string[] | undefined
  const idempotencyKey = Array.isArray(idempotencyKeyHeader)
    ? idempotencyKeyHeader[0]
    : idempotencyKeyHeader;

  const body = createJobSchema.parse(req.body ?? {});

  if (idempotencyKey) {
    const existing = await prisma.job.findUnique({ where: { idempotencyKey } });
    if (existing) return reply.code(200).send(existing);
  }

  const job = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.job.create({
      data: {
        type: body.type,
        payload: body.payload as any,
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

  // best-effort: publish without blocking request too much
  void publishOutboxOnce(10);

  return reply.code(201).send(job);
});

app.get("/jobs/:id", async (req, reply) => {
  const params = z.object({ id: z.string().uuid() }).parse(req.params);
  const job = await prisma.job.findUnique({ where: { id: params.id } });
  if (!job) return reply.code(404).send({ error: "not_found" });
  return reply.code(200).send(job);
});

app.get("/jobs/:id/artifact", async (req, reply) => {
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

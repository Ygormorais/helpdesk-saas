import "dotenv/config";
import { maybeStartOtel } from "./otel.js";
import { Worker } from "bullmq";
import pino from "pino";
import { getQueueConfig, JOB_TYPES, makeDlqQueue } from "@jp/shared";
import { prisma } from "./prisma.js";
import { putTextObject } from "./s3.js";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

await maybeStartOtel(process.env.OTEL_SERVICE_NAME || "jp-worker");

const log = pino({ level: process.env.LOG_LEVEL || "info" });
const cfg = getQueueConfig();
const dlq = makeDlqQueue();

const reportGeneratePayloadSchema = z
  .object({
    rows: z.coerce.number().int().min(1).max(50_000).optional().default(50),
    value: z.string().max(2_000).optional().default("demo")
  })
  .strict();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function csvEscape(v: string): string {
  if (v.includes("\"") || v.includes(",") || v.includes("\n")) {
    return `"${v.replaceAll("\"", '""')}"`;
  }
  return v;
}

async function handleReportGenerate(jobId: string, payload: any) {
  const now = new Date();
  const rows = Number(payload?.rows ?? 50);

  const header = ["id", "createdAt", "value"].join(",");
  const lines = [header];
  for (let i = 0; i < rows; i++) {
    lines.push(
      [
        String(i + 1),
        now.toISOString(),
        csvEscape(String(payload?.value ?? "demo"))
      ].join(",")
    );
  }

  const csv = lines.join("\n") + "\n";
  const key = `reports/${jobId}.csv`;
  const bucket = process.env.S3_BUCKET || "";

  if (bucket) {
    await putTextObject({
      bucket,
      key,
      body: csv,
      contentType: "text/csv"
    });

    return {
      artifactBucket: bucket,
      artifactKey: key,
      result: { rows }
    };
  }

  const dir = path.resolve(process.cwd(), "tmp");
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${jobId}.csv`);
  await writeFile(filePath, csv, "utf8");

  return {
    artifactBucket: null,
    artifactKey: filePath,
    result: { rows }
  };
}

const worker = new Worker(
  cfg.name,
  async (job) => {
    const jobId = z
      .string()
      .uuid()
      .parse((job.data as any)?.jobId ?? "", { path: ["jobId"] });

    if (!(JOB_TYPES as readonly string[]).includes(job.name)) {
      throw new Error(`unknown job type: ${job.name}`);
    }

    const persisted = await prisma.job.findUnique({ where: { id: jobId } });
    if (!persisted) throw new Error("job not found");

    if (persisted.status === "succeeded") {
      log.info({ jobId, name: job.name }, "already succeeded; skipping");
      return;
    }

    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "processing",
        attempts: { increment: 1 },
        lastError: null
      }
    });

    log.info({ jobId, name: job.name, attempt: job.attemptsMade + 1 }, "processing");

    let result: any = null;
    let artifactBucket: string | null = null;
    let artifactKey: string | null = null;

    if (job.name === "report.generate") {
      const payload = reportGeneratePayloadSchema.parse(persisted.payload ?? {});
      const out = await handleReportGenerate(jobId, payload);
      result = out.result;
      artifactBucket = out.artifactBucket;
      artifactKey = out.artifactKey;
    } else {
      // fallback: simulate some work
      await sleep(300);
      result = { ok: true };
    }

    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "succeeded",
        result,
        artifactBucket,
        artifactKey
      }
    });

    log.info({ jobId }, "succeeded");
  },
  {
    connection: { url: cfg.connection.url },
    concurrency: Number(process.env.WORKER_CONCURRENCY || 5)
  }
);

worker.on("failed", async (job, err) => {
  const isFinalAttempt =
    typeof job?.opts?.attempts === "number"
      ? (job?.attemptsMade ?? 0) + 1 >= job.opts.attempts
      : true;

  try {
    const jobId = (job?.data as any)?.jobId as string | undefined;
    if (!jobId) return;
    await prisma.job.update({
      where: { id: jobId },
      data: { status: "failed", lastError: String(err?.message || err) }
    });

    if (isFinalAttempt) {
      await dlq.add(
        "dlq",
        {
          jobId,
          name: job?.name,
          attemptsMade: job?.attemptsMade,
          error: String(err?.message || err)
        },
        {
          jobId: `dlq:${jobId}`,
          removeOnComplete: 10_000,
          removeOnFail: 10_000
        }
      );
    }
  } catch (e) {
    log.error({ err: e }, "failed to persist failure");
  }

  log.warn(
    {
      bullmqJobId: job?.id,
      name: job?.name,
      attemptsMade: job?.attemptsMade,
      isFinalAttempt,
      err: err?.message
    },
    "job failed"
  );
});

log.info({ queue: cfg.name }, "worker started");

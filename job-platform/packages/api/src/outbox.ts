import { queue } from "./queue.js";
import { prisma } from "./prisma.js";

function backoffMs(attempts: number): number {
  // 1s, 2s, 4s, 8s, ... capped at 60s
  const ms = 1000 * Math.pow(2, Math.max(0, attempts));
  return Math.min(ms, 60_000);
}

export async function publishOutboxOnce(limit = 25) {
  const now = new Date();
  const events = await prisma.outboxEvent.findMany({
    where: {
      status: "pending",
      nextRunAt: { lte: now }
    },
    orderBy: { createdAt: "asc" },
    take: limit
  });

  for (const ev of events) {
    // claim
    const claimed = await prisma.outboxEvent.updateMany({
      where: { id: ev.id, status: "pending" },
      data: { status: "processing" }
    });
    if (claimed.count !== 1) continue;

    try {
      if (ev.type === "JOB_ENQUEUE") {
        const p = ev.payload as any;
        const jobId = String(p.jobId);
        const jobType = String(p.jobType);

        await queue.add(
          jobType,
          { jobId },
          {
            jobId,
            attempts: 5,
            backoff: { type: "exponential", delay: 1000 },
            removeOnComplete: 1000,
            removeOnFail: 5000
          }
        );
      } else {
        throw new Error(`unknown outbox event type: ${ev.type}`);
      }

      await prisma.outboxEvent.update({
        where: { id: ev.id },
        data: { status: "published", lastError: null }
      });
    } catch (err) {
      const attempts = ev.attempts + 1;
      const nextRunAt = new Date(Date.now() + backoffMs(attempts));
      await prisma.outboxEvent.update({
        where: { id: ev.id },
        data: {
          status: attempts >= 10 ? "failed" : "pending",
          attempts,
          lastError: String((err as any)?.message || err),
          nextRunAt
        }
      });
    }
  }
}

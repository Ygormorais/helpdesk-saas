import { AuditLog, PlanLimit } from '../models/index.js';
import { planService } from './planService.js';
import { logger } from './logger.js';

export async function runAuditRetentionCleanupOnce(): Promise<void> {
  const tenants = await PlanLimit.find({}).select('tenant').limit(5000);
  for (const row of tenants) {
    const tenantId = String((row as any).tenant);
    try {
      const days = await planService.getAuditRetentionDays(tenantId);
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const out = await AuditLog.deleteMany({ tenant: tenantId, createdAt: { $lt: cutoff } });
      if ((out as any)?.deletedCount) {
        logger.info({ msg: 'audit.retention_cleanup', tenantId, deleted: (out as any).deletedCount, days });
      }
    } catch (err: any) {
      logger.warn({ msg: 'audit.retention_cleanup_failed', tenantId, error: String(err?.message || err) });
    }
  }
}

export function startAuditRetentionCleanupScheduler() {
  // Run once on boot (best-effort), then every 24h.
  runAuditRetentionCleanupOnce().catch(() => undefined);
  setInterval(() => {
    runAuditRetentionCleanupOnce().catch(() => undefined);
  }, 24 * 60 * 60 * 1000);
}

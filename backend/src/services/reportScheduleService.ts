import { ReportSchedule } from '../models/index.js';
import { sendEmail } from './emailService.js';
import { logger } from './logger.js';

export class ReportScheduleService {
  computeNextRunAt(params: { frequency: 'daily' | 'weekly'; hour: number; dayOfWeek?: number }) {
    const now = new Date();
    const next = new Date(now);
    next.setMinutes(0, 0, 0);
    next.setHours(params.hour);

    if (params.frequency === 'daily') {
      if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
      return next;
    }

    const targetDow = params.dayOfWeek ?? 1;
    const currentDow = next.getDay();
    let add = (targetDow - currentDow + 7) % 7;
    if (add === 0 && next.getTime() <= now.getTime()) add = 7;
    next.setDate(next.getDate() + add);
    return next;
  }

  async runDueOnce(): Promise<void> {
    const now = new Date();
    const due = await ReportSchedule.find({ isActive: true, nextRunAt: { $lte: now } })
      .sort({ nextRunAt: 1 })
      .limit(25)
      .select('tenant name frequency hour dayOfWeek recipients params nextRunAt');

    for (const s of due) {
      try {
        const params = (s as any).params || {};
        const qs = new URLSearchParams();
        if (params.startDate) qs.set('startDate', String(params.startDate));
        if (params.endDate) qs.set('endDate', String(params.endDate));
        if (params.days) qs.set('days', String(params.days));
        const link = `${process.env.FRONTEND_URL || ''}/reports${qs.toString() ? `?${qs}` : ''}`;

        const subject = `Relatorio: ${s.name}`;
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="margin: 0 0 12px 0;">${s.name}</h2>
            <p>Seu relatorio agendado esta pronto. Abra no painel:</p>
            <p><a href="${link}" style="display:inline-block;background:#3B82F6;color:#fff;padding:10px 14px;border-radius:6px;text-decoration:none;">Abrir Relatorios</a></p>
            <p style="color:#6b7280;font-size:12px">Enviado automaticamente pelo HelpDesk</p>
          </div>
        `;

        await Promise.all((s.recipients || []).map((to) => sendEmail({ to, subject, html })));

        const nextRunAt = this.computeNextRunAt({
          frequency: s.frequency as any,
          hour: s.hour,
          dayOfWeek: (s as any).dayOfWeek,
        });

        await ReportSchedule.updateOne(
          { _id: s._id },
          { $set: { lastRunAt: now, lastError: undefined, nextRunAt } }
        );
      } catch (err: any) {
        logger.warn({ msg: 'report_schedule.run_failed', scheduleId: String(s._id), error: String(err?.message || err) });
        const nextRunAt = new Date(Date.now() + 60 * 60 * 1000);
        await ReportSchedule.updateOne(
          { _id: s._id },
          { $set: { lastError: String(err?.message || err), nextRunAt } }
        ).catch(() => undefined);
      }
    }
  }

  startScheduler() {
    // every 5 minutes
    setInterval(() => {
      this.runDueOnce().catch(() => undefined);
    }, 5 * 60 * 1000);
  }
}

export const reportScheduleService = new ReportScheduleService();

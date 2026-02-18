import { PlanLimit, Tenant, User } from '../models/index.js';
import { emailTemplates, sendEmail } from './emailService.js';

const REMINDER_DAYS = [7, 3, 1];

async function getTenantAdminEmails(tenantId: string): Promise<string[]> {
  const admins = await User.find({ tenant: tenantId, role: 'admin', isActive: true }).select('email');
  return admins.map((a: any) => String(a.email)).filter(Boolean);
}

export async function sendTrialRemindersOnce(): Promise<void> {
  const now = Date.now();

  const trials = await PlanLimit.find({
    'subscription.status': 'trialing',
    'subscription.trialEndsAt': { $exists: true, $ne: null },
  }).select('tenant subscription.trialEndsAt subscription.trialReminderLastDaysLeft');

  for (const p of trials) {
    const trialEndsAt = (p.subscription as any)?.trialEndsAt as Date | undefined;
    if (!trialEndsAt) continue;

    const msLeft = trialEndsAt.getTime() - now;
    if (msLeft <= 0) continue;

    const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
    if (!REMINDER_DAYS.includes(daysLeft)) continue;

    if ((p.subscription as any)?.trialReminderLastDaysLeft === daysLeft) continue;

    const tenant = await Tenant.findById(p.tenant).select('name');
    const to = await getTenantAdminEmails(String(p.tenant));
    if (!tenant || to.length === 0) continue;

    const url = `${process.env.FRONTEND_URL || ''}/plans`;
    const tpl = emailTemplates.trialExpiring({
      tenantName: tenant.name,
      daysLeft,
      trialEndsAt,
      url,
    });

    const results = await Promise.all(to.map((email) => sendEmail({ to: email, ...tpl })));
    const sentAny = results.some(Boolean);
    if (sentAny) {
      await PlanLimit.updateOne(
        { _id: p._id },
        {
          $set: {
            'subscription.trialReminderLastSentAt': new Date(),
            'subscription.trialReminderLastDaysLeft': daysLeft,
          },
        }
      ).catch(() => undefined);
    }
  }
}

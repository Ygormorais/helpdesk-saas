export type OneTimeAddOnPaymentStatus = 'pending' | 'overdue' | 'received' | 'canceled';

export type RecurringAddOnStatus = 'active' | 'trialing' | 'past_due' | 'canceled';

export interface PendingOneTimeAddOn {
  addOnId: string;
  paymentId: string;
  status: OneTimeAddOnPaymentStatus;
  invoiceUrl?: string;
  value?: number;
  createdAt: Date;
  updatedAt?: Date;
}

export interface RecurringAddOn {
  addOnId: string;
  subscriptionId: string;
  status: RecurringAddOnStatus;
  extraAgents: number;
  extraStorage: number;
  aiCredits: number;
  currentPeriodEnd?: Date;
}

export interface PlanAddOns {
  extraAgents?: number;
  extraStorage?: number;
  aiCredits?: number;
  pendingOneTime?: PendingOneTimeAddOn[];
  recurring?: RecurringAddOn[];
}

export function ensureAddOns(addons: any): PlanAddOns {
  const out: PlanAddOns = addons && typeof addons === 'object' ? addons : {};
  if (!Array.isArray(out.pendingOneTime)) out.pendingOneTime = [];
  if (!Array.isArray(out.recurring)) out.recurring = [];
  out.extraAgents = Number(out.extraAgents || 0) || 0;
  out.extraStorage = Number(out.extraStorage || 0) || 0;
  out.aiCredits = Number(out.aiCredits || 0) || 0;
  return out;
}

export function upsertPendingOneTime(
  addons: any,
  args: {
    addOnId: string;
    paymentId: string;
    invoiceUrl?: string;
    value?: number;
    createdAt?: Date;
  }
): PlanAddOns {
  const a = ensureAddOns(addons);
  const now = new Date();
  const createdAt = args.createdAt || now;

  const idx = (a.pendingOneTime || []).findIndex((p) => String(p.paymentId) === String(args.paymentId));
  const base: PendingOneTimeAddOn = {
    addOnId: args.addOnId,
    paymentId: args.paymentId,
    status: 'pending',
    invoiceUrl: args.invoiceUrl,
    value: args.value,
    createdAt,
    updatedAt: now,
  };

  if (idx >= 0) {
    const prev = (a.pendingOneTime || [])[idx] as any;
    (a.pendingOneTime as any)[idx] = {
      ...prev,
      ...base,
      status: prev?.status || 'pending',
    };
    return a;
  }

  (a.pendingOneTime as any).push(base);
  return a;
}

export function setPendingOneTimeStatus(addons: any, paymentId: string, status: OneTimeAddOnPaymentStatus): PlanAddOns {
  const a = ensureAddOns(addons);
  const idx = (a.pendingOneTime || []).findIndex((p) => String(p.paymentId) === String(paymentId));
  if (idx < 0) return a;
  const prev = (a.pendingOneTime || [])[idx] as any;
  (a.pendingOneTime as any)[idx] = {
    ...prev,
    status,
    updatedAt: new Date(),
  };
  return a;
}

export function upsertRecurringAddOn(
  addons: any,
  args: {
    addOnId: string;
    subscriptionId: string;
    status: RecurringAddOnStatus;
    extraAgents: number;
    extraStorage: number;
    aiCredits: number;
    currentPeriodEnd?: Date;
  }
): PlanAddOns {
  const a = ensureAddOns(addons);
  const idx = (a.recurring || []).findIndex((r) => String(r.subscriptionId) === String(args.subscriptionId));

  const next: RecurringAddOn = {
    addOnId: args.addOnId,
    subscriptionId: args.subscriptionId,
    status: args.status,
    extraAgents: Number(args.extraAgents || 0) || 0,
    extraStorage: Number(args.extraStorage || 0) || 0,
    aiCredits: Number(args.aiCredits || 0) || 0,
    currentPeriodEnd: args.currentPeriodEnd,
  };

  if (idx >= 0) {
    const prev = (a.recurring || [])[idx] as any;
    (a.recurring as any)[idx] = {
      ...prev,
      ...next,
    };
    return a;
  }

  (a.recurring as any).push(next);
  return a;
}

export function mapAsaasSubscriptionStatus(raw: any): RecurringAddOnStatus | undefined {
  const s = String(raw || '').trim().toUpperCase();
  if (!s) return undefined;
  if (s === 'ACTIVE') return 'active';
  if (s === 'TRIALING') return 'trialing';
  if (s === 'OVERDUE' || s === 'PAST_DUE') return 'past_due';
  if (s === 'INACTIVE' || s === 'CANCELED' || s === 'CANCELLED') return 'canceled';
  return undefined;
}

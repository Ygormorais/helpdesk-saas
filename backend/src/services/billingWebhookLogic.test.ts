import { describe, it, expect } from 'vitest';
import {
  ensureAddOns,
  mapAsaasSubscriptionStatus,
  setPendingOneTimeStatus,
  upsertPendingOneTime,
  upsertRecurringAddOn,
} from './billingWebhookLogic.js';

describe('billingWebhookLogic', () => {
  it('upserts pending one-time add-on payments and updates status', () => {
    const addons: any = {};

    const a1 = upsertPendingOneTime(addons, {
      addOnId: 'extra_agents_1',
      paymentId: 'pay_123',
      invoiceUrl: 'https://example.com/pay',
      value: 29.9,
    });

    expect(a1.pendingOneTime?.length).toBe(1);
    expect(a1.pendingOneTime?.[0]).toMatchObject({
      addOnId: 'extra_agents_1',
      paymentId: 'pay_123',
      status: 'pending',
      invoiceUrl: 'https://example.com/pay',
      value: 29.9,
    });

    const a2 = setPendingOneTimeStatus(a1, 'pay_123', 'received');
    expect(a2.pendingOneTime?.[0].status).toBe('received');
  });

  it('upserts recurring add-on entries by subscriptionId', () => {
    const addons: any = {};

    const a1 = upsertRecurringAddOn(addons, {
      addOnId: 'extra_storage_500',
      subscriptionId: 'sub_1',
      status: 'trialing',
      extraAgents: 0,
      extraStorage: 500,
      aiCredits: 0,
    });

    expect(a1.recurring?.length).toBe(1);
    expect(a1.recurring?.[0]).toMatchObject({
      addOnId: 'extra_storage_500',
      subscriptionId: 'sub_1',
      status: 'trialing',
      extraStorage: 500,
    });

    const a2 = upsertRecurringAddOn(a1, {
      addOnId: 'extra_storage_500',
      subscriptionId: 'sub_1',
      status: 'active',
      extraAgents: 0,
      extraStorage: 500,
      aiCredits: 0,
      currentPeriodEnd: new Date('2030-01-01T00:00:00.000Z'),
    });

    expect(a2.recurring?.length).toBe(1);
    expect(a2.recurring?.[0].status).toBe('active');
    expect(a2.recurring?.[0].currentPeriodEnd?.toISOString()).toBe('2030-01-01T00:00:00.000Z');
  });

  it('maps Asaas subscription statuses to internal statuses', () => {
    expect(mapAsaasSubscriptionStatus('ACTIVE')).toBe('active');
    expect(mapAsaasSubscriptionStatus('OVERDUE')).toBe('past_due');
    expect(mapAsaasSubscriptionStatus('CANCELLED')).toBe('canceled');
    expect(mapAsaasSubscriptionStatus('')).toBe(undefined);
  });

  it('ensureAddOns normalizes fields', () => {
    const out = ensureAddOns({ extraAgents: '2', pendingOneTime: null, recurring: null } as any);
    expect(out.extraAgents).toBe(2);
    expect(Array.isArray(out.pendingOneTime)).toBe(true);
    expect(Array.isArray(out.recurring)).toBe(true);
  });
});

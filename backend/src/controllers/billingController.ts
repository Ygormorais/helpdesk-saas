import { Response } from 'express';
import { asaasService } from '../services/asaasService.js';
import { planService } from '../services/planService.js';
import { PlanLimit, PlanType, WebhookEvent } from '../models/index.js';
import { Tenant, User } from '../models/index.js';
import { AuthRequest } from '../middlewares/auth.js';
import { AppError } from '../middlewares/errorHandler.js';
import { config } from '../config/index.js';
import { timingSafeEqual } from 'crypto';
import { emailTemplates, sendEmail } from '../services/emailService.js';
import { z } from 'zod';
import { isValidObjectId } from 'mongoose';

import {
  applyOneTimeAddOnPaymentReceived,
  ensureAddOns,
  mapAsaasSubscriptionStatus,
  setPendingOneTimeStatus,
  upsertPendingOneTime,
  upsertRecurringAddOn,
} from '../services/billingWebhookLogic.js';

import type { AsaasSubscription } from '../services/asaasService.js';

const PLAN_PRICES: Record<PlanType, number> = {
  free: 0,
  pro: 29.90,
  enterprise: 99.90,
};

const ADDON_CATALOG = {
  extra_agents_5: {
    id: 'extra_agents_5',
    name: 'Agentes +5',
    priceOneTime: 19.9,
    priceMonthly: 9.9,
    extraAgents: 5,
    extraStorage: 0,
    aiCredits: 0,
  },
  extra_storage_5000: {
    id: 'extra_storage_5000',
    name: 'Armazenamento +5GB',
    priceOneTime: 9.9,
    priceMonthly: 4.9,
    extraAgents: 0,
    extraStorage: 5000,
    aiCredits: 0,
  },
  ai_pack_1000: {
    id: 'ai_pack_1000',
    name: 'Pacote IA 1000',
    priceOneTime: 15.9,
    priceMonthly: 7.9,
    extraAgents: 0,
    extraStorage: 0,
    aiCredits: 1000,
  },
} as const;

type AddOnId = keyof typeof ADDON_CATALOG;

function parsePlanFromExternalReference(extRef: any): PlanType | undefined {
  const ext = String(extRef || '');
  const plan = ext.split('-')[1];
  if (!plan) return undefined;
  return Object.values(PlanType).includes(plan as PlanType) ? (plan as PlanType) : undefined;
}

function parseAddOnFromExternalReference(extRef: any): { tenantId: string; kind?: 'addon' | 'addonsub'; addOnId?: AddOnId } {
  const raw = String(extRef || '');
  const [tenantId, kindRaw, addOnId] = raw.split('-');
  const kind = (kindRaw === 'addon' || kindRaw === 'addonsub') ? kindRaw : undefined;
  if (!tenantId || !kind) return { tenantId };
  if (!addOnId) return { tenantId, kind };
  if (!(addOnId in ADDON_CATALOG)) return { tenantId, kind };
  return { tenantId, kind, addOnId: addOnId as AddOnId };
}

export const createCheckout = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { plan, billingType } = req.body;
    const user = req.user!;
    
    if (!Object.values(PlanType).includes(plan)) {
      throw new AppError('Plano inválido', 400);
    }

    if (plan === PlanType.FREE) {
      throw new AppError('Não é possível fazer checkout do plano Free', 400);
    }

    // Buscar ou criar plano do tenant
    let planLimit = await PlanLimit.findOne({ tenant: user.tenant._id });
    if (!planLimit) {
      await planService.initializeTenantPlan(user.tenant._id.toString());
      planLimit = await PlanLimit.findOne({ tenant: user.tenant._id });
    }

    if (!planLimit) {
      throw new AppError('Plano do tenant nao encontrado', 500);
    }

    // Criar ou buscar cliente no Asaas
    const customerData = {
      name: user.name,
      email: user.email,
      externalReference: user.tenant._id.toString(),
    };

    const asaasCustomer = await asaasService.getOrCreateCustomer(customerData);

    // Criar assinatura no Asaas
    const subscriptionData: AsaasSubscription = {
      customer: asaasCustomer.id,
      billingType: (billingType || 'CREDIT_CARD') as AsaasSubscription['billingType'], // BOLETO, CREDIT_CARD, PIX
      value: PLAN_PRICES[plan as PlanType],
      nextDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      cycle: 'MONTHLY',
      description: `DeskFlow - Plano ${plan.charAt(0).toUpperCase() + plan.slice(1)}`,
      externalReference: `${user.tenant._id}-${plan}`,
    };

    const subscription = await asaasService.createSubscription(subscriptionData);

    // Salvar IDs do Asaas no plano
    planLimit.subscription.stripeCustomerId = asaasCustomer.id;
    planLimit.subscription.stripeSubscriptionId = subscription.id;
    planLimit.subscription.status = 'trialing'; // Aguardando primeiro pagamento
    await planLimit.save();

    // Retornar URL de pagamento
    let paymentUrl = '';
    if (billingType === 'BOLETO') {
      // Para boleto, precisamos criar uma cobrança avulsa inicial
      const payment = await asaasService.createPayment({
        customer: asaasCustomer.id,
        billingType: 'BOLETO',
        value: PLAN_PRICES[plan as PlanType],
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        description: `DeskFlow - Primeiro pagamento ${plan}`,
        externalReference: `${user.tenant._id}-${plan}`,
      });
      paymentUrl = payment.invoiceUrl;
    } else if (billingType === 'PIX') {
      const payment = await asaasService.createPayment({
        customer: asaasCustomer.id,
        billingType: 'PIX',
        value: PLAN_PRICES[plan as PlanType],
        dueDate: new Date().toISOString().split('T')[0],
        description: `DeskFlow - Pagamento ${plan}`,
        externalReference: `${user.tenant._id}-${plan}`,
      });
      const pixData = await asaasService.getPixQrCode(payment.id);
      paymentUrl = payment.invoiceUrl;
    } else {
      // Cartão de crédito - redireciona para página de cartão
      paymentUrl = `https://${process.env.NODE_ENV === 'production' ? '' : 'sandbox.'}asaas.com/i/${subscription.id}`;
    }

    res.json({
      success: true,
      checkoutUrl: paymentUrl,
      subscriptionId: subscription.id,
      customerId: asaasCustomer.id,
    });

  } catch (error: any) {
    console.error('Checkout error:', error);
    if (error instanceof AppError) throw error;
    throw new AppError(error.message || 'Erro ao criar checkout', 500);
  }
};

export const listAddOns = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const planLimit = await PlanLimit.findOne({ tenant: user.tenant._id }).select('addons subscription');

  const addons = ensureAddOns((planLimit as any)?.addons);
  const recurring = Array.isArray(addons?.recurring) ? addons.recurring : [];
  const pendingOneTime = Array.isArray(addons?.pendingOneTime) ? addons.pendingOneTime : [];

  res.json({
    addons: Object.values(ADDON_CATALOG),
    current: {
      extraAgents: Number(addons.extraAgents || 0) || 0,
      extraStorage: Number(addons.extraStorage || 0) || 0,
      aiCredits: Number(addons.aiCredits || 0) || 0,
    },
    pendingOneTime: pendingOneTime
      .slice()
      .sort((a: any, b: any) => new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime())
      .slice(0, 20)
      .map((p: any) => ({
        addOnId: p.addOnId,
        paymentId: p.paymentId,
        status: p.status,
        invoiceUrl: p.invoiceUrl,
        value: p.value,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
    recurring: recurring.map((r: any) => ({
      addOnId: r.addOnId,
      subscriptionId: r.subscriptionId,
      status: r.status,
      extraAgents: r.extraAgents,
      extraStorage: r.extraStorage,
      aiCredits: r.aiCredits,
      currentPeriodEnd: r.currentPeriodEnd,
    })),
    // We can create the Asaas customer on-demand during checkout.
    canPurchase: true,
  });
};

export const createAddOnCheckout = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const schema = z.object({
    addOnId: z.string().min(1),
    billingType: z.enum(['CREDIT_CARD', 'PIX', 'BOLETO']).default('CREDIT_CARD'),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Erro de validacao', errors: parsed.error.errors });
    return;
  }

  const addOnId = parsed.data.addOnId as AddOnId;
  if (!(addOnId in ADDON_CATALOG)) {
    throw new AppError('Add-on inválido', 400);
  }

  let planLimit: any = await PlanLimit.findOne({ tenant: user.tenant._id }).select('subscription addons');
  if (!planLimit) {
    await planService.initializeTenantPlan(user.tenant._id.toString());
    planLimit = await PlanLimit.findOne({ tenant: user.tenant._id }).select('subscription addons');
  }
  if (!planLimit) throw new AppError('Plano do tenant nao encontrado', 500);

  if (!planLimit.subscription?.stripeCustomerId) {
    const asaasCustomer = await asaasService.getOrCreateCustomer({
      name: user.name,
      email: user.email,
      externalReference: user.tenant._id.toString(),
    } as any);
    planLimit.subscription.stripeCustomerId = asaasCustomer.id;
    await planLimit.save();
  }

  const item = ADDON_CATALOG[addOnId];
  const tenantId = user.tenant._id.toString();

  const due = new Date();
  due.setDate(due.getDate() + 1);
  const dueDate = due.toISOString().split('T')[0];

  const customerId = String(planLimit.subscription.stripeCustomerId || '');
  if (!customerId) throw new AppError('Cliente de cobranca nao encontrado', 500);

  const payment = await asaasService.createPayment({
    customer: customerId,
    billingType: parsed.data.billingType,
    value: item.priceOneTime,
    dueDate,
    description: `DeskFlow - Add-on ${item.name}`,
    externalReference: `${tenantId}-addon-${item.id}`,
  } as any);

  try {
    const pid = String(payment?.id || '');
    if (pid) {
      (planLimit as any).addons = upsertPendingOneTime((planLimit as any).addons, {
        addOnId: item.id,
        paymentId: pid,
        invoiceUrl: String(payment?.invoiceUrl || '') || undefined,
        value: Number(item.priceOneTime || 0) || undefined,
      });
      await planLimit.save();
    }
  } catch {
    // best-effort
  }

  res.json({
    checkoutUrl: payment?.invoiceUrl || '',
    paymentId: payment?.id,
  });
};

export const createAddOnSubscription = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const schema = z.object({
    addOnId: z.string().min(1),
    billingType: z.enum(['CREDIT_CARD', 'PIX', 'BOLETO']).default('CREDIT_CARD'),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Erro de validacao', errors: parsed.error.errors });
    return;
  }

  const addOnId = parsed.data.addOnId as AddOnId;
  if (!(addOnId in ADDON_CATALOG)) {
    throw new AppError('Add-on inválido', 400);
  }

  let planLimit: any = await PlanLimit.findOne({ tenant: user.tenant._id }).select('subscription addons');
  if (!planLimit) {
    await planService.initializeTenantPlan(user.tenant._id.toString());
    planLimit = await PlanLimit.findOne({ tenant: user.tenant._id }).select('subscription addons');
  }
  if (!planLimit) throw new AppError('Plano do tenant nao encontrado', 500);

  if (!planLimit.subscription?.stripeCustomerId) {
    const asaasCustomer = await asaasService.getOrCreateCustomer({
      name: user.name,
      email: user.email,
      externalReference: user.tenant._id.toString(),
    } as any);
    planLimit.subscription.stripeCustomerId = asaasCustomer.id;
    await planLimit.save();
  }

  const item = ADDON_CATALOG[addOnId];
  const tenantId = user.tenant._id.toString();

  const due = new Date();
  due.setDate(due.getDate() + 1);

  const customerId = String(planLimit.subscription.stripeCustomerId || '');
  if (!customerId) throw new AppError('Cliente de cobranca nao encontrado', 500);

  const subscriptionData: AsaasSubscription = {
    customer: customerId,
    billingType: parsed.data.billingType as any,
    value: item.priceMonthly,
    nextDueDate: due.toISOString().split('T')[0],
    cycle: 'MONTHLY',
    description: `DeskFlow - Add-on mensal ${item.name}`,
    externalReference: `${tenantId}-addonsub-${item.id}`,
  };

  const subscription = await asaasService.createSubscription(subscriptionData);
  const subId = String(subscription?.id || '');
  if (!subId) {
    throw new AppError('Falha ao criar assinatura do add-on', 500);
  }

  (planLimit as any).addons = (planLimit as any).addons || {};
  (planLimit as any).addons.recurring = Array.isArray((planLimit as any).addons.recurring) ? (planLimit as any).addons.recurring : [];
  (planLimit as any).addons.recurring.push({
    addOnId: item.id,
    subscriptionId: subId,
    status: 'trialing',
    extraAgents: item.extraAgents,
    extraStorage: item.extraStorage,
    aiCredits: item.aiCredits,
    currentPeriodEnd: subscription?.nextDueDate ? new Date(String(subscription.nextDueDate)) : undefined,
  });
  await planLimit.save();

  const checkoutUrl = `https://${process.env.NODE_ENV === 'production' ? '' : 'sandbox.'}asaas.com/i/${subId}`;

  res.json({
    subscriptionId: subId,
    checkoutUrl,
  });
};

export const cancelAddOnSubscription = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const schema = z.object({ subscriptionId: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Erro de validacao', errors: parsed.error.errors });
    return;
  }

  const planLimit = await PlanLimit.findOne({ tenant: user.tenant._id }).select('addons');
  if (!planLimit) throw new AppError('Plano do tenant nao encontrado', 500);
  const recurring = Array.isArray((planLimit as any)?.addons?.recurring) ? (planLimit as any).addons.recurring : [];
  const entry = recurring.find((r: any) => String(r.subscriptionId) === String(parsed.data.subscriptionId));
  if (!entry) throw new AppError('Assinatura do add-on nao encontrada', 404);

  await asaasService.cancelSubscription(String(parsed.data.subscriptionId));

  entry.status = 'canceled';
  await planLimit.save();
  res.json({ success: true });
};

export const handleWebhook = async (
  req: any,
  res: Response
): Promise<void> => {
  try {
    const { event, payment, subscription } = req.body || {};

    const eventId = req.body?.id ? String(req.body.id) : '';
    const extRef = String(payment?.externalReference || subscription?.externalReference || '');
    const tenantId = extRef ? extRef.split('-')[0] : '';
    const tenant = tenantId && isValidObjectId(tenantId) ? tenantId : undefined;
    const resourceId = String(payment?.id || subscription?.id || '');

    if (config.asaasWebhookSecret) {
      const token = String(req.headers['asaas-access-token'] || '');
      const secret = String(config.asaasWebhookSecret || '');
      const a = Buffer.from(token);
      const b = Buffer.from(secret);

      if (!token || a.length !== b.length || !timingSafeEqual(a, b)) {
        if (eventId) {
          await WebhookEvent.updateOne(
            { provider: 'asaas', eventId },
            {
              $setOnInsert: {
                provider: 'asaas',
                eventId,
                receivedAt: new Date(),
              },
              $set: {
                status: 'unauthorized',
                event: event ? String(event) : undefined,
                tenant,
                resourceId: resourceId || undefined,
                error: 'Nao autorizado',
                processedAt: new Date(),
              },
            },
            { upsert: true }
          ).catch(() => undefined);
        }
        res.status(401).json({ error: 'Nao autorizado' });
        return;
      }
    }

    let webhookEventDocId: any = null;
    if (eventId) {
      try {
        const doc = await WebhookEvent.create({
          provider: 'asaas',
          eventId,
          tenant,
          event: event ? String(event) : undefined,
          resourceId: resourceId || undefined,
          status: 'received',
          receivedAt: new Date(),
        });
        webhookEventDocId = doc._id;
      } catch (e: any) {
        if (e?.code === 11000) {
          // Duplicate event (at-least-once delivery). Re-process only if not yet processed.
          const existing = await WebhookEvent.findOne({ provider: 'asaas', eventId })
            .select('_id status')
            .lean();

          if (!existing) {
            res.status(200).json({ received: true, duplicate: true });
            return;
          }

          if (existing.status === 'processed' || existing.status === 'unauthorized') {
            res.status(200).json({ received: true, duplicate: true });
            return;
          }

          webhookEventDocId = existing._id;
          await WebhookEvent.updateOne(
            { provider: 'asaas', eventId },
            {
              $set: {
                status: 'received',
                event: event ? String(event) : undefined,
                tenant,
                resourceId: resourceId || undefined,
              },
              $unset: { error: 1, processedAt: 1 },
            }
          ).catch(() => undefined);
        }
        throw e;
      }
    }

     if (process.env.NODE_ENV !== 'production') {
       console.log('Asaas webhook received:', event);
     }

    // Verificar assinatura do webhook (implementar em produção)
    // const signature = req.headers['asaas-signature'];

    switch (event) {
      case 'PAYMENT_CREATED':
      case 'PAYMENT_PENDING':
        // handled via checkout endpoint (best-effort persistence)
        break;

      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_CONFIRMED':
        await handlePaymentReceived(payment);
        break;
      
      case 'PAYMENT_OVERDUE':
        await handlePaymentOverdue(payment);
        break;

      case 'PAYMENT_CANCELED':
      case 'PAYMENT_DELETED':
        await handlePaymentCanceled(payment);
        break;
      
      case 'SUBSCRIPTION_CREATED':
        // Assinatura criada, aguardando pagamento
        break;
      
      case 'SUBSCRIPTION_UPDATED':
        await handleSubscriptionUpdated(subscription);
        break;
      
      case 'SUBSCRIPTION_CANCELLED':
        await handleSubscriptionCancelled(subscription);
        break;
      
      default:
        console.log('Unhandled webhook event:', event);
    }

    if (webhookEventDocId) {
      await WebhookEvent.updateOne(
        { _id: webhookEventDocId },
        { $set: { status: 'processed', processedAt: new Date() } }
      ).catch(() => undefined);
    }

    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);

    const eventId = req.body?.id ? String(req.body.id) : '';
    if (eventId) {
      await WebhookEvent.updateOne(
        { provider: 'asaas', eventId },
        {
          $set: {
            status: 'error',
            error: String(error?.message || error),
            processedAt: new Date(),
          },
        }
      ).catch(() => undefined);
    }

    res.status(500).json({ error: error.message });
  }
};

export const listWebhookEvents = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const limitRaw = parseInt(String(req.query.limit || '50'), 10) || 50;
  const limit = Math.min(200, Math.max(1, limitRaw));

  const events = await WebhookEvent.find({ provider: 'asaas', tenant: user.tenant._id })
    .sort({ receivedAt: -1 })
    .limit(limit)
    .select('provider eventId event resourceId status error receivedAt processedAt createdAt');

  res.json({ data: events });
};

async function handlePaymentReceived(payment: any) {
  let externalRef = String(payment?.externalReference || '');
  // Some payment payloads may not carry externalReference; try subscription.
  if (!externalRef && payment?.subscription) {
    try {
      const sub = await asaasService.getSubscription(String(payment.subscription));
      externalRef = String(sub?.externalReference || '');
    } catch {
      // ignore
    }
  }

  const tenantId = externalRef.split('-')[0];
  const plan = parsePlanFromExternalReference(externalRef);
  const addon = parseAddOnFromExternalReference(externalRef);

  if (!tenantId || !isValidObjectId(tenantId)) return;

  const planLimit = await PlanLimit.findOne({ tenant: tenantId });
  if (!planLimit) return;

  if (plan) {
    // Atualizar status para ativo (apenas para pagamento do plano)
    planLimit.subscription.status = 'active';
    planLimit.subscription.currentPeriodStart = new Date();

    try {
      const subId = payment?.subscription || planLimit.subscription.stripeSubscriptionId;
      if (subId) {
        const sub = await asaasService.getSubscription(String(subId));
        if (sub?.nextDueDate) {
          planLimit.subscription.currentPeriodEnd = new Date(String(sub.nextDueDate));
        }
      }
    } catch {
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      planLimit.subscription.currentPeriodEnd = periodEnd;
    }

    await planLimit.save();
    await planService.upgradePlan(tenantId, plan);
  }

  if (addon.kind === 'addon' && addon.addOnId) {
    const item = ADDON_CATALOG[addon.addOnId];

    const pid = String(payment?.id || '');
    (planLimit as any).addons = applyOneTimeAddOnPaymentReceived((planLimit as any).addons, {
      addOnId: item.id,
      paymentId: pid,
      invoiceUrl: payment?.invoiceUrl,
      value: payment?.value,
      createdAt: payment?.dateCreated ? new Date(String(payment.dateCreated)) : undefined,
      extraAgents: item.extraAgents,
      extraStorage: item.extraStorage,
      aiCredits: item.aiCredits,
    });

    await planLimit.save();
  }

  if (addon.kind === 'addonsub' && addon.addOnId) {
    const subId = String(payment?.subscription || '');
    if (!subId) {
      // Best-effort: without subscriptionId we can't track recurring add-ons.
    } else {
      const item = ADDON_CATALOG[addon.addOnId];
      let currentPeriodEnd: Date | undefined = undefined;
      try {
        const sub = await asaasService.getSubscription(String(subId));
        if (sub?.nextDueDate) currentPeriodEnd = new Date(String(sub.nextDueDate));
      } catch {
        // ignore
      }

      (planLimit as any).addons = upsertRecurringAddOn((planLimit as any).addons, {
        addOnId: item.id,
        subscriptionId: String(subId),
        status: 'active',
        extraAgents: item.extraAgents,
        extraStorage: item.extraStorage,
        aiCredits: item.aiCredits,
        currentPeriodEnd,
      });

      await planLimit.save();
    }
  }

  // Email admins (apenas para pagamento do plano)
  if (plan) {
    try {
      const tenant = await Tenant.findById(tenantId).select('name');
      const admins = await User.find({ tenant: tenantId, role: 'admin', isActive: true }).select('email');
      const to = admins.map((a: any) => String(a.email)).filter(Boolean);
      if (tenant && to.length > 0) {
        const url = `${process.env.FRONTEND_URL || ''}/plans`;
        const tpl = emailTemplates.paymentConfirmed({
          tenantName: tenant.name,
          plan: String(plan),
          periodEnd: planLimit.subscription.currentPeriodEnd,
          url,
        });
        await Promise.all(to.map((email) => sendEmail({ to: email, ...tpl })));
      }
    } catch {
      // best-effort
    }

    console.log(`Payment received for tenant ${tenantId}`);
  }
}

async function handlePaymentOverdue(payment: any) {
  let externalRef = String(payment?.externalReference || '');
  if (!externalRef && payment?.subscription) {
    try {
      const sub = await asaasService.getSubscription(String(payment.subscription));
      externalRef = String(sub?.externalReference || '');
    } catch {
      // ignore
    }
  }

  const tenantId = externalRef.split('-')[0];
  const plan = parsePlanFromExternalReference(externalRef);
  const addon = parseAddOnFromExternalReference(externalRef);
  if (!tenantId || !isValidObjectId(tenantId)) return;

  const planLimit = await PlanLimit.findOne({ tenant: tenantId });
  if (!planLimit) return;

  // Plan payment overdue
  if (plan) {
    planLimit.subscription.status = 'past_due';
    await planLimit.save();
  }

  // One-time add-on payment overdue
  if (addon.kind === 'addon') {
    const pid = String(payment?.id || '');
    if (pid) {
      (planLimit as any).addons = setPendingOneTimeStatus((planLimit as any).addons, pid, 'overdue');
      await planLimit.save();
    }
  }

  // Recurring add-on payment overdue
  if (addon.kind === 'addonsub' && addon.addOnId) {
    const subId = String(payment?.subscription || '');
    if (!subId) {
      // Best-effort: without subscriptionId we can't track recurring add-ons.
    } else {
      const item = ADDON_CATALOG[addon.addOnId];
      (planLimit as any).addons = upsertRecurringAddOn((planLimit as any).addons, {
        addOnId: item.id,
        subscriptionId: String(subId),
        status: 'past_due',
        extraAgents: item.extraAgents,
        extraStorage: item.extraStorage,
        aiCredits: item.aiCredits,
      });

      await planLimit.save();
    }
  }

  // Email admins (apenas para plano)
  if (plan) {
    try {
      const tenant = await Tenant.findById(tenantId).select('name');
      const admins = await User.find({ tenant: tenantId, role: 'admin', isActive: true }).select('email');
      const to = admins.map((a: any) => String(a.email)).filter(Boolean);
      if (tenant && to.length > 0) {
        const url = `${process.env.FRONTEND_URL || ''}/plans`;
        const tpl = emailTemplates.paymentOverdue({ tenantName: tenant.name, url });
        await Promise.all(to.map((email) => sendEmail({ to: email, ...tpl })));
      }
    } catch {
      // best-effort
    }

    console.log(`Payment overdue for tenant ${tenantId}`);
  }
}

async function handlePaymentCanceled(payment: any) {
  const externalRef = String(payment?.externalReference || '');
  const addon = parseAddOnFromExternalReference(externalRef);
  if (addon.kind !== 'addon') return;
  if (!addon.tenantId || !isValidObjectId(addon.tenantId)) return;

  const planLimit = await PlanLimit.findOne({ tenant: addon.tenantId });
  if (!planLimit) return;

  const pid = String(payment?.id || '');
  if (!pid) return;
  (planLimit as any).addons = setPendingOneTimeStatus((planLimit as any).addons, pid, 'canceled');
  await planLimit.save();
}

async function handleSubscriptionUpdated(subscription: any) {
  const ext = String(subscription?.externalReference || '');
  const parsedAddon = parseAddOnFromExternalReference(ext);

  // Main plan subscription update (existing behavior)
  const planLimit = await PlanLimit.findOne({
    'subscription.stripeSubscriptionId': subscription.id,
  });

  if (planLimit) {
    const rawStatus = String(subscription?.status || '').toUpperCase();
    if (rawStatus === 'ACTIVE') planLimit.subscription.status = 'active';
    else if (rawStatus === 'OVERDUE') planLimit.subscription.status = 'past_due';
    else if (rawStatus === 'INACTIVE' || rawStatus === 'CANCELED' || rawStatus === 'CANCELLED') planLimit.subscription.status = 'canceled';

    if (subscription?.nextDueDate) {
      planLimit.subscription.currentPeriodEnd = new Date(String(subscription.nextDueDate));
    }

    const tenantId = ext.split('-')[0];
    const plan = parsePlanFromExternalReference(ext);
    if (tenantId && plan) {
      await planService.upgradePlan(tenantId, plan);
    }

    await planLimit.save();
    return;
  }

  // Add-on subscription update
  if (parsedAddon.kind === 'addonsub' && parsedAddon.tenantId && parsedAddon.addOnId) {
    const tId = parsedAddon.tenantId;
    if (!isValidObjectId(tId)) return;
    const pl = await PlanLimit.findOne({ tenant: tId });
    if (!pl) return;

    const mapped = mapAsaasSubscriptionStatus(subscription?.status) || 'trialing';
    const item = ADDON_CATALOG[parsedAddon.addOnId];
    (pl as any).addons = upsertRecurringAddOn((pl as any).addons, {
      addOnId: item.id,
      subscriptionId: String(subscription.id),
      status: mapped,
      extraAgents: item.extraAgents,
      extraStorage: item.extraStorage,
      aiCredits: item.aiCredits,
      currentPeriodEnd: subscription?.nextDueDate ? new Date(String(subscription.nextDueDate)) : undefined,
    });

    await pl.save();
  }
}

async function handleSubscriptionCancelled(subscription: any) {
  const ext = String(subscription?.externalReference || '');
  const parsedAddon = parseAddOnFromExternalReference(ext);

  const planLimit = await PlanLimit.findOne({
    'subscription.stripeSubscriptionId': subscription.id,
  });

  if (planLimit) {
    planLimit.subscription.status = 'canceled';

    if (subscription?.nextDueDate && !planLimit.subscription.currentPeriodEnd) {
      planLimit.subscription.currentPeriodEnd = new Date(String(subscription.nextDueDate));
    }

    // Fazer downgrade para Free ao final do período pago
    const periodEnd = planLimit.subscription.currentPeriodEnd;
    if (periodEnd && new Date() > periodEnd) {
      await planService.upgradePlan(planLimit.tenant.toString(), PlanType.FREE);
    }

    await planLimit.save();
    return;
  }

  // Add-on subscription cancel
  if (parsedAddon.kind === 'addonsub' && parsedAddon.tenantId) {
    if (!isValidObjectId(parsedAddon.tenantId)) return;
    const pl = await PlanLimit.findOne({ tenant: parsedAddon.tenantId });
    if (!pl) return;
    const recurring = Array.isArray((pl as any)?.addons?.recurring) ? (pl as any).addons.recurring : [];
    const entry = recurring.find((r: any) => String(r.subscriptionId) === String(subscription.id));
    if (entry) {
      entry.status = 'canceled';
      if (subscription?.nextDueDate) entry.currentPeriodEnd = new Date(String(subscription.nextDueDate));
      await pl.save();
    }
  }
}

export const cancelSubscription = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const user = req.user!;
  
  const planLimit = await PlanLimit.findOne({ tenant: user.tenant._id });
  if (!planLimit || !planLimit.subscription.stripeSubscriptionId) {
    throw new AppError('Nenhuma assinatura ativa encontrada', 404);
  }

  // Best-effort: keep access until next due date if we have it.
  try {
    const sub = await asaasService.getSubscription(planLimit.subscription.stripeSubscriptionId);
    if (sub?.nextDueDate) {
      planLimit.subscription.currentPeriodEnd = new Date(String(sub.nextDueDate));
    }
  } catch {
    // ignore
  }

  // Cancelar no Asaas
  await asaasService.cancelSubscription(planLimit.subscription.stripeSubscriptionId);

  // Atualizar status local
  planLimit.subscription.status = 'canceled';
  await planLimit.save();

  res.json({
    message: 'Assinatura cancelada com sucesso',
    messageDetail: 'Seu acesso continuará até o final do período pago.',
  });
};

export const getBillingPortal = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const user = req.user!;
  
  const planLimit = await PlanLimit.findOne({ tenant: user.tenant._id });
  if (!planLimit || !planLimit.subscription.stripeCustomerId) {
    throw new AppError('Nenhuma assinatura encontrada', 404);
  }

  // Asaas não tem portal de cliente nativo como Stripe, 
  // então retornamos os dados da assinatura atual
  const subscription = await asaasService.getSubscription(
    planLimit.subscription.stripeSubscriptionId!
  );

  res.json({
    subscription: {
      id: subscription.id,
      status: subscription.status,
      value: subscription.value,
      nextDueDate: subscription.nextDueDate,
      cycle: subscription.cycle,
    },
    plan: planLimit.plan,
    status: planLimit.subscription.status,
    currentPeriodEnd: planLimit.subscription.currentPeriodEnd,
  });
};

export const changePlan = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const { plan } = req.body || {};

  if (!Object.values(PlanType).includes(plan)) {
    throw new AppError('Plano inválido', 400);
  }
  if (plan === PlanType.FREE) {
    throw new AppError('Não é possível trocar para Free por aqui. Cancele a assinatura para voltar ao Free.', 400);
  }

  const planLimit = await PlanLimit.findOne({ tenant: user.tenant._id });
  if (!planLimit || !planLimit.subscription.stripeSubscriptionId) {
    throw new AppError('Nenhuma assinatura encontrada. Faça checkout para assinar um plano.', 404);
  }

  const currentPlan = planLimit.plan;
  const currentPrice = PLAN_PRICES[currentPlan as PlanType] ?? 0;
  const targetPrice = PLAN_PRICES[plan as PlanType] ?? 0;
  const isDowngrade = targetPrice < currentPrice;

  const effectiveAt = isDowngrade && planLimit.subscription.currentPeriodEnd
    ? new Date(planLimit.subscription.currentPeriodEnd)
    : new Date();

  await asaasService.updateSubscription(planLimit.subscription.stripeSubscriptionId, {
    value: targetPrice,
    description: `DeskFlow - Plano ${String(plan).charAt(0).toUpperCase() + String(plan).slice(1)}`,
    externalReference: `${user.tenant._id}-${plan}`,
  });

  planLimit.subscription.desiredPlan = plan;
  planLimit.subscription.desiredPlanEffectiveAt = effectiveAt;
  await planLimit.save();

  res.json({
    success: true,
    message: isDowngrade
      ? 'Mudança de plano agendada para o próximo ciclo.'
      : 'Plano atualizado. Seu acesso será liberado imediatamente.',
    effectiveAt,
    desiredPlan: plan,
  });
};

export const syncSubscription = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;

  const planLimit = await PlanLimit.findOne({ tenant: user.tenant._id });
  if (!planLimit || !planLimit.subscription.stripeSubscriptionId) {
    throw new AppError('Nenhuma assinatura encontrada para sincronizar', 404);
  }

  const sub = await asaasService.getSubscription(planLimit.subscription.stripeSubscriptionId);

  const mapped = mapAsaasSubscriptionStatus(sub?.status);
  if (mapped) planLimit.subscription.status = mapped;
  if (sub?.nextDueDate) planLimit.subscription.currentPeriodEnd = new Date(String(sub.nextDueDate));

  const targetPlan = parsePlanFromExternalReference(sub?.externalReference);
  if (targetPlan && targetPlan !== PlanType.FREE) {
    const currentPrice = PLAN_PRICES[planLimit.plan as PlanType] ?? 0;
    const targetPrice = PLAN_PRICES[targetPlan] ?? 0;
    const isDowngrade = targetPrice < currentPrice;

    const effectiveAt = isDowngrade && planLimit.subscription.currentPeriodEnd
      ? new Date(planLimit.subscription.currentPeriodEnd)
      : new Date();

    // If the provider says subscription is ACTIVE, we can safely reflect the plan now.
    if (planLimit.subscription.status === 'active' && !isDowngrade) {
      await planService.upgradePlan(user.tenant._id.toString(), targetPlan);
      planLimit.subscription.desiredPlan = undefined;
      planLimit.subscription.desiredPlanEffectiveAt = undefined;
    } else {
      planLimit.subscription.desiredPlan = targetPlan;
      planLimit.subscription.desiredPlanEffectiveAt = effectiveAt;
    }
  }

  await planLimit.save();

  res.json({
    success: true,
    provider: {
      id: sub?.id,
      status: sub?.status,
      value: sub?.value,
      nextDueDate: sub?.nextDueDate,
      cycle: sub?.cycle,
      externalReference: sub?.externalReference,
    },
    local: {
      plan: planLimit.plan,
      status: planLimit.subscription.status,
      currentPeriodEnd: planLimit.subscription.currentPeriodEnd,
      desiredPlan: planLimit.subscription.desiredPlan,
      desiredPlanEffectiveAt: planLimit.subscription.desiredPlanEffectiveAt,
    },
  });
};

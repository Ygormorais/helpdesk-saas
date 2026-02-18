import { Response } from 'express';
import { asaasService } from '../services/asaasService.js';
import { planService } from '../services/planService.js';
import { PlanLimit, PlanType, WebhookEvent } from '../models/index.js';
import { AuthRequest } from '../middlewares/auth.js';
import { AppError } from '../middlewares/errorHandler.js';
import { config } from '../config/index.js';
import { timingSafeEqual } from 'crypto';

import type { AsaasSubscription } from '../services/asaasService.js';

const PLAN_PRICES: Record<PlanType, number> = {
  free: 0,
  pro: 29.90,
  enterprise: 99.90,
};

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

export const handleWebhook = async (
  req: any,
  res: Response
): Promise<void> => {
  try {
    const { event, payment, subscription } = req.body || {};

    if (config.asaasWebhookSecret) {
      const token = String(req.headers['asaas-access-token'] || '');
      const secret = String(config.asaasWebhookSecret || '');
      const a = Buffer.from(token);
      const b = Buffer.from(secret);

      if (!token || a.length !== b.length || !timingSafeEqual(a, b)) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
    }

    const eventId = req.body?.id ? String(req.body.id) : '';
    const extRef = String(payment?.externalReference || subscription?.externalReference || '');
    const tenantId = extRef ? extRef.split('-')[0] : '';
    const resourceId = String(payment?.id || subscription?.id || '');

    let webhookEventDocId: any = null;
    if (eventId) {
      try {
        const doc = await WebhookEvent.create({
          provider: 'asaas',
          eventId,
          tenant: tenantId || undefined,
          event: event ? String(event) : undefined,
          resourceId: resourceId || undefined,
          status: 'received',
          receivedAt: new Date(),
        });
        webhookEventDocId = doc._id;
      } catch (e: any) {
        if (e?.code === 11000) {
          // Duplicate event (at-least-once delivery)
          await WebhookEvent.updateOne(
            { provider: 'asaas', eventId },
            {
              $set: {
                status: 'duplicate',
                event: event ? String(event) : undefined,
                tenant: tenantId || undefined,
                resourceId: resourceId || undefined,
              },
            }
          ).catch(() => undefined);
          res.status(200).json({ received: true, duplicate: true });
          return;
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
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_CONFIRMED':
        await handlePaymentReceived(payment);
        break;
      
      case 'PAYMENT_OVERDUE':
        await handlePaymentOverdue(payment);
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
  const externalRef = payment.externalReference || '';
  const tenantId = externalRef.split('-')[0];
  const plan = externalRef.split('-')[1];
  
  if (!tenantId) return;

  const planLimit = await PlanLimit.findOne({ tenant: tenantId });
  if (!planLimit) return;

  // Atualizar status para ativo
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

  if (plan && Object.values(PlanType).includes(plan)) {
    await planService.upgradePlan(tenantId, plan as PlanType);
  }

  // Aqui você pode enviar email de confirmação
  console.log(`Payment received for tenant ${tenantId}`);
}

async function handlePaymentOverdue(payment: any) {
  const externalRef = payment.externalReference || '';
  const tenantId = externalRef.split('-')[0];
  
  if (!tenantId) return;

  const planLimit = await PlanLimit.findOne({ tenant: tenantId });
  if (!planLimit) return;

  planLimit.subscription.status = 'past_due';
  await planLimit.save();

  console.log(`Payment overdue for tenant ${tenantId}`);
}

async function handleSubscriptionUpdated(subscription: any) {
  const planLimit = await PlanLimit.findOne({
    'subscription.stripeSubscriptionId': subscription.id,
  });
  
  if (!planLimit) return;

  const rawStatus = String(subscription?.status || '').toUpperCase();
  if (rawStatus === 'ACTIVE') planLimit.subscription.status = 'active';
  else if (rawStatus === 'OVERDUE') planLimit.subscription.status = 'past_due';
  else if (rawStatus === 'INACTIVE' || rawStatus === 'CANCELED' || rawStatus === 'CANCELLED') planLimit.subscription.status = 'canceled';

  if (subscription?.nextDueDate) {
    planLimit.subscription.currentPeriodEnd = new Date(String(subscription.nextDueDate));
  }

  const ext = subscription.externalReference || '';
  const tenantId = ext.split('-')[0];
  const plan = ext.split('-')[1];
  if (tenantId && plan && Object.values(PlanType).includes(plan)) {
    await planService.upgradePlan(tenantId, plan as PlanType);
  }
  
  await planLimit.save();
}

async function handleSubscriptionCancelled(subscription: any) {
  const planLimit = await PlanLimit.findOne({
    'subscription.stripeSubscriptionId': subscription.id,
  });
  
  if (!planLimit) return;

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

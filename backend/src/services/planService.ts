import { Response } from 'express';
import { PlanLimit, PLAN_LIMITS, PlanType, User, Ticket, Macro, AutomationRule, type IPlanLimit } from '../models/index.js';
import { AuthRequest } from '../middlewares/auth.js';
import { AppError } from '../middlewares/errorHandler.js';

export class PlanService {
  private isActiveTrial(sub: IPlanLimit['subscription'] | undefined): boolean {
    if (!sub) return false;
    if (sub.status !== 'trialing') return false;
    if (!sub.trialEndsAt) return false;
    return sub.trialEndsAt.getTime() > Date.now();
  }

  private subscriptionAllowsPaidFeatures(sub: IPlanLimit['subscription'] | undefined): boolean {
    if (!sub) return false;

    if (sub.status === 'active') return true;

    if (sub.status === 'trialing') {
      // Active signup trial
      if (this.isActiveTrial(sub)) return true;
      // Some providers may report a temporary/pending state; keep access until period end if present.
      if (sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() > Date.now()) return true;
      return false;
    }

    // If the subscription was cancelled but still within the paid period,
    // keep access until the end of the current period.
    if (sub.status === 'canceled') {
      if (!sub.currentPeriodEnd) return false;
      return sub.currentPeriodEnd.getTime() > Date.now();
    }

    // past_due => deny paid features
    return false;
  }

  private getEffectiveConfig(planLimit: IPlanLimit): {
    plan: PlanType;
    maxAgents: number;
    maxTickets: number;
    maxStorage: number;
    maxMacros: number;
    maxAutomationRules: number;
    auditRetentionDays: number;
    features: IPlanLimit['features'];
    isPaidAccessBlocked: boolean;
  } {
    // Use stored features only to backfill missing keys; the effective plan config wins.
    const mergeFeatures = (base: IPlanLimit['features']) => ({
      ...(planLimit.features as any),
      ...base,
    });

    const addIfFinite = (base: number, extra: number) => {
      if (base === -1) return -1;
      return base + extra;
    };

    const extraAgents = Number((planLimit as any).addons?.extraAgents || 0) || 0;
    const extraStorage = Number((planLimit as any).addons?.extraStorage || 0) || 0;

    // During the initial trial (created on tenant signup) we grant PRO access,
    // even though the stored plan is FREE.
    if (planLimit.plan === PlanType.FREE && this.isActiveTrial(planLimit.subscription)) {
      const pro = PLAN_LIMITS[PlanType.PRO];
      return {
        plan: PlanType.PRO,
        maxAgents: addIfFinite(pro.maxAgents, extraAgents),
        maxTickets: pro.maxTickets,
        maxStorage: addIfFinite(pro.maxStorage, extraStorage),
        maxMacros: pro.maxMacros,
        maxAutomationRules: pro.maxAutomationRules,
        auditRetentionDays: pro.auditRetentionDays,
        features: mergeFeatures(pro.features),
        isPaidAccessBlocked: false,
      };
    }

    // Apply scheduled plan change at the config level (persisted elsewhere).
    const desired = planLimit.subscription?.desiredPlan;
    const desiredAt = planLimit.subscription?.desiredPlanEffectiveAt;
    if (desired && desiredAt && desiredAt.getTime() <= Date.now()) {
      const cfg = PLAN_LIMITS[desired];
      const isPaid = desired !== PlanType.FREE;
      const paidAllowed = !isPaid || this.subscriptionAllowsPaidFeatures(planLimit.subscription);
      if (paidAllowed) {
        return {
          plan: desired,
          maxAgents: addIfFinite(cfg.maxAgents, extraAgents),
          maxTickets: cfg.maxTickets,
          maxStorage: addIfFinite(cfg.maxStorage, extraStorage),
          maxMacros: cfg.maxMacros,
          maxAutomationRules: cfg.maxAutomationRules,
          auditRetentionDays: cfg.auditRetentionDays,
          features: mergeFeatures(cfg.features),
          isPaidAccessBlocked: false,
        };
      }
      const free = PLAN_LIMITS[PlanType.FREE];
      return {
        plan: PlanType.FREE,
        maxAgents: addIfFinite(free.maxAgents, extraAgents),
        maxTickets: free.maxTickets,
        maxStorage: addIfFinite(free.maxStorage, extraStorage),
        maxMacros: free.maxMacros,
        maxAutomationRules: free.maxAutomationRules,
        auditRetentionDays: free.auditRetentionDays,
        features: mergeFeatures(free.features),
        isPaidAccessBlocked: true,
      };
    }

    const isPaidPlan = planLimit.plan !== PlanType.FREE;
    const paidAllowed = !isPaidPlan || this.subscriptionAllowsPaidFeatures(planLimit.subscription);

    if (paidAllowed) {
      return {
        plan: planLimit.plan,
        maxAgents: addIfFinite(planLimit.maxAgents, extraAgents),
        maxTickets: planLimit.maxTickets,
        maxStorage: addIfFinite(planLimit.maxStorage, extraStorage),
        maxMacros: PLAN_LIMITS[planLimit.plan].maxMacros,
        maxAutomationRules: PLAN_LIMITS[planLimit.plan].maxAutomationRules,
        auditRetentionDays: PLAN_LIMITS[planLimit.plan].auditRetentionDays,
        features: mergeFeatures(PLAN_LIMITS[planLimit.plan].features),
        isPaidAccessBlocked: false,
      };
    }

    const free = PLAN_LIMITS[PlanType.FREE];
    return {
      plan: PlanType.FREE,
      maxAgents: addIfFinite(free.maxAgents, extraAgents),
      maxTickets: free.maxTickets,
      maxStorage: addIfFinite(free.maxStorage, extraStorage),
      maxMacros: free.maxMacros,
      maxAutomationRules: free.maxAutomationRules,
      auditRetentionDays: free.auditRetentionDays,
      features: mergeFeatures(free.features),
      isPaidAccessBlocked: true,
    };
  }

  async initializeTenantPlan(tenantId: string): Promise<void> {
    const existing = await PlanLimit.findOne({ tenant: tenantId });
    if (existing) return;

    const freePlan = PLAN_LIMITS[PlanType.FREE];
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14 dias de trial

    await PlanLimit.create({
      tenant: tenantId,
      plan: PlanType.FREE,
      maxAgents: freePlan.maxAgents,
      maxTickets: freePlan.maxTickets,
      maxStorage: freePlan.maxStorage,
      features: freePlan.features,
      currentUsage: { agents: 1, tickets: 0, storage: 0 },
      subscription: {
        status: 'trialing',
        trialEndsAt,
      },
    });
  }

  async getPlanForTenant(tenantId: string): Promise<IPlanLimit> {
    let planLimit = await PlanLimit.findOne({ tenant: tenantId });
    
    if (!planLimit) {
      await this.initializeTenantPlan(tenantId);
      planLimit = await PlanLimit.findOne({ tenant: tenantId });
    }

    if (!planLimit) {
      throw new AppError('Plano do tenant nao encontrado', 500);
    }

    return planLimit;
  }

  async checkFeatureAccess(tenantId: string, feature: keyof typeof PLAN_LIMITS[PlanType.FREE]['features']): Promise<boolean> {
    const planLimit = await this.getPlanForTenant(tenantId);
    const effective = this.getEffectiveConfig(planLimit);
    return effective.features[feature] ?? false;
  }

  async checkAgentLimit(tenantId: string): Promise<{ allowed: boolean; current: number; max: number }> {
    const planLimit = await this.getPlanForTenant(tenantId);
    const currentAgents = await User.countDocuments({
      tenant: tenantId,
      role: { $in: ['admin', 'manager', 'agent'] },
    });
    
    planLimit.currentUsage.agents = currentAgents;
    await planLimit.save();

    const maxAgents = this.getEffectiveConfig(planLimit).maxAgents;
    return {
      allowed: maxAgents === -1 || currentAgents < maxAgents,
      current: currentAgents,
      max: maxAgents,
    };
  }

  async checkTicketLimit(tenantId: string): Promise<{ allowed: boolean; current: number; max: number }> {
    const planLimit = await this.getPlanForTenant(tenantId);
    const currentTickets = await Ticket.countDocuments({ tenant: tenantId });
    
    planLimit.currentUsage.tickets = currentTickets;
    await planLimit.save();

    const maxTickets = this.getEffectiveConfig(planLimit).maxTickets;
    return {
      allowed: maxTickets === -1 || currentTickets < maxTickets,
      current: currentTickets,
      max: maxTickets,
    };
  }

  async upgradePlan(tenantId: string, newPlan: PlanType): Promise<void> {
    const planConfig = PLAN_LIMITS[newPlan];
    
    await PlanLimit.findOneAndUpdate(
      { tenant: tenantId },
      {
        plan: newPlan,
        maxAgents: planConfig.maxAgents,
        maxTickets: planConfig.maxTickets,
        maxStorage: planConfig.maxStorage,
        features: planConfig.features,
      },
      { upsert: true }
    );
  }

  async getPlanDetails(tenantId: string) {
    const planLimit = await this.getPlanForTenant(tenantId);

    // Persist scheduled plan changes when due.
    const desired = planLimit.subscription?.desiredPlan;
    const desiredAt = planLimit.subscription?.desiredPlanEffectiveAt;
    if (desired && desiredAt && desiredAt.getTime() <= Date.now()) {
      await this.upgradePlan(tenantId, desired);
      await PlanLimit.updateOne(
        { tenant: tenantId },
        { $unset: { 'subscription.desiredPlan': 1, 'subscription.desiredPlanEffectiveAt': 1 } }
      ).catch(() => undefined);
      const refreshed = await PlanLimit.findOne({ tenant: tenantId });
      if (refreshed) {
        // Use refreshed for downstream calculations
        (planLimit as any).plan = refreshed.plan;
        (planLimit as any).maxAgents = refreshed.maxAgents;
        (planLimit as any).maxTickets = refreshed.maxTickets;
        (planLimit as any).maxStorage = refreshed.maxStorage;
        (planLimit as any).features = refreshed.features;
        (planLimit as any).subscription = refreshed.subscription;
      }
    }

    // Refresh usage metrics (cheap counters)
    const [currentAgents, currentTickets, currentMacros, currentAutomationRules] = await Promise.all([
      User.countDocuments({
        tenant: tenantId,
        role: { $in: ['admin', 'manager', 'agent'] },
      }),
      Ticket.countDocuments({ tenant: tenantId }),
      Macro.countDocuments({ tenant: tenantId }),
      AutomationRule.countDocuments({ tenant: tenantId }),
    ]);

    planLimit.currentUsage.agents = currentAgents;
    planLimit.currentUsage.tickets = currentTickets;
    await planLimit.save();

    const effective = this.getEffectiveConfig(planLimit);
    const isTrial = this.isActiveTrial(planLimit.subscription);
    const trialDaysLeft = isTrial && planLimit.subscription.trialEndsAt
      ? Math.max(0, Math.ceil((planLimit.subscription.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 0;

    return {
      plan: planLimit.plan,
      effectivePlan: effective.plan,
      isPaidAccessBlocked: effective.isPaidAccessBlocked,
      isTrial,
      trialDaysLeft,
      limits: {
        agents: { current: planLimit.currentUsage.agents, max: effective.maxAgents },
        tickets: { current: planLimit.currentUsage.tickets, max: effective.maxTickets },
        storage: { current: planLimit.currentUsage.storage, max: effective.maxStorage },
        macros: { current: currentMacros, max: effective.maxMacros },
        automations: { current: currentAutomationRules, max: effective.maxAutomationRules },
      },
      retention: {
        auditDays: effective.auditRetentionDays,
      },
      features: effective.features,
      subscription: planLimit.subscription,
      addons: (planLimit as any).addons || { extraAgents: 0, extraStorage: 0, aiCredits: 0 },
    };
  }

  async getAuditRetentionDays(tenantId: string): Promise<number> {
    const planLimit = await this.getPlanForTenant(tenantId);
    return this.getEffectiveConfig(planLimit).auditRetentionDays;
  }
}

export const planService = new PlanService();

// Middleware para verificar limites
export const checkPlanLimit = (type: 'agent' | 'ticket') => {
  return async (req: AuthRequest, res: Response, next: Function): Promise<void> => {
    try {
      const user = req.user!;
      
      if (type === 'agent') {
        const check = await planService.checkAgentLimit(user.tenant._id.toString());
        if (!check.allowed) {
          throw new AppError(
            `Limite de agentes atingido (${check.current}/${check.max}). Faça upgrade para adicionar mais agentes.`,
            403
          );
        }
      } else if (type === 'ticket') {
        const check = await planService.checkTicketLimit(user.tenant._id.toString());
        if (!check.allowed) {
          throw new AppError(
            `Limite de tickets atingido (${check.current}/${check.max}). Faça upgrade para criar mais tickets.`,
            403
          );
        }
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Middleware para verificar feature
export const requireFeature = (feature: keyof typeof PLAN_LIMITS[PlanType.FREE]['features']) => {
  return async (req: AuthRequest, res: Response, next: Function): Promise<void> => {
    try {
      const user = req.user!;
      const hasAccess = await planService.checkFeatureAccess(user.tenant._id.toString(), feature);
      
      if (!hasAccess) {
        throw new AppError(
          `Esta funcionalidade está disponível apenas nos planos superiores. Faça upgrade para acessar ${feature}.`,
          403
        );
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

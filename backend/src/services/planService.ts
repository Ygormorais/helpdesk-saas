import { Response } from 'express';
import { PlanLimit, PLAN_LIMITS, PlanType, User, Ticket } from '../models/index.js';
import { AuthRequest } from '../middlewares/auth.js';
import { AppError } from '../middlewares/errorHandler.js';

export class PlanService {
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

  async getPlanForTenant(tenantId: string) {
    let planLimit = await PlanLimit.findOne({ tenant: tenantId });
    
    if (!planLimit) {
      await this.initializeTenantPlan(tenantId);
      planLimit = await PlanLimit.findOne({ tenant: tenantId });
    }

    return planLimit;
  }

  async checkFeatureAccess(tenantId: string, feature: keyof typeof PLAN_LIMITS[PlanType.FREE]['features']): Promise<boolean> {
    const planLimit = await this.getPlanForTenant(tenantId);
    return planLimit.features[feature] ?? false;
  }

  async checkAgentLimit(tenantId: string): Promise<{ allowed: boolean; current: number; max: number }> {
    const planLimit = await this.getPlanForTenant(tenantId);
    const currentAgents = await User.countDocuments({ tenant: tenantId });
    
    planLimit.currentUsage.agents = currentAgents;
    await planLimit.save();

    const maxAgents = planLimit.maxAgents;
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

    const maxTickets = planLimit.maxTickets;
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
    const isTrial = planLimit.subscription.status === 'trialing';
    const trialDaysLeft = isTrial && planLimit.subscription.trialEndsAt
      ? Math.max(0, Math.ceil((planLimit.subscription.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 0;

    return {
      plan: planLimit.plan,
      isTrial,
      trialDaysLeft,
      limits: {
        agents: { current: planLimit.currentUsage.agents, max: planLimit.maxAgents },
        tickets: { current: planLimit.currentUsage.tickets, max: planLimit.maxTickets },
        storage: { current: planLimit.currentUsage.storage, max: planLimit.maxStorage },
      },
      features: planLimit.features,
      subscription: planLimit.subscription,
    };
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

import { Response } from 'express';
import { planService } from '../services/planService.js';
import { PLAN_LIMITS, PlanType } from '../models/index.js';
import { AuthRequest } from '../middlewares/auth.js';
import { AppError } from '../middlewares/errorHandler.js';

export const getCurrentPlan = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const user = req.user!;
  
  const planDetails = await planService.getPlanDetails(user.tenant._id.toString());
  
  res.json({
    ...planDetails,
    availablePlans: Object.entries(PLAN_LIMITS).map(([plan, config]) => ({
      id: plan,
      name: plan.charAt(0).toUpperCase() + plan.slice(1),
      price: plan === 'free' ? 0 : plan === 'pro' ? 29 : 99,
      interval: 'month',
      limits: {
        agents: config.maxAgents === -1 ? 'Ilimitado' : config.maxAgents,
        tickets: config.maxTickets === -1 ? 'Ilimitado' : config.maxTickets,
        storage: `${config.maxStorage}MB`,
        macros: config.maxMacros === -1 ? 'Ilimitado' : config.maxMacros,
        automations: config.maxAutomationRules === -1 ? 'Ilimitado' : config.maxAutomationRules,
      },
      features: Object.entries(config.features).map(([key, value]) => ({
        name: key,
        available: value,
        label: getFeatureLabel(key),
      })),
    })),
  });
};

function getFeatureLabel(feature: string): string {
  const labels: Record<string, string> = {
    knowledgeBase: 'Base de Conhecimento',
    timeTracking: 'Controle de Tempo',
    webhooks: 'Webhooks',
    satisfactionSurvey: 'Pesquisa de Satisfação',
    advancedReports: 'Relatórios Avançados',
    macros: 'Macros de Resposta',
    automations: 'Automacoes',
    auditExport: 'Export de Auditoria',
    scheduledReports: 'Relatorios Agendados (Email)',
    api: 'API Access',
    customDomain: 'Domínio Personalizado',
    whiteLabel: 'White Label',
  };
  return labels[feature] || feature;
}

export const checkLimits = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const user = req.user!;
  const tenantId = user.tenant._id.toString();
  
  const [agentCheck, ticketCheck] = await Promise.all([
    planService.checkAgentLimit(tenantId),
    planService.checkTicketLimit(tenantId),
  ]);
  
  res.json({
    agents: agentCheck,
    tickets: ticketCheck,
  });
};

export const upgradePlanRequest = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const { plan } = req.body;
  const user = req.user!;
  
  if (!Object.values(PlanType).includes(plan)) {
    throw new AppError('Plano inválido', 400);
  }
  
  if (plan === PlanType.FREE) {
    throw new AppError('Não é possível fazer downgrade para Free', 400);
  }
  
  // Aqui integraremos com Stripe na próxima etapa
  // Por enquanto, apenas retornamos a URL de checkout
  
  res.json({
    message: 'Redirecionando para pagamento...',
    plan,
    checkoutUrl: `/api/billing/checkout?plan=${plan}`,
  });
};

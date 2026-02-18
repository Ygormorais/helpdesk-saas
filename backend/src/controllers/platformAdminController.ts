import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.js';
import { PlanLimit, Tenant, User } from '../models/index.js';

export const listTenants = async (req: AuthRequest, res: Response): Promise<void> => {
  const pageRaw = parseInt(String(req.query.page || '1'), 10) || 1;
  const limitRaw = parseInt(String(req.query.limit || '25'), 10) || 25;
  const page = Math.max(1, pageRaw);
  const limit = Math.min(100, Math.max(1, limitRaw));
  const q = String(req.query.q || '').trim();

  const filter: any = {};
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: 'i' } },
      { slug: { $regex: q, $options: 'i' } },
      { domain: { $regex: q, $options: 'i' } },
    ];
  }

  const [total, tenants] = await Promise.all([
    Tenant.countDocuments(filter),
    Tenant.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('name slug domain isActive createdAt'),
  ]);

  const tenantIds = tenants.map((t) => t._id);

  const [planLimits, admins] = await Promise.all([
    PlanLimit.find({ tenant: { $in: tenantIds } }).select('tenant plan subscription currentUsage maxAgents maxTickets maxStorage'),
    User.find({ tenant: { $in: tenantIds }, role: 'admin' }).select('tenant email name'),
  ]);

  const planByTenant = new Map<string, any>();
  for (const p of planLimits) planByTenant.set(String(p.tenant), p);

  const adminByTenant = new Map<string, any[]>();
  for (const a of admins) {
    const key = String(a.tenant);
    const list = adminByTenant.get(key) || [];
    list.push({ id: a._id, name: a.name, email: a.email });
    adminByTenant.set(key, list);
  }

  res.json({
    data: tenants.map((t) => {
      const plan = planByTenant.get(String(t._id));
      return {
        id: t._id,
        name: t.name,
        slug: t.slug,
        domain: t.domain,
        isActive: t.isActive,
        createdAt: t.createdAt,
        admins: adminByTenant.get(String(t._id)) || [],
        billing: plan
          ? {
              plan: plan.plan,
              status: plan.subscription?.status,
              trialEndsAt: plan.subscription?.trialEndsAt,
              currentPeriodEnd: plan.subscription?.currentPeriodEnd,
              desiredPlan: plan.subscription?.desiredPlan,
              desiredPlanEffectiveAt: plan.subscription?.desiredPlanEffectiveAt,
              usage: plan.currentUsage,
              limits: {
                maxAgents: plan.maxAgents,
                maxTickets: plan.maxTickets,
                maxStorage: plan.maxStorage,
              },
            }
          : null,
      };
    }),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
};

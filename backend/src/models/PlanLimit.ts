import mongoose, { Document, Schema } from 'mongoose';

export enum PlanType {
  FREE = 'free',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

export interface IPlanLimit extends Document {
  tenant: mongoose.Types.ObjectId;
  plan: PlanType;
  maxAgents: number;
  maxTickets: number;
  maxStorage: number; // MB
  features: {
    knowledgeBase: boolean;
    timeTracking: boolean;
    webhooks: boolean;
    satisfactionSurvey: boolean;
    advancedReports: boolean;
    macros: boolean;
    automations: boolean;
    auditExport: boolean;
    scheduledReports: boolean;
    api: boolean;
    customDomain: boolean;
    whiteLabel: boolean;
  };
  currentUsage: {
    agents: number;
    tickets: number;
    storage: number;
  };

  addons?: {
    extraAgents?: number;
    extraStorage?: number; // MB
    aiCredits?: number;

    recurring?: Array<{
      addOnId: string;
      subscriptionId: string;
      status: 'active' | 'trialing' | 'past_due' | 'canceled';
      extraAgents: number;
      extraStorage: number;
      aiCredits: number;
      currentPeriodEnd?: Date;
    }>;
  };
  subscription: {
    status: 'active' | 'trialing' | 'past_due' | 'canceled';
    trialEndsAt?: Date;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    desiredPlan?: PlanType;
    desiredPlanEffectiveAt?: Date;

    trialReminderLastSentAt?: Date;
    trialReminderLastDaysLeft?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanLimitConfig {
  plan: PlanType;
  maxAgents: number;
  maxTickets: number;
  maxStorage: number;
  maxMacros: number;
  maxAutomationRules: number;
  maxReportSchedules: number;
  auditRetentionDays: number;
  features: IPlanLimit['features'];
}

export const PLAN_LIMITS: Record<PlanType, PlanLimitConfig> = {
  [PlanType.FREE]: {
    plan: PlanType.FREE,
    maxAgents: 1,
    maxTickets: 50,
    maxStorage: 100,
    maxMacros: 0,
    maxAutomationRules: 0,
    maxReportSchedules: 0,
    auditRetentionDays: 7,
    features: {
      knowledgeBase: false,
      timeTracking: false,
      webhooks: false,
      satisfactionSurvey: true,
      advancedReports: false,
      macros: false,
      automations: false,
      auditExport: false,
      scheduledReports: false,
      api: false,
      customDomain: false,
      whiteLabel: false,
    },
  },
  [PlanType.PRO]: {
    plan: PlanType.PRO,
    maxAgents: 5,
    maxTickets: -1, // ilimitado
    maxStorage: 1000,
    maxMacros: 50,
    maxAutomationRules: 20,
    maxReportSchedules: 0,
    auditRetentionDays: 90,
    features: {
      knowledgeBase: true,
      timeTracking: true,
      webhooks: false,
      satisfactionSurvey: true,
      advancedReports: true,
      macros: true,
      automations: true,
      auditExport: true,
      scheduledReports: false,
      api: false,
      customDomain: false,
      whiteLabel: false,
    },
  },
  [PlanType.ENTERPRISE]: {
    plan: PlanType.ENTERPRISE,
    maxAgents: -1, // ilimitado
    maxTickets: -1,
    maxStorage: 10000,
    maxMacros: -1,
    maxAutomationRules: -1,
    maxReportSchedules: 10,
    auditRetentionDays: 365,
    features: {
      knowledgeBase: true,
      timeTracking: true,
      webhooks: true,
      satisfactionSurvey: true,
      advancedReports: true,
      macros: true,
      automations: true,
      auditExport: true,
      scheduledReports: true,
      api: true,
      customDomain: true,
      whiteLabel: true,
    },
  },
};

const planLimitSchema = new Schema<IPlanLimit>(
  {
    tenant: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      unique: true,
    },
    plan: {
      type: String,
      enum: Object.values(PlanType),
      default: PlanType.FREE,
    },
    maxAgents: {
      type: Number,
      required: true,
    },
    maxTickets: {
      type: Number,
      required: true,
    },
    maxStorage: {
      type: Number,
      required: true,
    },
    features: {
      knowledgeBase: { type: Boolean, default: false },
      timeTracking: { type: Boolean, default: false },
      webhooks: { type: Boolean, default: false },
      satisfactionSurvey: { type: Boolean, default: true },
      advancedReports: { type: Boolean, default: false },
      macros: { type: Boolean, default: false },
      automations: { type: Boolean, default: false },
      auditExport: { type: Boolean, default: false },
      scheduledReports: { type: Boolean, default: false },
      api: { type: Boolean, default: false },
      customDomain: { type: Boolean, default: false },
      whiteLabel: { type: Boolean, default: false },
    },
    currentUsage: {
      agents: { type: Number, default: 0 },
      tickets: { type: Number, default: 0 },
      storage: { type: Number, default: 0 },
    },
    addons: {
      extraAgents: { type: Number, default: 0 },
      extraStorage: { type: Number, default: 0 },
      aiCredits: { type: Number, default: 0 },
      recurring: {
        type: [
          {
            addOnId: { type: String, required: true },
            subscriptionId: { type: String, required: true },
            status: {
              type: String,
              enum: ['active', 'trialing', 'past_due', 'canceled'],
              default: 'trialing',
            },
            extraAgents: { type: Number, default: 0 },
            extraStorage: { type: Number, default: 0 },
            aiCredits: { type: Number, default: 0 },
            currentPeriodEnd: Date,
          },
        ],
        default: [],
      },
    },
    subscription: {
      status: {
        type: String,
        enum: ['active', 'trialing', 'past_due', 'canceled'],
        default: 'trialing',
      },
      trialEndsAt: Date,
      currentPeriodStart: Date,
      currentPeriodEnd: Date,
      stripeCustomerId: String,
      stripeSubscriptionId: String,
      desiredPlan: {
        type: String,
        enum: Object.values(PlanType),
      },
      desiredPlanEffectiveAt: Date,

      trialReminderLastSentAt: Date,
      trialReminderLastDaysLeft: Number,
    },
  },
  {
    timestamps: true,
  }
);

planLimitSchema.index({ 'subscription.stripeCustomerId': 1 });

export const PlanLimit = mongoose.model<IPlanLimit>('PlanLimit', planLimitSchema);

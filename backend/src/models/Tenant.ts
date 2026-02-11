import mongoose, { Document, Schema } from 'mongoose';

export interface ITenant extends Document {
  name: string;
  slug: string;
  domain?: string;
  logo?: string;
  primaryColor: string;
  settings: {
    ticketPrefix: string;
    defaultLanguage: string;
    timezone: string;
    workingHours: {
      start: string;
      end: string;
    };
    slaResponseTime: number;
    slaResolutionTime: number;
  };
  subscription: {
    plan: 'free' | 'starter' | 'professional' | 'enterprise';
    status: 'active' | 'inactive' | 'trial' | 'cancelled';
    expiresAt?: Date;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const tenantSchema = new Schema<ITenant>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    domain: {
      type: String,
      unique: true,
      sparse: true,
    },
    logo: String,
    primaryColor: {
      type: String,
      default: '#3B82F6',
    },
    settings: {
      ticketPrefix: {
        type: String,
        default: 'TKT',
      },
      defaultLanguage: {
        type: String,
        default: 'pt-BR',
      },
      timezone: {
        type: String,
        default: 'America/Sao_Paulo',
      },
      workingHours: {
        start: {
          type: String,
          default: '09:00',
        },
        end: {
          type: String,
          default: '18:00',
        },
      },
      slaResponseTime: {
        type: Number,
        default: 4,
      },
      slaResolutionTime: {
        type: Number,
        default: 24,
      },
    },
    subscription: {
      plan: {
        type: String,
        enum: ['free', 'starter', 'professional', 'enterprise'],
        default: 'free',
      },
      status: {
        type: String,
        enum: ['active', 'inactive', 'trial', 'cancelled'],
        default: 'trial',
      },
      expiresAt: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

tenantSchema.index({ slug: 1 });
tenantSchema.index({ domain: 1 });

export const Tenant = mongoose.model<ITenant>('Tenant', tenantSchema);

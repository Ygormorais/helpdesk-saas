import mongoose, { Document, Schema } from 'mongoose';

export type AutomationTrigger = 'ticket.created';

export interface IAutomationRule extends Document {
  tenant: mongoose.Types.ObjectId;
  name: string;
  isActive: boolean;
  trigger: AutomationTrigger;
  conditions: {
    category?: mongoose.Types.ObjectId;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
  };
  actions: {
    assignTo?: mongoose.Types.ObjectId;
    setStatus?: 'open' | 'in_progress';
  };
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const automationRuleSchema = new Schema<IAutomationRule>(
  {
    tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    isActive: { type: Boolean, default: true, index: true },
    trigger: { type: String, required: true, enum: ['ticket.created'], index: true },
    conditions: {
      category: { type: Schema.Types.ObjectId, ref: 'Category' },
      priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'] },
    },
    actions: {
      assignTo: { type: Schema.Types.ObjectId, ref: 'User' },
      setStatus: { type: String, enum: ['open', 'in_progress'] },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

automationRuleSchema.index({ tenant: 1, trigger: 1, isActive: 1, createdAt: 1 });

export const AutomationRule = mongoose.model<IAutomationRule>('AutomationRule', automationRuleSchema);

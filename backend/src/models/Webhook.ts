import mongoose, { Document, Schema } from 'mongoose';

export interface IWebhook extends Document {
  name: string;
  url: string;
  secret: string;
  events: string[];
  tenant: mongoose.Types.ObjectId;
  isActive: boolean;
  headers: Map<string, string>;
  failureCount: number;
  lastTriggeredAt?: Date;
  lastFailedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const webhookSchema = new Schema<IWebhook>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
        validate: {
          validator: (v: string) => /^https?:\/\/.+/.test(v),
          message: 'Formato de URL invalido',
        },
      },
    secret: {
      type: String,
      required: true,
    },
    events: [{
      type: String,
      enum: [
        'ticket.created',
        'ticket.updated',
        'ticket.status_changed',
        'ticket.assigned',
        'ticket.resolved',
        'ticket.closed',
        'comment.created',
        'comment.internal',
        'user.invited',
        'user.registered',
      ],
    }],
    tenant: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    headers: {
      type: Map,
      of: String,
    },
    failureCount: {
      type: Number,
      default: 0,
    },
    lastTriggeredAt: Date,
    lastFailedAt: Date,
  },
  {
    timestamps: true,
  }
);

webhookSchema.index({ tenant: 1, isActive: 1 });

export const Webhook = mongoose.model<IWebhook>('Webhook', webhookSchema);

import mongoose, { Document, Schema } from 'mongoose';

export type WebhookProvider = 'asaas';

export interface IWebhookEvent extends Document {
  provider: WebhookProvider;
  eventId: string;
  tenant?: mongoose.Types.ObjectId;
  event?: string;
  resourceId?: string;
  status?: 'received' | 'processed' | 'duplicate' | 'unauthorized' | 'error';
  error?: string;
  receivedAt: Date;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const webhookEventSchema = new Schema<IWebhookEvent>(
  {
    provider: {
      type: String,
      enum: ['asaas'],
      required: true,
    },
    eventId: {
      type: String,
      required: true,
      trim: true,
    },
    tenant: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: false,
    },
    event: {
      type: String,
      required: false,
      trim: true,
    },
    resourceId: {
      type: String,
      required: false,
      trim: true,
    },
    status: {
      type: String,
      enum: ['received', 'processed', 'duplicate', 'unauthorized', 'error'],
      default: 'received',
      required: true,
    },
    error: {
      type: String,
      required: false,
      trim: true,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    processedAt: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

webhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });
webhookEventSchema.index({ tenant: 1, receivedAt: -1 });

export const WebhookEvent = mongoose.model<IWebhookEvent>('WebhookEvent', webhookEventSchema);

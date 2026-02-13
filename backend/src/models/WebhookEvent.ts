import mongoose, { Document, Schema } from 'mongoose';

export type WebhookProvider = 'asaas';

export interface IWebhookEvent extends Document {
  provider: WebhookProvider;
  eventId: string;
  processedAt: Date;
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
    processedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

webhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });

export const WebhookEvent = mongoose.model<IWebhookEvent>('WebhookEvent', webhookEventSchema);

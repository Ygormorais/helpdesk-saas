import mongoose, { Document, Schema } from 'mongoose';

export enum NotificationType {
  TICKET_CREATED = 'TICKET_CREATED',
  TICKET_UPDATED = 'TICKET_UPDATED',
  TICKET_ASSIGNED = 'TICKET_ASSIGNED',
  TICKET_RESOLVED = 'TICKET_RESOLVED',
  COMMENT_CREATED = 'COMMENT_CREATED',
  CHAT_MESSAGE = 'CHAT_MESSAGE',
}

export interface INotification extends Document {
  tenant: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, any>;
  ticket?: mongoose.Types.ObjectId;
  chat?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  readBy: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    tenant: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ticket: {
      type: Schema.Types.ObjectId,
      ref: 'Ticket',
      index: true,
    },
    chat: {
      type: Schema.Types.ObjectId,
      ref: 'Chat',
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    readBy: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: [],
    }],
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ tenant: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);

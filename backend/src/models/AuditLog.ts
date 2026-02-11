import mongoose, { Document, Schema } from 'mongoose';

export enum AuditAction {
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
  TICKET_CREATED = 'ticket.created',
  TICKET_UPDATED = 'ticket.updated',
  TICKET_DELETED = 'ticket.deleted',
  TICKET_ASSIGNED = 'ticket.assigned',
  TICKET_STATUS_CHANGED = 'ticket.status_changed',
  TICKET_RESOLVED = 'ticket.resolved',
  COMMENT_CREATED = 'comment.created',
  COMMENT_UPDATED = 'comment.updated',
  COMMENT_DELETED = 'comment.deleted',
  CATEGORY_CREATED = 'category.created',
  CATEGORY_UPDATED = 'category.updated',
  CATEGORY_DELETED = 'category.deleted',
  ARTICLE_CREATED = 'article.created',
  ARTICLE_UPDATED = 'article.updated',
  ARTICLE_DELETED = 'article.deleted',
  WEBHOOK_CREATED = 'webhook.created',
  WEBHOOK_UPDATED = 'webhook.updated',
  WEBHOOK_DELETED = 'webhook.deleted',
  INVITE_SENT = 'invite.sent',
  INVITE_ACCEPTED = 'invite.accepted',
  INVITE_CANCELLED = 'invite.cancelled',
  SETTINGS_UPDATED = 'settings.updated',
}

export interface IAuditLog extends Document {
  action: AuditAction;
  user: mongoose.Types.ObjectId;
  tenant: mongoose.Types.ObjectId;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    action: {
      type: String,
      enum: Object.values(AuditAction),
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tenant: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    resource: {
      type: String,
      required: true,
    },
    resourceId: String,
    details: {
      type: Map,
      of: Schema.Types.Mixed,
    },
    ip: String,
    userAgent: String,
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

auditLogSchema.index({ tenant: 1, createdAt: -1 });
auditLogSchema.index({ tenant: 1, action: 1 });
auditLogSchema.index({ tenant: 1, user: 1 });
auditLogSchema.index({ resource: 1, resourceId: 1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);

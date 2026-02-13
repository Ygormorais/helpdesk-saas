import mongoose, { Document, Schema } from 'mongoose';

export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  WAITING_CUSTOMER = 'waiting_customer',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface ITicket extends Document {
  ticketNumber: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: mongoose.Types.ObjectId;
  tenant: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId;
  tags: string[];
  attachments: {
    filename: string;
    url: string;
    mimeType: string;
    size: number;
    uploadedAt: Date;
  }[];
  sla: {
    responseDue: Date;
    resolutionDue: Date;
    firstResponseAt?: Date;
    resolvedAt?: Date;
    pausedAt?: Date;
    pausedMs: number;
  };

  // OLA (internal agreement) - starts when ticket is owned/assigned
  ola?: {
    ownDue?: Date;
    resolutionDue?: Date;
    ownedAt?: Date;
    resolvedAt?: Date;
    pausedAt?: Date;
    pausedMs: number;
  };
  satisfaction?: {
    rating: number;
    comment?: string;
    createdAt: Date;
  };
  metadata: {
    source: 'email' | 'chat' | 'portal' | 'api';
    userAgent?: string;
    ip?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ticketSchema = new Schema<ITicket>(
  {
    ticketNumber: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(TicketStatus),
      default: TicketStatus.OPEN,
    },
    priority: {
      type: String,
      enum: Object.values(TicketPriority),
      default: TicketPriority.MEDIUM,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    tenant: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    tags: [{
      type: String,
      trim: true,
    }],
    attachments: [{
      filename: String,
      url: String,
      mimeType: String,
      size: Number,
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    sla: {
      responseDue: {
        type: Date,
        required: true,
      },
      resolutionDue: {
        type: Date,
        required: true,
      },
      firstResponseAt: Date,
      resolvedAt: Date,
      pausedAt: Date,
      pausedMs: {
        type: Number,
        default: 0,
      },
    },
    ola: {
      ownDue: Date,
      resolutionDue: Date,
      ownedAt: Date,
      resolvedAt: Date,
      pausedAt: Date,
      pausedMs: {
        type: Number,
        default: 0,
      },
    },
    satisfaction: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      comment: String,
      createdAt: Date,
    },
    metadata: {
      source: {
        type: String,
        enum: ['email', 'chat', 'portal', 'api'],
        default: 'portal',
      },
      userAgent: String,
      ip: String,
    },
  },
  {
    timestamps: true,
  }
);

ticketSchema.index({ tenant: 1, ticketNumber: 1 }, { unique: true });
ticketSchema.index({ tenant: 1, status: 1 });
ticketSchema.index({ tenant: 1, createdBy: 1 });
ticketSchema.index({ assignedTo: 1 });

export const Ticket = mongoose.model<ITicket>('Ticket', ticketSchema);

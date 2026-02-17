import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  chat: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  content: string;
  attachments: {
    filename: string;
    url: string;
    mimeType: string;
    size: number;
  }[];
  readBy: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IChat extends Document {
  tenant: mongoose.Types.ObjectId;
  participants: mongoose.Types.ObjectId[];
  ticket?: mongoose.Types.ObjectId;
  scope?: 'ticket' | 'internal';
  type?: 'dm' | 'channel';
  name?: string;
  channelKey?: string;
  isDefault?: boolean;
  status: 'active' | 'closed';
  lastMessage?: IMessage;
  unreadCount: Map<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    chat: {
      type: Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    attachments: [{
      filename: String,
      url: String,
      mimeType: String,
      size: Number,
    }],
    readBy: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ chat: 1, createdAt: -1 });

const chatSchema = new Schema<IChat>(
  {
    tenant: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    participants: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    }],
    ticket: {
      type: Schema.Types.ObjectId,
      ref: 'Ticket',
    },
    scope: {
      type: String,
      enum: ['ticket', 'internal'],
      required: false,
    },
    type: {
      type: String,
      enum: ['dm', 'channel'],
      required: false,
    },
    name: {
      type: String,
      trim: true,
      required: false,
    },
    channelKey: {
      type: String,
      trim: true,
      lowercase: true,
      required: false,
    },
    isDefault: {
      type: Boolean,
      required: false,
      default: false,
    },
    status: {
      type: String,
      enum: ['active', 'closed'],
      default: 'active',
    },
    unreadCount: {
      type: Map,
      of: Number,
      default: new Map(),
    },
  },
  {
    timestamps: true,
  }
);

chatSchema.index({ tenant: 1, status: 1 });
chatSchema.index({ tenant: 1, participants: 1 });
chatSchema.index({ ticket: 1 });
chatSchema.index({ tenant: 1, scope: 1, type: 1, status: 1 });
chatSchema.index({ tenant: 1, scope: 1, channelKey: 1 }, { unique: false });

export const Message = mongoose.model<IMessage>('Message', messageSchema);
export const Chat = mongoose.model<IChat>('Chat', chatSchema);

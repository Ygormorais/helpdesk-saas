import mongoose, { Document, Schema } from 'mongoose';

export enum CommentType {
  NOTE = 'note',
  REPLY = 'reply',
  SYSTEM = 'system',
}

export interface IComment extends Document {
  ticket: mongoose.Types.ObjectId;
  tenant: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  content: string;
  type: CommentType;
  isInternal: boolean;
  attachments: {
    filename: string;
    url: string;
    mimeType: string;
    size: number;
    uploadedAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    ticket: {
      type: Schema.Types.ObjectId,
      ref: 'Ticket',
      required: true,
    },
    tenant: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(CommentType),
      default: CommentType.REPLY,
    },
    isInternal: {
      type: Boolean,
      default: false,
    },
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
  },
  {
    timestamps: true,
  }
);

commentSchema.index({ ticket: 1, createdAt: -1 });

export const Comment = mongoose.model<IComment>('Comment', commentSchema);

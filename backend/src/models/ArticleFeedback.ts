import mongoose, { Document, Schema } from 'mongoose';

export interface IArticleFeedback extends Document {
  tenant: mongoose.Types.ObjectId;
  article: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  helpful: boolean;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

const articleFeedbackSchema = new Schema<IArticleFeedback>(
  {
    tenant: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    article: {
      type: Schema.Types.ObjectId,
      ref: 'Article',
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    helpful: {
      type: Boolean,
      required: true,
      index: true,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

articleFeedbackSchema.index({ tenant: 1, article: 1, user: 1 }, { unique: true });

export const ArticleFeedback = mongoose.model<IArticleFeedback>('ArticleFeedback', articleFeedbackSchema);

import mongoose, { Document, Schema } from 'mongoose';

export interface IArticle extends Document {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  category: mongoose.Types.ObjectId;
  tenant: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  tags: string[];
  isPublished: boolean;
  views: number;
  helpful: {
    yes: number;
    no: number;
  };
  relatedTickets: mongoose.Types.ObjectId[];
  seo: {
    metaTitle?: string;
    metaDescription?: string;
  };

  ai?: {
    embedding?: number[];
    embeddingModel?: string;
    embeddedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const articleSchema = new Schema<IArticle>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    content: {
      type: String,
      required: true,
    },
    excerpt: {
      type: String,
      maxlength: 300,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
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
    tags: [{
      type: String,
      trim: true,
    }],
    isPublished: {
      type: Boolean,
      default: false,
    },
    views: {
      type: Number,
      default: 0,
    },
    helpful: {
      yes: {
        type: Number,
        default: 0,
      },
      no: {
        type: Number,
        default: 0,
      },
    },
    relatedTickets: [{
      type: Schema.Types.ObjectId,
      ref: 'Ticket',
    }],
    seo: {
      metaTitle: String,
      metaDescription: String,
    },

    ai: {
      embedding: [{ type: Number }],
      embeddingModel: { type: String, trim: true },
      embeddedAt: Date,
    },
  },
  {
    timestamps: true,
  }
);

articleSchema.pre('save', function (next) {
  if (this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

articleSchema.index({ tenant: 1, slug: 1 });
articleSchema.index({ tenant: 1, isPublished: 1 });
articleSchema.index({ category: 1 });
articleSchema.index({ tags: 1 });
articleSchema.index({ 'ai.embeddingModel': 1 });

export const Article = mongoose.model<IArticle>('Article', articleSchema);

import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  description?: string;
  color: string;
  icon?: string;
  parent?: mongoose.Types.ObjectId;
  tenant: mongoose.Types.ObjectId;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    color: {
      type: String,
      default: '#6B7280',
    },
    icon: String,
    parent: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
    },
    tenant: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

categorySchema.index({ tenant: 1, parent: 1 });
categorySchema.index({ tenant: 1, order: 1 });

export const Category = mongoose.model<ICategory>('Category', categorySchema);

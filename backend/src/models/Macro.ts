import mongoose, { Document, Schema } from 'mongoose';

export interface IMacro extends Document {
  tenant: mongoose.Types.ObjectId;
  name: string;
  content: string;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const macroSchema = new Schema<IMacro>(
  {
    tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    content: { type: String, required: true, trim: true, maxlength: 5000 },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

macroSchema.index({ tenant: 1, name: 1 });

export const Macro = mongoose.model<IMacro>('Macro', macroSchema);

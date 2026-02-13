import mongoose, { Document, Schema } from 'mongoose';

export interface IInvite extends Document {
  email: string;
  role: string;
  tenant: mongoose.Types.ObjectId;
  invitedBy: mongoose.Types.ObjectId;
  token: string;
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const inviteSchema = new Schema<IInvite>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      required: true,
      enum: ['admin', 'manager', 'agent', 'client'],
    },
    tenant: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'expired', 'cancelled'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

inviteSchema.index({ email: 1, tenant: 1 });

export const Invite = mongoose.model<IInvite>('Invite', inviteSchema);

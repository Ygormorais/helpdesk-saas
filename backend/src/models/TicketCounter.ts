import mongoose, { Document, Schema } from 'mongoose';

export interface ITicketCounter extends Document {
  tenant: mongoose.Types.ObjectId;
  seq: number;
  createdAt: Date;
  updatedAt: Date;
}

const ticketCounterSchema = new Schema<ITicketCounter>(
  {
    tenant: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      unique: true,
    },
    seq: {
      type: Number,
      default: 0,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const TicketCounter = mongoose.model<ITicketCounter>('TicketCounter', ticketCounterSchema);

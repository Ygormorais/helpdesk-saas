import mongoose, { Document, Schema } from 'mongoose';

export interface ITimeEntry extends Document {
  ticket: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  tenant: mongoose.Types.ObjectId;
  description: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  isBillable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const timeEntrySchema = new Schema<ITimeEntry>(
  {
    ticket: {
      type: Schema.Types.ObjectId,
      ref: 'Ticket',
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
    description: {
      type: String,
      trim: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
    },
    duration: {
      type: Number,
      default: 0,
    },
    isBillable: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

timeEntrySchema.index({ tenant: 1, ticket: 1 });
timeEntrySchema.index({ tenant: 1, user: 1 });
timeEntrySchema.index({ tenant: 1, startTime: -1 });
timeEntrySchema.index({ ticket: 1, user: 1 });

timeEntrySchema.pre('save', function (next) {
  if (this.endTime && this.startTime) {
    this.duration = this.endTime.getTime() - this.startTime.getTime();
  }
  next();
});

export const TimeEntry = mongoose.model<ITimeEntry>('TimeEntry', timeEntrySchema);

import mongoose, { Document, Schema } from 'mongoose';

export type ReportScheduleFrequency = 'daily' | 'weekly';

export interface IReportSchedule extends Document {
  tenant: mongoose.Types.ObjectId;
  name: string;
  isActive: boolean;
  frequency: ReportScheduleFrequency;
  hour: number; // 0-23
  dayOfWeek?: number; // 0-6 (Sun-Sat) for weekly
  recipients: string[];
  params: {
    days?: number;
    startDate?: string;
    endDate?: string;
  };
  nextRunAt: Date;
  lastRunAt?: Date;
  lastError?: string;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const reportScheduleSchema = new Schema<IReportSchedule>(
  {
    tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    isActive: { type: Boolean, default: true, index: true },
    frequency: { type: String, required: true, enum: ['daily', 'weekly'], index: true },
    hour: { type: Number, required: true, min: 0, max: 23 },
    dayOfWeek: { type: Number, min: 0, max: 6 },
    recipients: { type: [String], default: [] },
    params: {
      days: Number,
      startDate: String,
      endDate: String,
    },
    nextRunAt: { type: Date, required: true, index: true },
    lastRunAt: Date,
    lastError: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

reportScheduleSchema.index({ tenant: 1, isActive: 1, nextRunAt: 1 });

export const ReportSchedule = mongoose.model<IReportSchedule>('ReportSchedule', reportScheduleSchema);

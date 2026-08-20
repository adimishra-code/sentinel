import mongoose, { Document, Schema } from 'mongoose';
import { AppealStatus } from '../../types';

export interface IAppeal extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  caseId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  reason: string;
  status: AppealStatus;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  outcome?: string;
  outcomeRationale?: string;
  createdAt: Date;
  updatedAt: Date;
}

const appealSchema = new Schema<IAppeal>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    caseId: {
      type: Schema.Types.ObjectId,
      ref: 'Case',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reason: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: Object.values(AppealStatus),
      default: AppealStatus.PENDING,
      index: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    outcome: {
      type: String,
    },
    outcomeRationale: {
      type: String,
      maxlength: 5000,
    },
  },
  {
    timestamps: true,
    collection: 'appeals',
  }
);

appealSchema.index({ caseId: 1, organizationId: 1 });
appealSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
appealSchema.index({ userId: 1, organizationId: 1 });

export const Appeal = mongoose.model<IAppeal>('Appeal', appealSchema);

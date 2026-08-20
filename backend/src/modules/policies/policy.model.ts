import mongoose, { Document, Schema } from 'mongoose';
import { PolicyStatus } from '../../types';

export interface IPolicyCategory {
  id: string;
  name: string;
  description?: string;
  severityThreshold: number; // 0-1
  firstOffenseAction: string; // ModerationAction
  repeatOffenseAction: string;
  requiresHumanReview: boolean;
}

export interface IPolicy extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  status: PolicyStatus;
  currentVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPolicyVersion extends Document {
  _id: mongoose.Types.ObjectId;
  policyId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  version: number;
  categories: IPolicyCategory[];
  rules: Record<string, unknown>;
  effectiveFrom: Date;
  effectiveUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const policySchema = new Schema<IPolicy>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(PolicyStatus),
      default: PolicyStatus.DRAFT,
      index: true,
    },
    currentVersion: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
    collection: 'policies',
  }
);

policySchema.index({ organizationId: 1, status: 1 });
policySchema.index({ organizationId: 1, createdAt: -1 });

const policyVersionSchema = new Schema<IPolicyVersion>(
  {
    policyId: {
      type: Schema.Types.ObjectId,
      ref: 'Policy',
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    version: {
      type: Number,
      required: true,
    },
    categories: {
      type: [
        {
          id: String,
          name: String,
          description: String,
          severityThreshold: Number,
          firstOffenseAction: String,
          repeatOffenseAction: String,
          requiresHumanReview: Boolean,
        },
      ],
      required: true,
    },
    rules: {
      type: Schema.Types.Mixed,
      default: {},
    },
    effectiveFrom: {
      type: Date,
      required: true,
      default: Date.now,
    },
    effectiveUntil: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: 'policy_versions',
  }
);

policyVersionSchema.index({ policyId: 1, version: -1 });
policyVersionSchema.index({ organizationId: 1, createdAt: -1 });
policyVersionSchema.index({ policyId: 1, version: 1 }, { unique: true });

export const Policy = mongoose.model<IPolicy>('Policy', policySchema);
export const PolicyVersion = mongoose.model<IPolicyVersion>('PolicyVersion', policyVersionSchema);

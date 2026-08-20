import mongoose, { Document, Schema } from 'mongoose';
import { ModerationAction } from '../../types';

export interface IModerationDecision extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  caseId: mongoose.Types.ObjectId;
  moderatorId: mongoose.Types.ObjectId;
  action: ModerationAction;
  rationale: string;
  policyVersionId?: mongoose.Types.ObjectId;
  confidence?: number;
  aiRecommendation?: string;
  evidence?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const moderationDecisionSchema = new Schema<IModerationDecision>(
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
    moderatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ['allow', 'allow_and_monitor', 'warn', 'limit', 'remove', 'review', 'escalate', 'suspend'],
      required: true,
    },
    rationale: {
      type: String,
      required: true,
    },
    policyVersionId: {
      type: Schema.Types.ObjectId,
      ref: 'PolicyVersion',
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
    },
    aiRecommendation: {
      type: String,
    },
    evidence: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    collection: 'moderation_decisions',
  }
);

moderationDecisionSchema.index({ caseId: 1, organizationId: 1 });
moderationDecisionSchema.index({ organizationId: 1, moderatorId: 1, createdAt: -1 });
moderationDecisionSchema.index({ organizationId: 1, action: 1, createdAt: -1 });

export const ModerationDecision = mongoose.model<IModerationDecision>(
  'ModerationDecision',
  moderationDecisionSchema
);

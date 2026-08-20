import mongoose, { Document, Schema } from 'mongoose';
import { CaseStatus, CasePriority } from '../../types';

export interface ICase extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  contentId: mongoose.Types.ObjectId;
  status: CaseStatus;
  priority: CasePriority;
  severity?: number;
  riskScore: number;
  categories: string[];
  assignedTo?: mongoose.Types.ObjectId;
  assignedAt?: Date;
  resolvedAt?: Date;
  resolvedBy?: mongoose.Types.ObjectId;
  aiAnalysis?: {
    model?: string;
    overallSeverity?: number;
    overallConfidence?: number;
    contextualFindings?: string;
    recommendedAction?: string;
    uncertainty?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const caseSchema = new Schema<ICase>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    contentId: {
      type: Schema.Types.ObjectId,
      ref: 'Content',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'in_review', 'resolved', 'escalated', 'dismissed'],
      default: 'pending',
      index: true,
    },
    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium',
      index: true,
    },
    severity: {
      type: Number,
      min: 0,
      max: 1,
    },
    riskScore: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    categories: {
      type: [String],
      default: [],
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    assignedAt: {
      type: Date,
    },
    resolvedAt: {
      type: Date,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    aiAnalysis: {
      model: String,
      overallSeverity: Number,
      overallConfidence: Number,
      contextualFindings: String,
      recommendedAction: String,
      uncertainty: String,
    },
  },
  {
    timestamps: true,
    collection: 'cases',
  }
);

// Indexes for case queue queries
caseSchema.index({ organizationId: 1, status: 1, priority: -1, createdAt: -1 });
caseSchema.index({ organizationId: 1, assignedTo: 1, status: 1 });
caseSchema.index({ contentId: 1, organizationId: 1 });
caseSchema.index({ organizationId: 1, severity: 1 });

export const Case = mongoose.model<ICase>('Case', caseSchema);

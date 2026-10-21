import mongoose, { Document, Schema } from 'mongoose';

export interface IEvaluationRun extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  dataset: string;
  totalCases: number;
  threshold: number;
  path: string; // 'heuristics' | 'heuristics+llm'
  report: Record<string, unknown>;
  createdAt: Date;
}

const evaluationRunSchema = new Schema<IEvaluationRun>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    dataset: {
      type: String,
      required: true,
    },
    totalCases: {
      type: Number,
      required: true,
    },
    threshold: {
      type: Number,
      required: true,
    },
    path: {
      type: String,
      required: true,
    },
    report: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: true, collection: 'evaluation_runs' }
);

export const EvaluationRun = mongoose.model<IEvaluationRun>(
  'EvaluationRun',
  evaluationRunSchema
);

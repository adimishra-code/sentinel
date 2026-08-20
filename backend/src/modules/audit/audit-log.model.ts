import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  action: string;
  actorId: string;
  actorType: 'user' | 'system' | 'api_key';
  entityType: string;
  entityId: string;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    actorId: {
      type: String,
      required: true,
      index: true,
    },
    actorType: {
      type: String,
      enum: ['user', 'system', 'api_key'],
      required: true,
    },
    entityType: {
      type: String,
      required: true,
      index: true,
    },
    entityId: {
      type: String,
      required: true,
      index: true,
    },
    changes: {
      type: Schema.Types.Mixed,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'audit_logs',
  }
);

// Indexes for audit queries
auditLogSchema.index({ organizationId: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, organizationId: 1 });
auditLogSchema.index({ actorId: 1, organizationId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, organizationId: 1, createdAt: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);

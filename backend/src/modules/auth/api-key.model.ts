import mongoose, { Document, Schema } from 'mongoose';

export interface IApiKey extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  name: string;
  keyHash: string;
  keyPrefix: string;
  status: 'active' | 'revoked';
  permissions: string[];
  expiresAt?: Date;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const apiKeySchema = new Schema<IApiKey>(
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
    keyHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    keyPrefix: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'revoked'],
      default: 'active',
      index: true,
    },
    permissions: {
      type: [String],
      required: true,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    lastUsedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: 'api_keys',
  }
);

// Indexes
apiKeySchema.index({ keyHash: 1 }, { unique: true });
apiKeySchema.index({ organizationId: 1, status: 1 });
apiKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });

export const ApiKey = mongoose.model<IApiKey>('ApiKey', apiKeySchema);

import mongoose, { Document, Schema } from 'mongoose';
import { UserRole } from '../../types';

export interface IOrganizationMember extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: UserRole;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

const organizationMemberSchema = new Schema<IOrganizationMember>(
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
    role: {
      type: String,
      enum: Object.values(UserRole),
      required: true,
      index: true,
    },
    permissions: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: 'organization_members',
  }
);

// Indexes
organizationMemberSchema.index({ organizationId: 1, userId: 1 }, { unique: true });
organizationMemberSchema.index({ userId: 1 });
organizationMemberSchema.index({ organizationId: 1, role: 1 });

export const OrganizationMember = mongoose.model<IOrganizationMember>(
  'OrganizationMember',
  organizationMemberSchema
);

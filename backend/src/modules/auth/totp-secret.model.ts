import mongoose, { Document, Schema } from 'mongoose';

export interface ITotpSecret extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  encryptedSecret: string; // AES-256-GCM encrypted TOTP secret (base64)
  iv: string; // initialization vector (base64)
  enabled: boolean;
  recoveryCodes: string[]; // SHA-256 hashed recovery codes
  createdAt: Date;
  updatedAt: Date;
}

const totpSecretSchema = new Schema<ITotpSecret>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    encryptedSecret: {
      type: String,
      required: true,
    },
    iv: {
      type: String,
      required: true,
    },
    enabled: {
      type: Boolean,
      default: false,
    },
    recoveryCodes: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: 'totp_secrets',
  }
);

export const TotpSecret = mongoose.model<ITotpSecret>('TotpSecret', totpSecretSchema);

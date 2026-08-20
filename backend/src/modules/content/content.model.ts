import mongoose, { Document, Schema } from 'mongoose';
import { ContentType } from '../../types';

export interface IContent extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  contentType: ContentType;
  text?: string;
  imageUrls?: string[];
  urls?: string[];
  metadata?: Record<string, unknown>;
  authorId?: string;
  targetId?: string;
  conversationId?: string;
  sourcePlatform?: string;
  language?: string;
  preprocessed?: {
    normalizedText?: string;
    detectedLanguage?: string;
    urlCount?: number;
    hasRepeatedChars?: boolean;
    hasAllCaps?: boolean;
    wordCount?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const contentSchema = new Schema<IContent>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    contentType: {
      type: String,
      enum: ['text', 'image', 'url', 'mixed'],
      required: true,
      index: true,
    },
    text: {
      type: String,
      maxlength: 50000,
    },
    imageUrls: {
      type: [String],
      default: [],
    },
    urls: {
      type: [String],
      default: [],
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    authorId: {
      type: String,
      index: true,
    },
    targetId: {
      type: String,
      index: true,
    },
    conversationId: {
      type: String,
      index: true,
    },
    sourcePlatform: {
      type: String,
    },
    language: {
      type: String,
    },
    preprocessed: {
      normalizedText: String,
      detectedLanguage: String,
      urlCount: Number,
      hasRepeatedChars: Boolean,
      hasAllCaps: Boolean,
      wordCount: Number,
    },
  },
  {
    timestamps: true,
    collection: 'content',
  }
);

// Indexes
contentSchema.index({ organizationId: 1, createdAt: -1 });
contentSchema.index({ authorId: 1, organizationId: 1 });
contentSchema.index({ conversationId: 1, organizationId: 1 });
contentSchema.index({ organizationId: 1, contentType: 1 });

export const Content = mongoose.model<IContent>('Content', contentSchema);

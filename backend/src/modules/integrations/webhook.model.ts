import mongoose, { Document, Schema } from 'mongoose';

export type WebhookEvent =
  | 'case.created'
  | 'case.resolved'
  | 'case.escalated'
  | 'appeal.submitted'
  | 'appeal.resolved'
  | 'content.flagged';

export interface IWebhook extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  name: string;
  url: string;
  secret: string; // For HMAC signing
  events: WebhookEvent[];
  active: boolean;
  failureCount: number;
  lastDeliveryAt?: Date;
  lastDeliveryStatus?: 'success' | 'failure';
  createdAt: Date;
  updatedAt: Date;
}

export interface IWebhookDelivery extends Document {
  _id: mongoose.Types.ObjectId;
  webhookId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  event: WebhookEvent;
  payload: Record<string, unknown>;
  statusCode?: number;
  responseBody?: string;
  success: boolean;
  attemptCount: number;
  deliveredAt?: Date;
  createdAt: Date;
}

const webhookSchema = new Schema<IWebhook>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true },
    secret: { type: String, required: true, select: false },
    events: { type: [String], required: true },
    active: { type: Boolean, default: true },
    failureCount: { type: Number, default: 0 },
    lastDeliveryAt: { type: Date },
    lastDeliveryStatus: { type: String, enum: ['success', 'failure'] },
  },
  { timestamps: true, collection: 'webhooks' }
);

const webhookDeliverySchema = new Schema<IWebhookDelivery>(
  {
    webhookId: { type: Schema.Types.ObjectId, ref: 'Webhook', required: true, index: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    event: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    statusCode: { type: Number },
    responseBody: { type: String },
    success: { type: Boolean, required: true },
    attemptCount: { type: Number, default: 1 },
    deliveredAt: { type: Date },
  },
  { timestamps: true, collection: 'webhook_deliveries' }
);

webhookDeliverySchema.index({ webhookId: 1, createdAt: -1 });

export const Webhook = mongoose.model<IWebhook>('Webhook', webhookSchema);
export const WebhookDelivery = mongoose.model<IWebhookDelivery>('WebhookDelivery', webhookDeliverySchema);

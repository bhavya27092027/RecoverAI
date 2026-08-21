import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IWebhookEvent extends Document {
  _id: mongoose.Types.ObjectId;
  eventId: string;
  eventType: string;
  provider: string;
  merchantId?: mongoose.Types.ObjectId | null;
  transactionId?: mongoose.Types.ObjectId | null;
  payload: Record<string, any>;
  processedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WebhookEventSchema = new Schema<IWebhookEvent>(
  {
    eventId: {
      type: String,
      required: [true, 'Event ID is required'],
      unique: true,
      trim: true,
    },
    eventType: {
      type: String,
      required: [true, 'Event type is required'],
      index: true,
      trim: true,
    },
    provider: {
      type: String,
      default: 'RAZORPAY',
      index: true,
      trim: true,
    },
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'Merchant',
      default: null,
      index: true,
    },
    transactionId: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
      default: null,
      index: true,
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    processedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

WebhookEventSchema.index({ provider: 1, eventType: 1 });

export const WebhookEvent: Model<IWebhookEvent> =
  mongoose.models.WebhookEvent ||
  mongoose.model<IWebhookEvent>('WebhookEvent', WebhookEventSchema);

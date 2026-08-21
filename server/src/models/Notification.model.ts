import mongoose, { Document, Schema, Model } from 'mongoose';

export type NotificationType =
  | 'HIGH_VALUE_OPPORTUNITY'
  | 'RECOVERY_SUCCESS'
  | 'RECOVERY_FAILED'
  | 'FAILURE_SPIKE'
  | 'AUTONOMOUS_MILESTONE'
  | 'SYSTEM_NOTICE';

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  merchantId: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  readAt?: Date | null;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'Merchant',
      required: [true, 'Merchant ID is required'],
      index: true,
    },
    type: {
      type: String,
      enum: [
        'HIGH_VALUE_OPPORTUNITY',
        'RECOVERY_SUCCESS',
        'RECOVERY_FAILED',
        'FAILURE_SPIKE',
        'AUTONOMOUS_MILESTONE',
        'SYSTEM_NOTICE',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    link: {
      type: String,
      default: '',
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id;
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

NotificationSchema.index({ merchantId: 1, createdAt: -1 });
NotificationSchema.index({ merchantId: 1, isRead: 1 });

export const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>('Notification', NotificationSchema);

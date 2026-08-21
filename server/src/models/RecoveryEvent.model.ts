import mongoose, { Document, Schema, Model } from 'mongoose';

export type RecoveryEventType =
  | 'ANALYSIS_SELECTED'
  | 'RECOVERY_STARTED'
  | 'ACTION_SELECTED'
  | 'RETRY_INITIATED'
  | 'PAYMENT_LINK_GENERATED'
  | 'ALTERNATE_METHOD_SELECTED'
  | 'PAYMENT_PROCESSING'
  | 'PAYMENT_RECOVERED'
  | 'RECOVERY_FAILED'
  | 'RECOVERY_SKIPPED';

export interface IRecoveryEvent extends Document {
  _id: mongoose.Types.ObjectId;
  merchantId: mongoose.Types.ObjectId;
  transactionId: mongoose.Types.ObjectId;
  recoveryAttemptId?: mongoose.Types.ObjectId | null;
  eventType: RecoveryEventType;
  message: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RecoveryEventSchema = new Schema<IRecoveryEvent>(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'Merchant',
      required: [true, 'Merchant ID is required'],
      index: true,
    },
    transactionId: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
      required: [true, 'Transaction ID is required'],
      index: true,
    },
    recoveryAttemptId: {
      type: Schema.Types.ObjectId,
      ref: 'RecoveryAttempt',
      default: null,
      index: true,
    },
    eventType: {
      type: String,
      enum: [
        'ANALYSIS_SELECTED',
        'RECOVERY_STARTED',
        'ACTION_SELECTED',
        'RETRY_INITIATED',
        'PAYMENT_LINK_GENERATED',
        'ALTERNATE_METHOD_SELECTED',
        'PAYMENT_PROCESSING',
        'PAYMENT_RECOVERED',
        'RECOVERY_FAILED',
        'RECOVERY_SKIPPED',
      ],
      required: [true, 'Event type is required'],
      index: true,
    },
    message: {
      type: String,
      required: [true, 'Event message is required'],
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
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

RecoveryEventSchema.index({ transactionId: 1, timestamp: 1 });
RecoveryEventSchema.index({ merchantId: 1, timestamp: -1 });

export const RecoveryEvent: Model<IRecoveryEvent> =
  mongoose.models.RecoveryEvent ||
  mongoose.model<IRecoveryEvent>('RecoveryEvent', RecoveryEventSchema);

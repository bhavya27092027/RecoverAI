import mongoose, { Document, Schema, Model } from 'mongoose';
import { RecommendedAction } from './RecoveryAnalysis.model';

export type RecoveryAttemptStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'SKIPPED';

export interface IRecoveryAttempt extends Document {
  _id: mongoose.Types.ObjectId;
  merchantId: mongoose.Types.ObjectId;
  transactionId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  analysisId: mongoose.Types.ObjectId;
  action: RecommendedAction;
  status: RecoveryAttemptStatus;
  attemptNumber: number;
  paymentMethod: string;
  amount: number;
  failureReason?: string | null;
  resultMessage: string;
  startedAt: Date;
  completedAt?: Date | null;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const RecoveryAttemptSchema = new Schema<IRecoveryAttempt>(
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
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer ID is required'],
      index: true,
    },
    analysisId: {
      type: Schema.Types.ObjectId,
      ref: 'RecoveryAnalysis',
      required: [true, 'Analysis ID is required'],
      index: true,
    },
    action: {
      type: String,
      enum: [
        'RETRY_NOW',
        'WAIT_AND_RETRY',
        'SEND_PAYMENT_LINK',
        'SUGGEST_ALTERNATE_METHOD',
        'STOP_RECOVERY',
      ],
      required: [true, 'Recovery action is required'],
    },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'SKIPPED'],
      default: 'PENDING',
      index: true,
    },
    attemptNumber: {
      type: Number,
      default: 1,
    },
    paymentMethod: {
      type: String,
      required: [true, 'Payment method is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
    },
    failureReason: {
      type: String,
      default: null,
    },
    resultMessage: {
      type: String,
      default: '',
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
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

RecoveryAttemptSchema.index({ merchantId: 1, createdAt: -1 });
RecoveryAttemptSchema.index({ transactionId: 1, attemptNumber: -1 });

export const RecoveryAttempt: Model<IRecoveryAttempt> =
  mongoose.models.RecoveryAttempt ||
  mongoose.model<IRecoveryAttempt>('RecoveryAttempt', RecoveryAttemptSchema);

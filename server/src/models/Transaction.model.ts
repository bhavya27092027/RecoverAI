import mongoose, { Document, Schema, Model } from 'mongoose';

export type TransactionStatus =
  | 'CREATED'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'RECOVERED';

export type FailureReason =
  | 'BANK_TIMEOUT'
  | 'INSUFFICIENT_BALANCE'
  | 'CARD_DECLINED'
  | 'AUTHENTICATION_FAILURE'
  | 'TRANSACTION_LIMIT'
  | 'CUSTOMER_ABANDONMENT';

export type TransactionPaymentMethod =
  | 'UPI'
  | 'Credit Card'
  | 'Debit Card'
  | 'Net Banking';

export interface ITransaction extends Document {
  _id: mongoose.Types.ObjectId;
  merchantId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  paymentMethod: TransactionPaymentMethod;
  description?: string;
  status: TransactionStatus;
  failureReason?: FailureReason | null;
  recoveredAt?: Date | null;
  recoveredAmount?: number | null;
  recoveryAttemptId?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'Merchant',
      required: [true, 'Merchant ID is required'],
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer ID is required'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Transaction amount is required'],
      min: [1, 'Amount must be greater than zero'],
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
      uppercase: true,
    },
    paymentMethod: {
      type: String,
      enum: {
        values: ['UPI', 'Credit Card', 'Debit Card', 'Net Banking'],
        message: '{VALUE} is not a supported payment method',
      },
      required: [true, 'Payment method is required'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [250, 'Description cannot exceed 250 characters'],
    },
    status: {
      type: String,
      enum: {
        values: ['CREATED', 'PROCESSING', 'SUCCESS', 'FAILED', 'RECOVERED'],
        message: '{VALUE} is not a valid transaction status',
      },
      default: 'CREATED',
      index: true,
    },
    failureReason: {
      type: String,
      enum: {
        values: [
          'BANK_TIMEOUT',
          'INSUFFICIENT_BALANCE',
          'CARD_DECLINED',
          'AUTHENTICATION_FAILURE',
          'TRANSACTION_LIMIT',
          'CUSTOMER_ABANDONMENT',
          null,
        ],
        message: '{VALUE} is not a valid failure reason',
      },
      default: null,
    },
    recoveredAt: {
      type: Date,
      default: null,
    },
    recoveredAmount: {
      type: Number,
      default: null,
    },
    recoveryAttemptId: {
      type: Schema.Types.ObjectId,
      ref: 'RecoveryAttempt',
      default: null,
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

TransactionSchema.index({ merchantId: 1, createdAt: -1 });
TransactionSchema.index({ merchantId: 1, customerId: 1 });
TransactionSchema.index({ merchantId: 1, status: 1 });
TransactionSchema.index({ merchantId: 1, failureReason: 1 });
TransactionSchema.index({ merchantId: 1, paymentMethod: 1 });
TransactionSchema.index({ merchantId: 1, status: 1, createdAt: -1 });

export const Transaction: Model<ITransaction> =
  mongoose.models.Transaction ||
  mongoose.model<ITransaction>('Transaction', TransactionSchema);

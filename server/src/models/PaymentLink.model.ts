import mongoose, { Document, Schema, Model } from 'mongoose';

export type PaymentLinkStatus = 'ACTIVE' | 'PAID' | 'EXPIRED';

export interface IPaymentLink extends Document {
  _id: mongoose.Types.ObjectId;
  recoveryLinkId: string;
  merchantId: mongoose.Types.ObjectId;
  transactionId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  status: PaymentLinkStatus;
  expiresAt: Date;
  paidAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentLinkSchema = new Schema<IPaymentLink>(
  {
    recoveryLinkId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
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
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
    },
    currency: {
      type: String,
      default: 'INR',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'PAID', 'EXPIRED'],
      default: 'ACTIVE',
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    paidAt: {
      type: Date,
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

PaymentLinkSchema.index({ transactionId: 1, status: 1 });

export const PaymentLink: Model<IPaymentLink> =
  mongoose.models.PaymentLink ||
  mongoose.model<IPaymentLink>('PaymentLink', PaymentLinkSchema);

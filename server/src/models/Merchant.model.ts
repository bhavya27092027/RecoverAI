import mongoose, { Document, Schema, Model } from 'mongoose';

export type BusinessType =
  | 'E-commerce'
  | 'SaaS'
  | 'Subscription'
  | 'Marketplace'
  | 'Education'
  | 'Services'
  | 'Other';

export type MonthlyPaymentVolume =
  | '< ₹1L'
  | '₹1L–₹5L'
  | '₹5L–₹25L'
  | '₹25L+';

export type PaymentMethod =
  | 'UPI'
  | 'Credit Card'
  | 'Debit Card'
  | 'Net Banking';

export interface IMerchant extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  businessName: string;
  businessType: BusinessType;
  monthlyPaymentVolume: MonthlyPaymentVolume;
  preferredPaymentMethods: PaymentMethod[];
  onboardingCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MerchantSchema = new Schema<IMerchant>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID reference is required'],
      unique: true,
      index: true,
    },
    businessName: {
      type: String,
      required: [true, 'Business/Company name is required'],
      trim: true,
      minlength: [2, 'Business name must be at least 2 characters long'],
      maxlength: [150, 'Business name cannot exceed 150 characters'],
    },
    businessType: {
      type: String,
      enum: {
        values: [
          'E-commerce',
          'SaaS',
          'Subscription',
          'Marketplace',
          'Education',
          'Services',
          'Other',
        ],
        message: '{VALUE} is not a supported business type',
      },
      default: 'SaaS',
    },
    monthlyPaymentVolume: {
      type: String,
      enum: {
        values: ['< ₹1L', '₹1L–₹5L', '₹5L–₹25L', '₹25L+'],
        message: '{VALUE} is not a valid volume range',
      },
      default: '< ₹1L',
    },
    preferredPaymentMethods: {
      type: [String],
      enum: {
        values: ['UPI', 'Credit Card', 'Debit Card', 'Net Banking'],
        message: '{VALUE} is not a recognized payment method',
      },
      default: ['UPI', 'Credit Card'],
    },
    onboardingCompleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

export const Merchant: Model<IMerchant> =
  mongoose.models.Merchant || mongoose.model<IMerchant>('Merchant', MerchantSchema);

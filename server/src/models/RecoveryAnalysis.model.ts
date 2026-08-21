import mongoose, { Document, Schema, Model } from 'mongoose';

export type RecommendedAction =
  | 'RETRY_NOW'
  | 'WAIT_AND_RETRY'
  | 'SEND_PAYMENT_LINK'
  | 'SUGGEST_ALTERNATE_METHOD'
  | 'STOP_RECOVERY';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface IDecisionFactors {
  failureReasonScore: number;
  customerHistoryScore: number;
  paymentMethodScore: number;
  merchantRecoveryScore: number;
  repeatFailurePenalty: number;
  customerSuccessRate: number;
  customerTotalSpend: number;
  historicalAttemptsCount: number;
}

export interface IRecoveryAnalysis extends Document {
  _id: mongoose.Types.ObjectId;
  merchantId: mongoose.Types.ObjectId;
  transactionId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  recoveryProbability: number;
  confidence: ConfidenceLevel;
  recommendedAction: RecommendedAction;
  expectedRecoveryAmount: number;
  reasoning: string;
  factors: IDecisionFactors;
  createdAt: Date;
  updatedAt: Date;
}

const DecisionFactorsSchema = new Schema<IDecisionFactors>(
  {
    failureReasonScore: { type: Number, required: true },
    customerHistoryScore: { type: Number, required: true },
    paymentMethodScore: { type: Number, required: true },
    merchantRecoveryScore: { type: Number, required: true },
    repeatFailurePenalty: { type: Number, required: true },
    customerSuccessRate: { type: Number, required: true },
    customerTotalSpend: { type: Number, required: true },
    historicalAttemptsCount: { type: Number, required: true },
  },
  { _id: false }
);

const RecoveryAnalysisSchema = new Schema<IRecoveryAnalysis>(
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
      unique: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer ID is required'],
      index: true,
    },
    recoveryProbability: {
      type: Number,
      required: [true, 'Recovery probability is required'],
      min: 0,
      max: 100,
    },
    confidence: {
      type: String,
      enum: {
        values: ['HIGH', 'MEDIUM', 'LOW'],
        message: '{VALUE} is not a valid confidence level',
      },
      required: [true, 'Confidence level is required'],
    },
    recommendedAction: {
      type: String,
      enum: {
        values: [
          'RETRY_NOW',
          'WAIT_AND_RETRY',
          'SEND_PAYMENT_LINK',
          'SUGGEST_ALTERNATE_METHOD',
          'STOP_RECOVERY',
        ],
        message: '{VALUE} is not a valid recommended action',
      },
      required: [true, 'Recommended action is required'],
    },
    expectedRecoveryAmount: {
      type: Number,
      required: [true, 'Expected recovery amount is required'],
      min: 0,
    },
    reasoning: {
      type: String,
      required: [true, 'AI reasoning explanation is required'],
      trim: true,
    },
    factors: {
      type: DecisionFactorsSchema,
      required: true,
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

RecoveryAnalysisSchema.index({ merchantId: 1, recoveryProbability: -1 });
RecoveryAnalysisSchema.index({ merchantId: 1, recommendedAction: 1 });
RecoveryAnalysisSchema.index({ merchantId: 1, createdAt: -1 });

export const RecoveryAnalysis: Model<IRecoveryAnalysis> =
  mongoose.models.RecoveryAnalysis ||
  mongoose.model<IRecoveryAnalysis>(
    'RecoveryAnalysis',
    RecoveryAnalysisSchema
  );

import { ITransaction, TransactionStatus, FailureReason } from '../../models/Transaction.model';

export interface ProcessPaymentOptions {
  simulateStatus: 'SUCCESS' | 'FAILED';
  failureReason?: FailureReason;
}

export interface PaymentProcessingResult {
  transactionId: string;
  previousStatus: TransactionStatus;
  status: TransactionStatus;
  failureReason?: FailureReason | null;
  processedAt: string;
  providerReference: string;
  provider: string;
}

export interface RecoveryExecutionResult {
  success: boolean;
  failureReason?: string | null;
  providerReference: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface GeneratedPaymentLinkResult {
  recoveryLinkId: string;
  linkUrl: string;
  expiresAt: Date;
  amount: number;
}

export interface IPaymentProvider {
  processPayment(
    transaction: ITransaction,
    options: ProcessPaymentOptions
  ): Promise<PaymentProcessingResult>;

  retryPayment(transaction: ITransaction): Promise<RecoveryExecutionResult>;

  generatePaymentLink(transaction: ITransaction): Promise<GeneratedPaymentLinkResult>;

  simulateCustomerPayment(
    transaction: ITransaction,
    recoveryLinkId?: string
  ): Promise<RecoveryExecutionResult>;

  simulateAlternatePayment(
    transaction: ITransaction,
    alternatePaymentMethod: string
  ): Promise<RecoveryExecutionResult>;
}

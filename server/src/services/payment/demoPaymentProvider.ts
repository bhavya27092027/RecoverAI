import { ITransaction } from '../../models/Transaction.model';
import {
  IPaymentProvider,
  ProcessPaymentOptions,
  PaymentProcessingResult,
  RecoveryExecutionResult,
  GeneratedPaymentLinkResult,
} from './paymentProvider.interface';

export class DemoPaymentProvider implements IPaymentProvider {
  public async processPayment(
    transaction: ITransaction,
    options: ProcessPaymentOptions
  ): Promise<PaymentProcessingResult> {
    const previousStatus = transaction.status;

    // Transition state from CREATED to PROCESSING to final simulated status
    transaction.status = options.simulateStatus;
    if (options.simulateStatus === 'FAILED') {
      transaction.failureReason = options.failureReason || 'BANK_TIMEOUT';
    } else {
      transaction.failureReason = null;
    }

    await transaction.save();

    const providerRef = `DEMO-PAY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    return {
      transactionId: transaction._id.toString(),
      previousStatus,
      status: transaction.status,
      failureReason: transaction.failureReason,
      processedAt: new Date().toISOString(),
      providerReference: providerRef,
      provider: 'DemoPaymentProvider',
    };
  }

  public async retryPayment(transaction: ITransaction): Promise<RecoveryExecutionResult> {
    const providerRef = `DEMO-RETRY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Deterministic simulation based on failure reason:
    // BANK_TIMEOUT: temporary interchange glitch -> retry succeeds
    // AUTHENTICATION_FAILURE: customer 3DS handshake completed -> retry succeeds
    // INSUFFICIENT_BALANCE: direct blind retry fails without funds
    // CARD_DECLINED: card permanently declined by issuer -> direct retry fails
    // TRANSACTION_LIMIT: exceeds velocity/limit -> direct retry fails
    // CUSTOMER_ABANDONMENT: user left checkout -> direct retry fails

    if (transaction.failureReason === 'BANK_TIMEOUT') {
      return {
        success: true,
        failureReason: null,
        providerReference: providerRef,
        message: 'Payment gateway re-queried and settled successfully upon automatic retry.',
        metadata: { rail: transaction.paymentMethod, retryLatencyMs: 420 },
      };
    }

    if (transaction.failureReason === 'AUTHENTICATION_FAILURE') {
      return {
        success: true,
        failureReason: null,
        providerReference: providerRef,
        message: 'Secondary authentication challenge verified and captured successfully.',
        metadata: { rail: transaction.paymentMethod, retryLatencyMs: 650 },
      };
    }

    // Direct retries fail for structural decline reasons
    return {
      success: false,
      failureReason: transaction.failureReason || 'CARD_DECLINED',
      providerReference: providerRef,
      message: `Direct retry was declined by the issuer (${transaction.failureReason?.replace(/_/g, ' ')}). An alternate strategy is recommended.`,
      metadata: { rail: transaction.paymentMethod },
    };
  }

  public async generatePaymentLink(transaction: ITransaction): Promise<GeneratedPaymentLinkResult> {
    const recoveryLinkId = `rec_link_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    return {
      recoveryLinkId,
      linkUrl: `https://pay.recoverai.io/salvage/${recoveryLinkId}`,
      expiresAt,
      amount: transaction.amount,
    };
  }

  public async simulateCustomerPayment(
    transaction: ITransaction,
    recoveryLinkId?: string
  ): Promise<RecoveryExecutionResult> {
    const providerRef = `DEMO-LINK-PAY-${Date.now().toString(36).toUpperCase()}`;

    return {
      success: true,
      failureReason: null,
      providerReference: providerRef,
      message: 'Customer accessed the dynamic recovery link and settled the outstanding balance via instant UPI transfer.',
      metadata: { recoveryLinkId, settledRail: 'UPI' },
    };
  }

  public async simulateAlternatePayment(
    transaction: ITransaction,
    alternatePaymentMethod: string
  ): Promise<RecoveryExecutionResult> {
    const providerRef = `DEMO-ALT-PAY-${Date.now().toString(36).toUpperCase()}`;

    return {
      success: true,
      failureReason: null,
      providerReference: providerRef,
      message: `Customer switched payment rail to ${alternatePaymentMethod} and the transaction was approved immediately.`,
      metadata: {
        originalPaymentMethod: transaction.paymentMethod,
        alternatePaymentMethod,
      },
    };
  }
}

export const demoPaymentProvider = new DemoPaymentProvider();

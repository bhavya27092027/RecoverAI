import mongoose from 'mongoose';
import { Transaction, ITransaction } from '../models/Transaction.model';
import { RecoveryAnalysis, IRecoveryAnalysis } from '../models/RecoveryAnalysis.model';
import { RecoveryAttempt, IRecoveryAttempt } from '../models/RecoveryAttempt.model';
import { RecoveryEvent, IRecoveryEvent, RecoveryEventType } from '../models/RecoveryEvent.model';
import { PaymentLink, IPaymentLink } from '../models/PaymentLink.model';
import { demoPaymentProvider } from '../services/payment/demoPaymentProvider';
import { RECOVERY_CONFIG, isEligibleForAutonomousExecution } from './recoveryConfig';

export interface ExecuteRecoveryResult {
  success: boolean;
  message: string;
  transaction: ITransaction;
  attempt: IRecoveryAttempt;
  analysis: IRecoveryAnalysis;
  paymentLink?: IPaymentLink | null;
  events: IRecoveryEvent[];
}

export class RecoveryAgent {
  /**
   * Helper to record immutable audit events
   */
  private async recordEvent(
    merchantId: mongoose.Types.ObjectId,
    transactionId: mongoose.Types.ObjectId,
    eventType: RecoveryEventType,
    message: string,
    recoveryAttemptId?: mongoose.Types.ObjectId | null,
    metadata?: Record<string, any>
  ): Promise<IRecoveryEvent> {
    return await RecoveryEvent.create({
      merchantId,
      transactionId,
      recoveryAttemptId: recoveryAttemptId || null,
      eventType,
      message,
      metadata: metadata || {},
      timestamp: new Date(),
    });
  }

  /**
   * Core Autonomous / Merchant-Triggered Recovery Execution
   */
  public async executeRecovery(
    transactionId: string | mongoose.Types.ObjectId,
    merchantId: string | mongoose.Types.ObjectId,
    options: { isManualApproval?: boolean } = {}
  ): Promise<ExecuteRecoveryResult> {
    const txObjId = new mongoose.Types.ObjectId(transactionId.toString());
    const merchObjId = new mongoose.Types.ObjectId(merchantId.toString());

    // 1. Fetch & verify transaction
    const transaction = await Transaction.findOne({
      _id: txObjId,
      merchantId: merchObjId,
    });

    if (!transaction) {
      throw new Error('Transaction not found or does not belong to your merchant account.');
    }

    // 2. Idempotency Check: Already recovered
    if (transaction.status === 'RECOVERED') {
      throw new Error('Transaction has already been recovered.');
    }

    if (transaction.status !== 'FAILED') {
      throw new Error(`Transaction is in ${transaction.status} status. Only FAILED transactions can enter recovery.`);
    }

    // 3. Prevent duplicate simultaneous executions
    const activeProcessingAttempt = await RecoveryAttempt.findOne({
      transactionId: txObjId,
      merchantId: merchObjId,
      status: 'PROCESSING',
    });

    if (activeProcessingAttempt) {
      throw new Error('A recovery attempt is currently in progress for this transaction.');
    }

    // 4. Fetch latest RecoveryAnalysis
    const analysis = await RecoveryAnalysis.findOne({
      transactionId: txObjId,
      merchantId: merchObjId,
    });

    if (!analysis) {
      throw new Error('No AI recovery analysis found for this transaction. Please analyze the transaction first.');
    }

    // 5. Check maximum attempts
    const previousAttemptsCount = await RecoveryAttempt.countDocuments({
      transactionId: txObjId,
      merchantId: merchObjId,
    });

    if (previousAttemptsCount >= RECOVERY_CONFIG.maxRecoveryAttempts) {
      throw new Error(
        `Maximum recovery attempts (${RECOVERY_CONFIG.maxRecoveryAttempts}) reached for this transaction.`
      );
    }

    const attemptNumber = previousAttemptsCount + 1;

    // 6. Record Initial Audit Events
    await this.recordEvent(
      merchObjId,
      txObjId,
      'ANALYSIS_SELECTED',
      `RecoverAI analysis loaded: ${analysis.recoveryProbability}% salvage probability, ${analysis.confidence} confidence.`,
      null,
      {
        probability: analysis.recoveryProbability,
        confidence: analysis.confidence,
        expectedRecoveryAmount: analysis.expectedRecoveryAmount,
      }
    );

    await this.recordEvent(
      merchObjId,
      txObjId,
      'RECOVERY_STARTED',
      `Autonomous Recovery Agent started Attempt #${attemptNumber} for ₹${transaction.amount.toLocaleString()}.`,
      null,
      { attemptNumber, manualApproval: options.isManualApproval || false }
    );

    await this.recordEvent(
      merchObjId,
      txObjId,
      'ACTION_SELECTED',
      `Executing recommended strategy: ${analysis.recommendedAction.replace(/_/g, ' ')}.`,
      null,
      { action: analysis.recommendedAction }
    );

    // 7. Initialize RecoveryAttempt record
    const attempt = await RecoveryAttempt.create({
      merchantId: merchObjId,
      transactionId: txObjId,
      customerId: transaction.customerId,
      analysisId: analysis._id,
      action: analysis.recommendedAction,
      status: 'PROCESSING',
      attemptNumber,
      paymentMethod: transaction.paymentMethod,
      amount: transaction.amount,
      failureReason: transaction.failureReason,
      startedAt: new Date(),
    });

    let paymentLink: IPaymentLink | null = null;

    // 8. Execute Strategy
    switch (analysis.recommendedAction) {
      case 'RETRY_NOW':
      case 'WAIT_AND_RETRY': {
        await this.recordEvent(
          merchObjId,
          txObjId,
          'RETRY_INITIATED',
          `Initiating smart network retry over ${transaction.paymentMethod} rail...`,
          attempt._id
        );

        await this.recordEvent(
          merchObjId,
          txObjId,
          'PAYMENT_PROCESSING',
          'Querying payment simulator interchange gateway for authorization...',
          attempt._id
        );

        const result = await demoPaymentProvider.retryPayment(transaction);

        if (result.success) {
          // Success transition
          transaction.status = 'RECOVERED';
          transaction.recoveredAt = new Date();
          transaction.recoveredAmount = transaction.amount;
          transaction.recoveryAttemptId = attempt._id;
          await transaction.save();

          attempt.status = 'SUCCESS';
          attempt.completedAt = new Date();
          attempt.resultMessage = result.message;
          attempt.metadata = {
            providerReference: result.providerReference,
            ...result.metadata,
          };
          await attempt.save();

          await this.recordEvent(
            merchObjId,
            txObjId,
            'PAYMENT_RECOVERED',
            `🎉 Payment successfully recovered! ₹${transaction.amount.toLocaleString()} settled.`,
            attempt._id,
            { recoveredAmount: transaction.amount, providerReference: result.providerReference }
          );
        } else {
          // Failed transition
          attempt.status = 'FAILED';
          attempt.completedAt = new Date();
          attempt.failureReason = result.failureReason || transaction.failureReason;
          attempt.resultMessage = result.message;
          attempt.metadata = {
            providerReference: result.providerReference,
            ...result.metadata,
          };
          await attempt.save();

          await this.recordEvent(
            merchObjId,
            txObjId,
            'RECOVERY_FAILED',
            `❌ Payment retry failed: ${result.message}`,
            attempt._id,
            { failureReason: result.failureReason }
          );
        }
        break;
      }

      case 'SEND_PAYMENT_LINK': {
        const linkResult = await demoPaymentProvider.generatePaymentLink(transaction);

        paymentLink = await PaymentLink.create({
          recoveryLinkId: linkResult.recoveryLinkId,
          merchantId: merchObjId,
          transactionId: txObjId,
          customerId: transaction.customerId,
          amount: transaction.amount,
          currency: transaction.currency,
          status: 'ACTIVE',
          expiresAt: linkResult.expiresAt,
        });

        attempt.status = 'PENDING';
        attempt.completedAt = null;
        attempt.resultMessage = `Payment recovery link generated: ${linkResult.linkUrl}`;
        attempt.metadata = {
          recoveryLinkId: linkResult.recoveryLinkId,
          linkUrl: linkResult.linkUrl,
          expiresAt: linkResult.expiresAt,
        };
        await attempt.save();

        await this.recordEvent(
          merchObjId,
          txObjId,
          'PAYMENT_LINK_GENERATED',
          `Dynamic payment link generated (${linkResult.linkUrl}). Awaiting simulated customer settlement.`,
          attempt._id,
          { linkUrl: linkResult.linkUrl, recoveryLinkId: linkResult.recoveryLinkId }
        );
        break;
      }

      case 'SUGGEST_ALTERNATE_METHOD': {
        const alternateMethod =
          transaction.paymentMethod === 'Credit Card' ? 'UPI' : 'Credit Card';

        attempt.status = 'PENDING';
        attempt.completedAt = null;
        attempt.resultMessage = `Suggested customer switch from ${transaction.paymentMethod} to ${alternateMethod}.`;
        attempt.metadata = {
          originalMethod: transaction.paymentMethod,
          suggestedMethod: alternateMethod,
        };
        await attempt.save();

        await this.recordEvent(
          merchObjId,
          txObjId,
          'ALTERNATE_METHOD_SELECTED',
          `Recommended alternate payment method: ${alternateMethod} to bypass ${transaction.failureReason?.replace(/_/g, ' ')}.`,
          attempt._id,
          { originalMethod: transaction.paymentMethod, suggestedMethod: alternateMethod }
        );
        break;
      }

      case 'STOP_RECOVERY': {
        attempt.status = 'SKIPPED';
        attempt.completedAt = new Date();
        attempt.resultMessage = 'RecoverAI determined that recovery probability is too low.';
        await attempt.save();

        await this.recordEvent(
          merchObjId,
          txObjId,
          'RECOVERY_SKIPPED',
          'Recovery aborted by safety policy: Probability score below viable recovery threshold.',
          attempt._id
        );
        break;
      }
    }

    const events = await RecoveryEvent.find({ transactionId: txObjId }).sort({ timestamp: 1 });

    return {
      success: attempt.status === 'SUCCESS' || attempt.status === 'PENDING',
      message: attempt.resultMessage,
      transaction,
      attempt,
      analysis,
      paymentLink,
      events,
    };
  }

  /**
   * Simulate Customer Settlement via Payment Link
   */
  public async simulateCustomerPayment(
    transactionId: string | mongoose.Types.ObjectId,
    merchantId: string | mongoose.Types.ObjectId
  ): Promise<ExecuteRecoveryResult> {
    const txObjId = new mongoose.Types.ObjectId(transactionId.toString());
    const merchObjId = new mongoose.Types.ObjectId(merchantId.toString());

    const transaction = await Transaction.findOne({
      _id: txObjId,
      merchantId: merchObjId,
    });

    if (!transaction) {
      throw new Error('Transaction not found.');
    }

    if (transaction.status === 'RECOVERED') {
      throw new Error('Transaction has already been recovered.');
    }

    const analysis = await RecoveryAnalysis.findOne({
      transactionId: txObjId,
      merchantId: merchObjId,
    });

    if (!analysis) {
      throw new Error('Recovery analysis not found.');
    }

    let paymentLink = await PaymentLink.findOne({
      transactionId: txObjId,
      merchantId: merchObjId,
      status: 'ACTIVE',
    });

    const result = await demoPaymentProvider.simulateCustomerPayment(
      transaction,
      paymentLink?.recoveryLinkId
    );

    // Create or update attempt
    let attempt = await RecoveryAttempt.findOne({
      transactionId: txObjId,
      merchantId: merchObjId,
    }).sort({ attemptNumber: -1 });

    if (!attempt || attempt.status !== 'PENDING') {
      const count = await RecoveryAttempt.countDocuments({ transactionId: txObjId });
      attempt = await RecoveryAttempt.create({
        merchantId: merchObjId,
        transactionId: txObjId,
        customerId: transaction.customerId,
        analysisId: analysis._id,
        action: 'SEND_PAYMENT_LINK',
        status: 'SUCCESS',
        attemptNumber: count + 1,
        paymentMethod: 'UPI',
        amount: transaction.amount,
        resultMessage: result.message,
        startedAt: new Date(),
        completedAt: new Date(),
        metadata: result.metadata,
      });
    } else {
      attempt.status = 'SUCCESS';
      attempt.completedAt = new Date();
      attempt.resultMessage = result.message;
      attempt.metadata = { ...attempt.metadata, ...result.metadata };
      await attempt.save();
    }

    // Update Transaction to RECOVERED
    transaction.status = 'RECOVERED';
    transaction.recoveredAt = new Date();
    transaction.recoveredAmount = transaction.amount;
    transaction.recoveryAttemptId = attempt._id;
    await transaction.save();

    if (paymentLink) {
      paymentLink.status = 'PAID';
      paymentLink.paidAt = new Date();
      await paymentLink.save();
    }

    await this.recordEvent(
      merchObjId,
      txObjId,
      'PAYMENT_PROCESSING',
      'Customer completed simulated checkout via payment link.',
      attempt._id
    );

    await this.recordEvent(
      merchObjId,
      txObjId,
      'PAYMENT_RECOVERED',
      `🎉 Payment link settled successfully! ₹${transaction.amount.toLocaleString()} recovered via UPI.`,
      attempt._id,
      { recoveredAmount: transaction.amount, method: 'Payment Link (UPI)' }
    );

    const events = await RecoveryEvent.find({ transactionId: txObjId }).sort({ timestamp: 1 });

    return {
      success: true,
      message: result.message,
      transaction,
      attempt,
      analysis,
      paymentLink,
      events,
    };
  }

  /**
   * Simulate Alternate Payment Method Settlement
   */
  public async simulateAlternatePayment(
    transactionId: string | mongoose.Types.ObjectId,
    merchantId: string | mongoose.Types.ObjectId,
    alternateMethod?: string
  ): Promise<ExecuteRecoveryResult> {
    const txObjId = new mongoose.Types.ObjectId(transactionId.toString());
    const merchObjId = new mongoose.Types.ObjectId(merchantId.toString());

    const transaction = await Transaction.findOne({
      _id: txObjId,
      merchantId: merchObjId,
    });

    if (!transaction) {
      throw new Error('Transaction not found.');
    }

    if (transaction.status === 'RECOVERED') {
      throw new Error('Transaction has already been recovered.');
    }

    const analysis = await RecoveryAnalysis.findOne({
      transactionId: txObjId,
      merchantId: merchObjId,
    });

    if (!analysis) {
      throw new Error('Recovery analysis not found.');
    }

    const selectedMethod =
      alternateMethod ||
      (transaction.paymentMethod === 'Credit Card' ? 'UPI' : 'Credit Card');

    const result = await demoPaymentProvider.simulateAlternatePayment(
      transaction,
      selectedMethod
    );

    // Create or update attempt
    let attempt = await RecoveryAttempt.findOne({
      transactionId: txObjId,
      merchantId: merchObjId,
    }).sort({ attemptNumber: -1 });

    if (!attempt || attempt.status !== 'PENDING') {
      const count = await RecoveryAttempt.countDocuments({ transactionId: txObjId });
      attempt = await RecoveryAttempt.create({
        merchantId: merchObjId,
        transactionId: txObjId,
        customerId: transaction.customerId,
        analysisId: analysis._id,
        action: 'SUGGEST_ALTERNATE_METHOD',
        status: 'SUCCESS',
        attemptNumber: count + 1,
        paymentMethod: selectedMethod,
        amount: transaction.amount,
        resultMessage: result.message,
        startedAt: new Date(),
        completedAt: new Date(),
        metadata: result.metadata,
      });
    } else {
      attempt.status = 'SUCCESS';
      attempt.paymentMethod = selectedMethod;
      attempt.completedAt = new Date();
      attempt.resultMessage = result.message;
      attempt.metadata = { ...attempt.metadata, ...result.metadata };
      await attempt.save();
    }

    // Update Transaction to RECOVERED
    transaction.status = 'RECOVERED';
    transaction.recoveredAt = new Date();
    transaction.recoveredAmount = transaction.amount;
    transaction.recoveryAttemptId = attempt._id;
    await transaction.save();

    await this.recordEvent(
      merchObjId,
      txObjId,
      'PAYMENT_PROCESSING',
      `Processing authorization over alternate channel (${selectedMethod})...`,
      attempt._id
    );

    await this.recordEvent(
      merchObjId,
      txObjId,
      'PAYMENT_RECOVERED',
      `🎉 Payment settled successfully on alternate rail (${selectedMethod})! ₹${transaction.amount.toLocaleString()} recovered.`,
      attempt._id,
      { recoveredAmount: transaction.amount, alternateMethod: selectedMethod }
    );

    const events = await RecoveryEvent.find({ transactionId: txObjId }).sort({ timestamp: 1 });

    return {
      success: true,
      message: result.message,
      transaction,
      attempt,
      analysis,
      events,
    };
  }
}

export const recoveryAgent = new RecoveryAgent();

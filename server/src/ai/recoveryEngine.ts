import mongoose from 'mongoose';
import { Transaction, ITransaction, FailureReason } from '../models/Transaction.model';
import { Customer } from '../models/Customer.model';
import {
  RecoveryAnalysis,
  IRecoveryAnalysis,
  RecommendedAction,
  ConfidenceLevel,
  IDecisionFactors,
} from '../models/RecoveryAnalysis.model';
import { enhanceReasoningWithLLM } from './llmClient';

export class RecoveryEngine {
  /**
   * Analyzes a failed payment and generates an explainable recovery analysis.
   */
  public async analyzePayment(
    transactionId: string | mongoose.Types.ObjectId,
    merchantId: mongoose.Types.ObjectId
  ): Promise<IRecoveryAnalysis> {
    if (!mongoose.Types.ObjectId.isValid(transactionId.toString())) {
      throw new Error('Invalid transaction ID');
    }

    // 1. Fetch transaction and verify merchant ownership
    const transaction = await Transaction.findOne({
      _id: transactionId,
      merchantId,
    });

    if (!transaction) {
      throw new Error('Transaction not found in your merchant workspace');
    }

    if (transaction.status !== 'FAILED') {
      throw new Error(
        `Only FAILED transactions can be analyzed. Current status is ${transaction.status}`
      );
    }

    // 2. Fetch Customer and customer historical context
    const customer = await Customer.findOne({
      _id: transaction.customerId,
      merchantId,
    });

    if (!customer) {
      throw new Error('Associated customer not found');
    }

    // Customer's other transactions (excluding this current one)
    const customerHistory = await Transaction.find({
      merchantId,
      customerId: customer._id,
      _id: { $ne: transaction._id },
    }).sort({ createdAt: -1 });

    // 3. Calculate Customer Metrics
    const totalPriorTxs = customerHistory.length;
    let priorSuccessCount = 0;
    let priorRecoveredCount = 0;
    let priorFailedCount = 0;
    let priorTotalSpend = 0;
    let recentConsecutiveFailures = 0;

    for (let i = 0; i < customerHistory.length; i++) {
      const tx = customerHistory[i];
      if (tx.status === 'SUCCESS') {
        priorSuccessCount++;
        priorTotalSpend += tx.amount;
      } else if (tx.status === 'RECOVERED') {
        priorRecoveredCount++;
        priorTotalSpend += tx.amount;
      } else if (tx.status === 'FAILED') {
        priorFailedCount++;
      }

      // Check recent failure streak
      if (i < 3 && tx.status === 'FAILED') {
        recentConsecutiveFailures++;
      }
    }

    const customerSuccessRate =
      totalPriorTxs > 0
        ? Math.round(((priorSuccessCount + priorRecoveredCount) / totalPriorTxs) * 100)
        : 0;

    // 4. Fetch Merchant Benchmark Context for this Failure Reason & Rail
    const merchantSimilarTxs = await Transaction.find({
      merchantId,
      _id: { $ne: transaction._id },
      failureReason: transaction.failureReason,
    });

    const merchantRailTxs = await Transaction.find({
      merchantId,
      _id: { $ne: transaction._id },
      paymentMethod: transaction.paymentMethod,
    });

    const merchantRecoveredSimilar = merchantSimilarTxs.filter(
      (t) => t.status === 'RECOVERED'
    ).length;
    const merchantRailSuccess = merchantRailTxs.filter(
      (t) => t.status === 'SUCCESS' || t.status === 'RECOVERED'
    ).length;

    // 5. Calculate Deterministic Scoring Factors

    // Factor A: Base score by failure reason (0 to 100 base)
    let failureReasonScore = 60;
    switch (transaction.failureReason) {
      case 'BANK_TIMEOUT':
        failureReasonScore = 85;
        break;
      case 'INSUFFICIENT_BALANCE':
        failureReasonScore = 65;
        break;
      case 'AUTHENTICATION_FAILURE':
        failureReasonScore = 60;
        break;
      case 'CUSTOMER_ABANDONMENT':
        failureReasonScore = 55;
        break;
      case 'TRANSACTION_LIMIT':
        failureReasonScore = 45;
        break;
      case 'CARD_DECLINED':
        failureReasonScore = 35;
        break;
      default:
        failureReasonScore = 50;
        break;
    }

    // Factor B: Customer Reliability Score (-20 to +20)
    let customerHistoryScore = 0;
    if (totalPriorTxs === 0) {
      // Brand new customer: neutral baseline
      customerHistoryScore = 0;
    } else {
      if (customerSuccessRate >= 85) {
        customerHistoryScore = 15;
      } else if (customerSuccessRate >= 60) {
        customerHistoryScore = 8;
      } else if (customerSuccessRate >= 40) {
        customerHistoryScore = -5;
      } else {
        customerHistoryScore = -15;
      }

      // Bonus for high lifetime spend
      if (priorTotalSpend >= 20000) {
        customerHistoryScore += 5;
      } else if (priorTotalSpend >= 5000) {
        customerHistoryScore += 2;
      }
    }

    // Factor C: Payment Method Merchant Performance (-10 to +10)
    let paymentMethodScore = 0;
    if (merchantRailTxs.length >= 3) {
      const railSuccessRate = Math.round(
        (merchantRailSuccess / merchantRailTxs.length) * 100
      );
      if (railSuccessRate >= 75) {
        paymentMethodScore = 6;
      } else if (railSuccessRate <= 35) {
        paymentMethodScore = -6;
      }
    }

    // Factor D: Merchant Historical Recovery for this failure (-10 to +10)
    let merchantRecoveryScore = 0;
    if (merchantSimilarTxs.length >= 3) {
      const recoveryRate = Math.round(
        (merchantRecoveredSimilar / merchantSimilarTxs.length) * 100
      );
      if (recoveryRate >= 50) {
        merchantRecoveryScore = 8;
      } else if (recoveryRate >= 25) {
        merchantRecoveryScore = 4;
      } else {
        merchantRecoveryScore = -4;
      }
    }

    // Factor E: Repeat Failure Penalty (0 to -20)
    let repeatFailurePenalty = 0;
    if (recentConsecutiveFailures >= 2) {
      repeatFailurePenalty = -15;
    } else if (recentConsecutiveFailures === 1) {
      repeatFailurePenalty = -5;
    }

    // 6. Compute Final Clamped Probability
    const rawProbability =
      failureReasonScore +
      customerHistoryScore +
      paymentMethodScore +
      merchantRecoveryScore +
      repeatFailurePenalty;

    const recoveryProbability = Math.max(5, Math.min(98, Math.round(rawProbability)));

    // 7. Calculate Confidence Level
    let confidence: ConfidenceLevel = 'LOW';
    if (totalPriorTxs >= 3 || (totalPriorTxs >= 2 && merchantRailTxs.length >= 3) || (merchantSimilarTxs.length >= 2 && merchantRailTxs.length >= 3)) {
      confidence = 'HIGH';
    } else if (totalPriorTxs >= 1 || merchantRailTxs.length >= 2) {
      confidence = 'MEDIUM';
    } else {
      confidence = 'LOW';
    }

    // 8. Select Recommended Action
    let recommendedAction: RecommendedAction = 'WAIT_AND_RETRY';

    if (transaction.failureReason === 'BANK_TIMEOUT') {
      if (recoveryProbability >= 80 && confidence === 'HIGH') {
        recommendedAction = 'RETRY_NOW';
      } else {
        recommendedAction = 'WAIT_AND_RETRY';
      }
    } else if (transaction.failureReason === 'INSUFFICIENT_BALANCE') {
      recommendedAction = 'SEND_PAYMENT_LINK';
    } else if (transaction.failureReason === 'CARD_DECLINED') {
      if (recoveryProbability < 40 && repeatFailurePenalty < 0) {
        recommendedAction = 'STOP_RECOVERY';
      } else {
        recommendedAction = 'SUGGEST_ALTERNATE_METHOD';
      }
    } else if (transaction.failureReason === 'AUTHENTICATION_FAILURE') {
      recommendedAction = 'WAIT_AND_RETRY';
    } else if (transaction.failureReason === 'TRANSACTION_LIMIT') {
      recommendedAction = 'SUGGEST_ALTERNATE_METHOD';
    } else if (transaction.failureReason === 'CUSTOMER_ABANDONMENT') {
      recommendedAction = 'SEND_PAYMENT_LINK';
    } else {
      recommendedAction = recoveryProbability >= 60 ? 'WAIT_AND_RETRY' : 'STOP_RECOVERY';
    }

    // 9. Calculate Expected Recoverable Amount
    const expectedRecoveryAmount = Math.round(
      (transaction.amount * recoveryProbability) / 100
    );

    // 10. Generate Transparent Human-Readable Reasoning
    const reasoning = this.buildDeterministicReasoning({
      customerName: customer.name,
      failureReason: transaction.failureReason || 'Unknown',
      paymentMethod: transaction.paymentMethod,
      totalPriorTxs,
      customerSuccessRate,
      priorTotalSpend,
      recoveryProbability,
      confidence,
      recommendedAction,
    });

    // Optional LLM Enhancement if API key is present
    const finalReasoning = await enhanceReasoningWithLLM(
      {
        customerName: customer.name,
        transactionAmount: transaction.amount,
        paymentMethod: transaction.paymentMethod,
        failureReason: transaction.failureReason || 'Unknown',
        recoveryProbability,
        confidence,
        recommendedAction,
        customerSuccessRate,
        customerTotalSpent: priorTotalSpend,
        totalTransactions: totalPriorTxs,
      },
      reasoning
    );

    const factors: IDecisionFactors = {
      failureReasonScore,
      customerHistoryScore,
      paymentMethodScore,
      merchantRecoveryScore,
      repeatFailurePenalty,
      customerSuccessRate,
      customerTotalSpend: priorTotalSpend,
      historicalAttemptsCount: totalPriorTxs,
    };

    // 11. Persist or Update Analysis in MongoDB
    const analysis = await RecoveryAnalysis.findOneAndUpdate(
      { transactionId: transaction._id },
      {
        merchantId,
        transactionId: transaction._id,
        customerId: customer._id,
        recoveryProbability,
        confidence,
        recommendedAction,
        expectedRecoveryAmount,
        reasoning: finalReasoning,
        factors,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return analysis;
  }

  private buildDeterministicReasoning(params: {
    customerName: string;
    failureReason: string;
    paymentMethod: string;
    totalPriorTxs: number;
    customerSuccessRate: number;
    priorTotalSpend: number;
    recoveryProbability: number;
    confidence: ConfidenceLevel;
    recommendedAction: RecommendedAction;
  }): string {
    const formattedReason = params.failureReason.replace(/_/g, ' ').toLowerCase();
    const actionLabel = params.recommendedAction.replace(/_/g, ' ');

    let customerSegment = '';
    if (params.totalPriorTxs === 0) {
      customerSegment = `As ${params.customerName} is a first-time customer with no prior transaction history, confidence is evaluated as LOW and recovery scoring is weighted primarily on interchange failure recoverability.`;
    } else if (params.customerSuccessRate >= 80) {
      customerSegment = `${params.customerName} is a highly reliable customer with a ${params.customerSuccessRate}% historical settlement rate across ${params.totalPriorTxs} previous transaction(s) (lifetime value: ₹${params.priorTotalSpend.toLocaleString()}).`;
    } else {
      customerSegment = `${params.customerName} has completed ${params.customerSuccessRate}% of their ${params.totalPriorTxs} previous attempt(s), showing mixed payment reliability.`;
    }

    let failureContext = '';
    switch (params.failureReason) {
      case 'BANK_TIMEOUT':
        failureContext = `The failure was caused by a transient bank gateway timeout on the ${params.paymentMethod} rail. Temporary gateway dropouts have strong recovery elasticity once traffic clears.`;
        break;
      case 'INSUFFICIENT_BALANCE':
        failureContext = `The failure was caused by insufficient funds. Automated smart dunning or an instant payment link notification offers the highest probability for customer top-up and completion.`;
        break;
      case 'CARD_DECLINED':
        failureContext = `The card issuer declined the authorization request. Re-requesting the same card is unlikely to succeed without customer intervention or an alternate payment method.`;
        break;
      case 'AUTHENTICATION_FAILURE':
        failureContext = `The payment failed due to an OTP or 3D Secure verification timeout. A timed retry window allows the customer to re-authenticate seamlessly.`;
        break;
      case 'TRANSACTION_LIMIT':
        failureContext = `The transaction exceeded customer banking limits. Routing to split charges or alternate payment rails (e.g. Net Banking or UPI) is advised.`;
        break;
      case 'CUSTOMER_ABANDONMENT':
        failureContext = `The customer abandoned the checkout session before completing verification. Direct payment link delivery recovers high intent.`;
        break;
      default:
        failureContext = `The transaction encountered an interchange failure (${formattedReason}) on the ${params.paymentMethod} network.`;
        break;
    }

    let actionContext = '';
    switch (params.recommendedAction) {
      case 'RETRY_NOW':
        actionContext = `RecoverAI recommends an immediate smart retry (${actionLabel}) as technical network conditions have normalized.`;
        break;
      case 'WAIT_AND_RETRY':
        actionContext = `RecoverAI recommends a calculated delay (${actionLabel}) to avoid consecutive bank reject thresholds.`;
        break;
      case 'SEND_PAYMENT_LINK':
        actionContext = `RecoverAI recommends dispatching a dynamic payment link (${actionLabel}) via customer notifications.`;
        break;
      case 'SUGGEST_ALTERNATE_METHOD':
        actionContext = `RecoverAI recommends prompting the customer with an alternate payment rail (${actionLabel}) like UPI or Net Banking.`;
        break;
      case 'STOP_RECOVERY':
        actionContext = `RecoverAI recommends halting automated attempts (${actionLabel}) to protect merchant authorization health scores.`;
        break;
    }

    return `RecoverAI analyzed this failed payment: ${failureContext} ${customerSegment} With a calculated recovery probability of ${params.recoveryProbability}% (${params.confidence} confidence), ${actionContext}`;
  }
}

export const recoveryEngine = new RecoveryEngine();

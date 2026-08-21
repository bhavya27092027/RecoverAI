import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { recoveryEngine } from '../ai/recoveryEngine';
import { recoveryAgent } from '../recovery/recoveryAgent';
import { isEligibleForAutonomousExecution, RECOVERY_CONFIG } from '../recovery/recoveryConfig';
import { RecoveryAnalysis } from '../models/RecoveryAnalysis.model';
import { RecoveryAttempt } from '../models/RecoveryAttempt.model';
import { RecoveryEvent } from '../models/RecoveryEvent.model';
import { PaymentLink } from '../models/PaymentLink.model';
import { Transaction } from '../models/Transaction.model';

export const analyzeTransaction = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const merchant = req.merchant;
    if (!merchant) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const id = req.params.id as string;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: 'Invalid transaction ID' });
      return;
    }

    const analysis = await recoveryEngine.analyzePayment(id, merchant._id);

    res.status(200).json({
      success: true,
      message: 'Payment recovery analysis completed successfully',
      data: analysis,
    });
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('Only FAILED')) {
      res.status(400).json({ success: false, error: error.message });
      return;
    }
    next(error);
  }
};

export const getTransactionRecoveryAnalysis = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const merchant = req.merchant;
    if (!merchant) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const id = req.params.id as string;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: 'Invalid transaction ID' });
      return;
    }

    const analysis = await RecoveryAnalysis.findOne({
      transactionId: id,
      merchantId: merchant._id,
    });

    res.status(200).json({
      success: true,
      data: analysis || null,
    });
  } catch (error) {
    next(error);
  }
};

export const getRecoveryOpportunities = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const merchant = req.merchant;
    if (!merchant) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { probabilityTier, recommendedAction } = req.query;

    const filter: any = { merchantId: merchant._id };

    // Apply Tier Filter
    if (probabilityTier === 'HIGH') {
      filter.recoveryProbability = { $gte: 80 };
    } else if (probabilityTier === 'MEDIUM') {
      filter.recoveryProbability = { $gte: 60, $lt: 80 };
    } else if (probabilityTier === 'LOW') {
      filter.recoveryProbability = { $lt: 60 };
    }

    // Apply Action Filter
    if (
      recommendedAction &&
      recommendedAction !== 'ALL' &&
      typeof recommendedAction === 'string'
    ) {
      filter.recommendedAction = recommendedAction;
    }

    // Fetch opportunities sorted by recoveryProbability descending
    const opportunities: any = await RecoveryAnalysis.find(filter)
      .sort({ recoveryProbability: -1, createdAt: -1 })
      .populate('transactionId', 'amount currency paymentMethod failureReason status recoveredAmount recoveredAt createdAt description')
      .populate('customerId', 'name email phone')
      .lean();

    // Summary calculation for the merchant across all active analyses
    const allMerchantAnalyses: any = await RecoveryAnalysis.find({
      merchantId: merchant._id,
    })
      .populate('transactionId', 'status')
      .lean();

    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    let potentialRecoverableRevenue = 0;

    for (const item of allMerchantAnalyses) {
      // Only count unrecovered failed transactions towards active potential pipeline
      if (item.transactionId?.status !== 'RECOVERED') {
        potentialRecoverableRevenue += item.expectedRecoveryAmount || 0;
      }
      if (item.recoveryProbability >= 80) {
        highCount++;
      } else if (item.recoveryProbability >= 60) {
        mediumCount++;
      } else {
        lowCount++;
      }
    }

    const formattedData = opportunities
      .filter((opp: any) => opp.transactionId !== null)
      .map((opp: any) => ({
        id: opp._id,
        transactionId: opp.transactionId?._id || opp.transactionId,
        recoveryProbability: opp.recoveryProbability,
        confidence: opp.confidence,
        recommendedAction: opp.recommendedAction,
        expectedRecoveryAmount: opp.expectedRecoveryAmount,
        reasoning: opp.reasoning,
        factors: opp.factors,
        createdAt: opp.createdAt,
        isAutonomousReady: isEligibleForAutonomousExecution(
          opp.recoveryProbability,
          opp.confidence
        ),
        transaction: opp.transactionId
          ? {
              id: opp.transactionId._id,
              amount: opp.transactionId.amount,
              currency: opp.transactionId.currency,
              paymentMethod: opp.transactionId.paymentMethod,
              failureReason: opp.transactionId.failureReason,
              status: opp.transactionId.status,
              recoveredAmount: opp.transactionId.recoveredAmount,
              recoveredAt: opp.transactionId.recoveredAt,
              createdAt: opp.transactionId.createdAt,
            }
          : null,
        customer: opp.customerId
          ? {
              id: opp.customerId._id,
              name: opp.customerId.name,
              email: opp.customerId.email,
              phone: opp.customerId.phone,
            }
          : null,
      }));

    res.status(200).json({
      success: true,
      data: formattedData,
      summary: {
        totalOpportunities: allMerchantAnalyses.length,
        highPriorityCount: highCount,
        mediumPriorityCount: mediumCount,
        lowPriorityCount: lowCount,
        potentialRecoverableRevenue,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/recovery/:transactionId/execute
 * Autonomous or Triggered Recovery Execution
 */
export const executeRecovery = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const merchant = req.merchant;
    if (!merchant) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const transactionId = req.params.transactionId as string;
    if (!transactionId || !mongoose.Types.ObjectId.isValid(transactionId)) {
      res.status(400).json({ success: false, error: 'Invalid transaction ID' });
      return;
    }

    const result = await recoveryAgent.executeRecovery(transactionId, merchant._id, {
      isManualApproval: false,
    });

    res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/recovery/:transactionId/approve
 * Merchant-Approved Recovery Execution
 */
export const approveRecovery = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const merchant = req.merchant;
    if (!merchant) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const transactionId = req.params.transactionId as string;
    if (!transactionId || !mongoose.Types.ObjectId.isValid(transactionId)) {
      res.status(400).json({ success: false, error: 'Invalid transaction ID' });
      return;
    }

    const result = await recoveryAgent.executeRecovery(transactionId, merchant._id, {
      isManualApproval: true,
    });

    res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/recovery/:transactionId/simulate-payment
 * Simulate customer settling payment link or alternate payment method
 */
export const simulatePayment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const merchant = req.merchant;
    if (!merchant) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const transactionId = req.params.transactionId as string;
    const { alternatePaymentMethod, mode } = req.body;

    if (!transactionId || !mongoose.Types.ObjectId.isValid(transactionId)) {
      res.status(400).json({ success: false, error: 'Invalid transaction ID' });
      return;
    }

    let result;
    if (mode === 'ALTERNATE_METHOD' || alternatePaymentMethod) {
      result = await recoveryAgent.simulateAlternatePayment(
        transactionId,
        merchant._id,
        alternatePaymentMethod
      );
    } else {
      result = await recoveryAgent.simulateCustomerPayment(transactionId, merchant._id);
    }

    res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/recovery/:transactionId
 * Full Recovery Details (Transaction + Analysis + Attempts + Events + Link)
 */
export const getRecoveryDetails = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const merchant = req.merchant;
    if (!merchant) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const transactionId = req.params.transactionId as string;
    if (!transactionId || !mongoose.Types.ObjectId.isValid(transactionId)) {
      res.status(400).json({ success: false, error: 'Invalid transaction ID' });
      return;
    }

    const txObjId = new mongoose.Types.ObjectId(transactionId);
    const merchObjId = new mongoose.Types.ObjectId(merchant._id.toString());

    const transaction = await Transaction.findOne({
      _id: txObjId,
      merchantId: merchObjId,
    }).populate('customerId', 'name email phone');

    if (!transaction) {
      res.status(404).json({ success: false, error: 'Transaction not found.' });
      return;
    }

    const analysis = await RecoveryAnalysis.findOne({
      transactionId: txObjId,
      merchantId: merchObjId,
    });

    const attempts = await RecoveryAttempt.find({
      transactionId: txObjId,
      merchantId: merchObjId,
    }).sort({ attemptNumber: -1 });

    const events = await RecoveryEvent.find({
      transactionId: txObjId,
      merchantId: merchObjId,
    }).sort({ timestamp: 1 });

    const paymentLink = await PaymentLink.findOne({
      transactionId: txObjId,
      merchantId: merchObjId,
    });

    res.status(200).json({
      success: true,
      data: {
        transaction,
        analysis,
        attempts,
        events,
        paymentLink,
        isAutonomousReady: analysis
          ? isEligibleForAutonomousExecution(analysis.recoveryProbability, analysis.confidence)
          : false,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/recovery/:transactionId/events
 * Chronological agent event timeline
 */
export const getRecoveryEvents = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const merchant = req.merchant;
    if (!merchant) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const transactionId = req.params.transactionId as string;
    if (!transactionId || !mongoose.Types.ObjectId.isValid(transactionId)) {
      res.status(400).json({ success: false, error: 'Invalid transaction ID' });
      return;
    }

    const events = await RecoveryEvent.find({
      transactionId,
      merchantId: merchant._id,
    }).sort({ timestamp: 1 });

    res.status(200).json({
      success: true,
      data: events,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/recovery/:transactionId/attempts
 * Recovery attempts history
 */
export const getRecoveryAttempts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const merchant = req.merchant;
    if (!merchant) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const transactionId = req.params.transactionId as string;
    if (!transactionId || !mongoose.Types.ObjectId.isValid(transactionId)) {
      res.status(400).json({ success: false, error: 'Invalid transaction ID' });
      return;
    }

    const attempts = await RecoveryAttempt.find({
      transactionId,
      merchantId: merchant._id,
    }).sort({ attemptNumber: -1 });

    res.status(200).json({
      success: true,
      data: attempts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/recovery/metrics
 * Recovery performance metrics
 */
export const getRecoveryMetrics = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const merchant = req.merchant;
    if (!merchant) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const merchId = merchant._id;

    // Unrecovered failed transactions
    const failedUnrecoveredTxs = await Transaction.find({
      merchantId: merchId,
      status: 'FAILED',
    });

    const revenueAtRisk = failedUnrecoveredTxs.reduce(
      (sum, tx) => sum + (tx.amount || 0),
      0
    );

    // Recovered transactions
    const recoveredTxs = await Transaction.find({
      merchantId: merchId,
      status: 'RECOVERED',
    });

    const recoveredRevenue = recoveredTxs.reduce(
      (sum, tx) => sum + (tx.recoveredAmount || tx.amount || 0),
      0
    );

    // Recovery attempts
    const totalAttempts = await RecoveryAttempt.countDocuments({
      merchantId: merchId,
    });

    const successfulAttempts = await RecoveryAttempt.countDocuments({
      merchantId: merchId,
      status: 'SUCCESS',
    });

    const completedAttempts = await RecoveryAttempt.countDocuments({
      merchantId: merchId,
      status: { $in: ['SUCCESS', 'FAILED', 'SKIPPED'] },
    });

    const recoverySuccessRate =
      completedAttempts > 0
        ? Math.round((successfulAttempts / completedAttempts) * 100 * 10) / 10
        : 0;

    // Active AI Recoverable Pipeline (only for unrecovered failed transactions)
    const unrecoveredTxIds = failedUnrecoveredTxs.map((tx) => tx._id);
    const activeAnalyses = await RecoveryAnalysis.find({
      merchantId: merchId,
      transactionId: { $in: unrecoveredTxIds },
    });

    const aiRecoverableRevenue = activeAnalyses.reduce(
      (sum, a) => sum + (a.expectedRecoveryAmount || 0),
      0
    );

    res.status(200).json({
      success: true,
      data: {
        revenueAtRisk,
        recoveredRevenue,
        aiRecoverableRevenue,
        recoveryOpportunities: activeAnalyses.length,
        successfulRecoveries: successfulAttempts,
        recoveryAttempts: totalAttempts,
        recoverySuccessRate,
      },
    });
  } catch (error) {
    next(error);
  }
};

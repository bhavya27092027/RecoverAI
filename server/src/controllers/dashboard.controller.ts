import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { Transaction } from '../models/Transaction.model';
import { RecoveryAnalysis } from '../models/RecoveryAnalysis.model';
import { RecoveryAttempt } from '../models/RecoveryAttempt.model';

export const getDashboardMetrics = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const merchant = req.merchant;

    if (!merchant) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const merchId = merchant._id;

    // Dynamic real-time aggregation from MongoDB Transaction collection
    const [aggResults, attemptsStats, allAnalyses] = await Promise.all([
      Transaction.aggregate([
        {
          $match: { merchantId: merchId },
        },
        {
          $group: {
            _id: null,
            totalTransactions: { $sum: 1 },
            failedPayments: {
              $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] },
            },
            recoveredTransactions: {
              $sum: { $cond: [{ $eq: ['$status', 'RECOVERED'] }, 1, 0] },
            },
            successfulTransactions: {
              $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, 1, 0] },
            },
            revenueAtRisk: {
              $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, '$amount', 0] },
            },
            recoveredRevenue: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 'RECOVERED'] },
                  { $ifNull: ['$recoveredAmount', '$amount'] },
                  0,
                ],
              },
            },
            successfulRevenue: {
              $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, '$amount', 0] },
            },
          },
        },
      ]),
      RecoveryAttempt.aggregate([
        {
          $match: { merchantId: merchId },
        },
        {
          $group: {
            _id: null,
            totalAttempts: { $sum: 1 },
            successfulAttempts: {
              $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, 1, 0] },
            },
            completedAttempts: {
              $sum: {
                $cond: [{ $in: ['$status', ['SUCCESS', 'FAILED', 'SKIPPED']] }, 1, 0],
              },
            },
            autonomousRecoveries: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$status', 'SUCCESS'] },
                      { $ne: ['$metadata.manualApproval', true] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
      RecoveryAnalysis.find({ merchantId: merchId })
        .populate('transactionId', 'status')
        .lean(),
    ]);

    const stats = aggResults[0] || {
      totalTransactions: 0,
      failedPayments: 0,
      recoveredTransactions: 0,
      successfulTransactions: 0,
      revenueAtRisk: 0,
      recoveredRevenue: 0,
      successfulRevenue: 0,
    };

    const attemptMetrics = attemptsStats[0] || {
      totalAttempts: 0,
      successfulAttempts: 0,
      completedAttempts: 0,
      autonomousRecoveries: 0,
    };

    // Calculate AI Recovery Metrics only for active unrecovered failed transactions
    let aiRecoverableRevenue = 0;
    let highPriorityOpportunities = 0;
    let activeOpportunityCount = 0;

    for (const a of allAnalyses) {
      const txStatus = (a.transactionId as any)?.status;
      if (txStatus === 'FAILED') {
        activeOpportunityCount++;
        aiRecoverableRevenue += a.expectedRecoveryAmount || 0;
        if (a.recoveryProbability >= 80) {
          highPriorityOpportunities++;
        }
      }
    }

    // Calculate recovery rate: Recovered / (Recovered + Failed)
    const recoveryDenominator = stats.recoveredTransactions + stats.failedPayments;
    const recoveryRate =
      recoveryDenominator > 0
        ? Math.round((stats.recoveredTransactions / recoveryDenominator) * 100)
        : 0;

    // Recovery Success Rate: Successful Recoveries / Completed Recovery Attempts
    const recoverySuccessRate =
      attemptMetrics.completedAttempts > 0
        ? Math.round(
            (attemptMetrics.successfulAttempts / attemptMetrics.completedAttempts) * 100 * 10
          ) / 10
        : 0;

    const metrics = {
      revenueAtRisk: stats.revenueAtRisk,
      recoveredRevenue: stats.recoveredRevenue,
      successfulRevenue: stats.successfulRevenue,
      recoveryRate,
      recoverySuccessRate,
      failedPayments: stats.failedPayments,
      totalTransactions: stats.totalTransactions,
      recoveredTransactions: stats.recoveredTransactions,
      recoveryAttempts: attemptMetrics.totalAttempts,
      successfulRecoveries: attemptMetrics.successfulAttempts,
      autonomousRecoveries: attemptMetrics.autonomousRecoveries,
      aiRecoverableRevenue,
      recoveryOpportunities: activeOpportunityCount,
      highPriorityOpportunities,
      currency: '₹',
      merchantId: merchant._id,
      businessName: merchant.businessName,
      onboardingCompleted: merchant.onboardingCompleted,
      connectedGatewaysCount: merchant.preferredPaymentMethods.length,
      lastSync: new Date().toISOString(),
    };

    res.status(200).json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    next(error);
  }
};

export const getRecentTransactions = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const merchant = req.merchant;

    if (!merchant) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const limit = Math.min(10, Math.max(1, parseInt(req.query.limit as string, 10) || 5));

    const transactions: any = await Transaction.find({ merchantId: merchant._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('customerId', 'name email')
      .lean();

    const formatted = transactions.map((t: any) => ({
      id: t._id,
      amount: t.amount,
      currency: t.currency,
      paymentMethod: t.paymentMethod,
      status: t.status,
      failureReason: t.failureReason,
      recoveredAmount: t.recoveredAmount,
      recoveredAt: t.recoveredAt,
      createdAt: t.createdAt,
      customer: t.customerId
        ? {
            id: t.customerId._id,
            name: t.customerId.name,
            email: t.customerId.email,
          }
        : null,
    }));

    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    next(error);
  }
};

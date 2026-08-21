import mongoose from 'mongoose';
import { Transaction, FailureReason, TransactionPaymentMethod } from '../models/Transaction.model';
import { Customer } from '../models/Customer.model';
import { RecoveryAnalysis } from '../models/RecoveryAnalysis.model';
import { RecoveryAttempt } from '../models/RecoveryAttempt.model';

export type DateRange = '7D' | '30D' | '90D' | 'ALL';

export class AnalyticsService {
  /**
   * Helper to compute start date filter from DateRange
   */
  private getDateFilter(range: DateRange): Date | null {
    const now = new Date();
    switch (range) {
      case '7D':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30D':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90D':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case 'ALL':
      default:
        return null;
    }
  }

  /**
   * 1. High-level Overview KPIs
   */
  public async getOverview(merchantId: mongoose.Types.ObjectId) {
    const [transactions, analyses, attempts] = await Promise.all([
      Transaction.find({ merchantId }).lean(),
      RecoveryAnalysis.find({ merchantId }).lean(),
      RecoveryAttempt.find({ merchantId }).lean(),
    ]);

    const totalTransactions = transactions.length;
    const totalVolume = transactions.reduce((acc, t) => acc + t.amount, 0);

    const successTxs = transactions.filter((t) => t.status === 'SUCCESS');
    const successfulRevenue = successTxs.reduce((acc, t) => acc + t.amount, 0);
    const successfulTransactions = successTxs.length;

    const failedTxs = transactions.filter((t) => t.status === 'FAILED');
    const revenueAtRisk = failedTxs.reduce((acc, t) => acc + t.amount, 0);
    const failedTransactions = failedTxs.length;

    const recoveredTxs = transactions.filter((t) => t.status === 'RECOVERED');
    const recoveredRevenue = recoveredTxs.reduce(
      (acc, t) => acc + (t.recoveredAmount || t.amount || 0),
      0
    );
    const recoveredTransactions = recoveredTxs.length;

    // Total failed revenue before recovery was (revenueAtRisk + recoveredRevenue)
    const totalHistoricalFailedVolume = revenueAtRisk + recoveredRevenue;
    const recoveryRate =
      totalHistoricalFailedVolume > 0
        ? Math.round((recoveredRevenue / totalHistoricalFailedVolume) * 100 * 10) / 10
        : 0;

    const completedAttempts = attempts.filter((a) =>
      ['SUCCESS', 'FAILED', 'SKIPPED'].includes(a.status)
    );
    const successfulAttempts = attempts.filter((a) => a.status === 'SUCCESS');
    const recoverySuccessRate =
      completedAttempts.length > 0
        ? Math.round((successfulAttempts.length / completedAttempts.length) * 100 * 10) / 10
        : 0;

    // Recovery Lift: recovered / (unrecovered failed + recovered)
    const recoveryLift =
      totalHistoricalFailedVolume > 0
        ? Math.round((recoveredRevenue / totalHistoricalFailedVolume) * 100 * 10) / 10
        : 0;

    // Potential AI recoverable pipeline (from active FAILED transactions only)
    const activeFailedTxIds = new Set(failedTxs.map((t) => t._id.toString()));
    const activeAnalyses = analyses.filter((a) =>
      activeFailedTxIds.has(a.transactionId.toString())
    );
    const potentialRecoverableRevenue = activeAnalyses.reduce(
      (acc, a) => acc + (a.expectedRecoveryAmount || 0),
      0
    );

    return {
      totalVolume,
      totalTransactions,
      successfulRevenue,
      successfulTransactions,
      revenueAtRisk,
      failedTransactions,
      recoveredRevenue,
      recoveredTransactions,
      recoveryRate,
      recoverySuccessRate,
      recoveryLift,
      potentialRecoverableRevenue,
      activeRecoveryOpportunities: activeAnalyses.length,
      totalAttempts: completedAttempts.length,
      successfulAttempts: successfulAttempts.length,
    };
  }

  /**
   * 2. Visual Recovery Funnel
   */
  public async getRecoveryFunnel(merchantId: mongoose.Types.ObjectId) {
    const [transactions, analyses, attempts] = await Promise.all([
      Transaction.find({ merchantId }).lean(),
      RecoveryAnalysis.find({ merchantId }).lean(),
      RecoveryAttempt.find({ merchantId }).lean(),
    ]);

    const totalCount = transactions.length;
    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

    // All payments that ever failed (FAILED + RECOVERED)
    const allFailedTxs = transactions.filter(
      (t) => t.status === 'FAILED' || t.status === 'RECOVERED'
    );
    const failedCount = allFailedTxs.length;
    const failedAmount = allFailedTxs.reduce((sum, t) => sum + t.amount, 0);

    // Analyzed payments
    const analyzedTxIds = new Set(analyses.map((a) => a.transactionId.toString()));
    const analyzedTxs = allFailedTxs.filter((t) => analyzedTxIds.has(t._id.toString()));
    const analyzedCount = analyzedTxs.length;
    const analyzedAmount = analyzedTxs.reduce((sum, t) => sum + t.amount, 0);

    // Opportunities identified (prob >= 50% or expectedRecovery > 0)
    const opportunityAnalyses = analyses.filter(
      (a) => a.recoveryProbability >= 50 || a.expectedRecoveryAmount > 0
    );
    const oppTxIds = new Set(opportunityAnalyses.map((a) => a.transactionId.toString()));
    const oppTxs = allFailedTxs.filter((t) => oppTxIds.has(t._id.toString()));
    const oppCount = oppTxs.length;
    const oppAmount = opportunityAnalyses.reduce(
      (sum, a) => sum + (a.expectedRecoveryAmount || 0),
      0
    );

    // Attempted transactions
    const attemptedTxIds = new Set(attempts.map((a) => a.transactionId.toString()));
    const attemptedTxs = allFailedTxs.filter((t) => attemptedTxIds.has(t._id.toString()));
    const attemptedCount = attemptedTxs.length;
    const attemptedAmount = attemptedTxs.reduce((sum, t) => sum + t.amount, 0);

    // Recovered payments
    const recoveredTxs = transactions.filter((t) => t.status === 'RECOVERED');
    const recoveredCount = recoveredTxs.length;
    const recoveredAmount = recoveredTxs.reduce(
      (sum, t) => sum + (t.recoveredAmount || t.amount || 0),
      0
    );

    return {
      funnel: [
        {
          stage: 'Total Transactions',
          count: totalCount,
          amount: totalAmount,
          conversionRate: 100,
        },
        {
          stage: 'Failed Payments',
          count: failedCount,
          amount: failedAmount,
          conversionRate: totalCount > 0 ? Math.round((failedCount / totalCount) * 100) : 0,
        },
        {
          stage: 'AI Analyzed',
          count: analyzedCount,
          amount: analyzedAmount,
          conversionRate: failedCount > 0 ? Math.round((analyzedCount / failedCount) * 100) : 0,
        },
        {
          stage: 'Recovery Opportunities',
          count: oppCount,
          amount: oppAmount,
          conversionRate: analyzedCount > 0 ? Math.round((oppCount / analyzedCount) * 100) : 0,
        },
        {
          stage: 'Recovery Attempted',
          count: attemptedCount,
          amount: attemptedAmount,
          conversionRate: oppCount > 0 ? Math.round((attemptedCount / oppCount) * 100) : 0,
        },
        {
          stage: 'Recovered Revenue',
          count: recoveredCount,
          amount: recoveredAmount,
          conversionRate:
            attemptedCount > 0
              ? Math.round((recoveredCount / attemptedCount) * 100)
              : failedCount > 0
              ? Math.round((recoveredCount / failedCount) * 100)
              : 0,
        },
      ],
      summary: {
        totalFailedRevenue: failedAmount,
        totalRecoveredRevenue: recoveredAmount,
        overallRecoveryRate:
          failedAmount > 0 ? Math.round((recoveredAmount / failedAmount) * 100 * 10) / 10 : 0,
      },
    };
  }

  /**
   * 3. Revenue Trends by Date
   */
  public async getRevenueTrends(
    merchantId: mongoose.Types.ObjectId,
    dateRange: DateRange = '30D'
  ) {
    const startDate = this.getDateFilter(dateRange);
    const query: any = { merchantId };
    if (startDate) {
      query.createdAt = { $gte: startDate };
    }

    const transactions = await Transaction.find(query).sort({ createdAt: 1 }).lean();

    if (transactions.length === 0) {
      return { range: dateRange, points: [] };
    }

    // Group transactions by date (YYYY-MM-DD)
    const pointsMap: Record<
      string,
      {
        date: string;
        successfulRevenue: number;
        failedRevenue: number;
        recoveredRevenue: number;
        totalVolume: number;
        txCount: number;
      }
    > = {};

    transactions.forEach((tx) => {
      const dateKey = new Date(tx.createdAt).toISOString().split('T')[0];
      if (!pointsMap[dateKey]) {
        pointsMap[dateKey] = {
          date: dateKey,
          successfulRevenue: 0,
          failedRevenue: 0,
          recoveredRevenue: 0,
          totalVolume: 0,
          txCount: 0,
        };
      }

      pointsMap[dateKey].totalVolume += tx.amount;
      pointsMap[dateKey].txCount++;

      if (tx.status === 'SUCCESS') {
        pointsMap[dateKey].successfulRevenue += tx.amount;
      } else if (tx.status === 'FAILED') {
        pointsMap[dateKey].failedRevenue += tx.amount;
      } else if (tx.status === 'RECOVERED') {
        pointsMap[dateKey].recoveredRevenue += tx.recoveredAmount || tx.amount;
      }
    });

    const points = Object.values(pointsMap).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    return {
      range: dateRange,
      points,
    };
  }

  /**
   * 4. Recovery Performance Trends
   */
  public async getRecoveryPerformanceTrends(
    merchantId: mongoose.Types.ObjectId,
    dateRange: DateRange = '30D'
  ) {
    const startDate = this.getDateFilter(dateRange);
    const query: any = { merchantId };
    if (startDate) {
      query.createdAt = { $gte: startDate };
    }

    const [attempts, transactions] = await Promise.all([
      RecoveryAttempt.find(query).sort({ createdAt: 1 }).lean(),
      Transaction.find(query).sort({ createdAt: 1 }).lean(),
    ]);

    const dateMap: Record<
      string,
      {
        date: string;
        recoveredRevenue: number;
        failedRevenue: number;
        attemptsCount: number;
        successCount: number;
      }
    > = {};

    transactions.forEach((tx) => {
      const dateKey = new Date(tx.createdAt).toISOString().split('T')[0];
      if (!dateMap[dateKey]) {
        dateMap[dateKey] = {
          date: dateKey,
          recoveredRevenue: 0,
          failedRevenue: 0,
          attemptsCount: 0,
          successCount: 0,
        };
      }
      if (tx.status === 'RECOVERED') {
        dateMap[dateKey].recoveredRevenue += tx.recoveredAmount || tx.amount;
      } else if (tx.status === 'FAILED') {
        dateMap[dateKey].failedRevenue += tx.amount;
      }
    });

    attempts.forEach((att) => {
      const dateKey = new Date(att.createdAt).toISOString().split('T')[0];
      if (!dateMap[dateKey]) {
        dateMap[dateKey] = {
          date: dateKey,
          recoveredRevenue: 0,
          failedRevenue: 0,
          attemptsCount: 0,
          successCount: 0,
        };
      }
      dateMap[dateKey].attemptsCount++;
      if (att.status === 'SUCCESS') {
        dateMap[dateKey].successCount++;
      }
    });

    const points = Object.values(dateMap)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((p) => {
        const totalFailedVol = p.failedRevenue + p.recoveredRevenue;
        const recoveryRate =
          totalFailedVol > 0 ? Math.round((p.recoveredRevenue / totalFailedVol) * 100) : 0;
        const recoverySuccessRate =
          p.attemptsCount > 0 ? Math.round((p.successCount / p.attemptsCount) * 100) : 0;

        return {
          date: p.date,
          recoveredRevenue: p.recoveredRevenue,
          recoveryRate,
          recoverySuccessRate,
          attemptsCount: p.attemptsCount,
          successCount: p.successCount,
        };
      });

    return {
      range: dateRange,
      points,
    };
  }

  /**
   * 5. Payment Failure Breakdown
   */
  public async getFailureBreakdown(merchantId: mongoose.Types.ObjectId) {
    const allReasons: FailureReason[] = [
      'BANK_TIMEOUT',
      'INSUFFICIENT_BALANCE',
      'CARD_DECLINED',
      'AUTHENTICATION_FAILURE',
      'TRANSACTION_LIMIT',
      'CUSTOMER_ABANDONMENT',
    ];

    const [transactions, analyses, attempts] = await Promise.all([
      Transaction.find({
        merchantId,
        failureReason: { $ne: null },
      }).lean(),
      RecoveryAnalysis.find({ merchantId }).lean(),
      RecoveryAttempt.find({ merchantId }).lean(),
    ]);

    const totalFailedCount = transactions.length;

    const breakdown = allReasons.map((reason) => {
      const reasonTxs = transactions.filter((t) => t.failureReason === reason);
      const count = reasonTxs.length;
      const totalAmount = reasonTxs.reduce((sum, t) => sum + t.amount, 0);
      const percentageOfFailures =
        totalFailedCount > 0 ? Math.round((count / totalFailedCount) * 100 * 10) / 10 : 0;

      const reasonTxIds = new Set(reasonTxs.map((t) => t._id.toString()));
      const reasonAnalyses = analyses.filter((a) =>
        reasonTxIds.has(a.transactionId.toString())
      );
      const avgProbability =
        reasonAnalyses.length > 0
          ? Math.round(
              reasonAnalyses.reduce((sum, a) => sum + a.recoveryProbability, 0) /
                reasonAnalyses.length
            )
          : 0;

      const recoveredCount = reasonTxs.filter((t) => t.status === 'RECOVERED').length;
      const reasonAttempts = attempts.filter((a) =>
        reasonTxIds.has(a.transactionId.toString())
      );
      const successfulAttempts = reasonAttempts.filter((a) => a.status === 'SUCCESS').length;
      const successRate =
        reasonAttempts.length > 0
          ? Math.round((successfulAttempts / reasonAttempts.length) * 100 * 10) / 10
          : recoveredCount > 0
          ? 100
          : 0;

      return {
        failureReason: reason,
        count,
        totalAmount,
        percentageOfFailures,
        averageRecoveryProbability: avgProbability,
        recoveredCount,
        recoverySuccessRate: successRate,
      };
    });

    return {
      totalFailures: totalFailedCount,
      breakdown,
    };
  }

  /**
   * 6. Payment Method Performance
   */
  public async getPaymentMethodPerformance(merchantId: mongoose.Types.ObjectId) {
    const rails: TransactionPaymentMethod[] = ['UPI', 'Credit Card', 'Debit Card', 'Net Banking'];

    const transactions = await Transaction.find({ merchantId }).lean();

    let bestRail: string | null = null;
    let highestScore = -1;

    const breakdown = rails.map((rail) => {
      const railTxs = transactions.filter((t) => t.paymentMethod === rail);
      const count = railTxs.length;
      const volume = railTxs.reduce((sum, t) => sum + t.amount, 0);

      const successTxs = railTxs.filter((t) => t.status === 'SUCCESS');
      const successCount = successTxs.length;
      const successRate =
        count > 0 ? Math.round((successCount / count) * 100 * 10) / 10 : 0;

      const failedTxs = railTxs.filter((t) => t.status === 'FAILED');
      const failureCount = failedTxs.length;
      const failureRate =
        count > 0 ? Math.round((failureCount / count) * 100 * 10) / 10 : 0;

      const recoveredTxs = railTxs.filter((t) => t.status === 'RECOVERED');
      const recoveredCount = recoveredTxs.length;
      const recoveredRevenue = recoveredTxs.reduce(
        (sum, t) => sum + (t.recoveredAmount || t.amount || 0),
        0
      );

      const totalDropped = failureCount + recoveredCount;
      const recoveryRate =
        totalDropped > 0 ? Math.round((recoveredCount / totalDropped) * 100 * 10) / 10 : 0;

      // Evaluation score for best rail
      if (count >= 1 && successRate > highestScore) {
        highestScore = successRate;
        bestRail = rail;
      }

      return {
        paymentMethod: rail,
        count,
        volume,
        successCount,
        successRate,
        failureCount,
        failureRate,
        recoveredCount,
        recoveredRevenue,
        recoveryRate,
      };
    });

    return {
      bestPerformingMethod: bestRail || 'UPI',
      breakdown,
    };
  }

  /**
   * 7. Recovery Strategy Performance
   */
  public async getRecoveryStrategyPerformance(merchantId: mongoose.Types.ObjectId) {
    const strategies = [
      'RETRY_NOW',
      'WAIT_AND_RETRY',
      'SEND_PAYMENT_LINK',
      'SUGGEST_ALTERNATE_METHOD',
      'STOP_RECOVERY',
    ];

    const attempts = await RecoveryAttempt.find({ merchantId }).lean();
    const transactions = await Transaction.find({
      merchantId,
      status: 'RECOVERED',
    }).lean();
    const recoveredTxMap = new Map(
      transactions.map((t) => [t._id.toString(), t.recoveredAmount || t.amount])
    );

    const breakdown = strategies.map((strategy) => {
      const strategyAttempts = attempts.filter((a) => a.action === strategy);
      const totalAttempts = strategyAttempts.length;
      const successfulAttempts = strategyAttempts.filter((a) => a.status === 'SUCCESS');
      const successCount = successfulAttempts.length;
      const successRate =
        totalAttempts > 0
          ? Math.round((successCount / totalAttempts) * 100 * 10) / 10
          : 0;

      const revenueRecovered = successfulAttempts.reduce((sum, a) => {
        return sum + (recoveredTxMap.get(a.transactionId.toString()) || a.amount || 0);
      }, 0);

      return {
        action: strategy,
        attempts: totalAttempts,
        successfulRecoveries: successCount,
        successRate,
        revenueRecovered,
      };
    });

    return { breakdown };
  }

  /**
   * 8. Autonomous vs Human Approval Comparison
   */
  public async getAutonomousVsHumanComparison(merchantId: mongoose.Types.ObjectId) {
    const attempts = await RecoveryAttempt.find({ merchantId }).lean();
    const transactions = await Transaction.find({
      merchantId,
      status: 'RECOVERED',
    }).lean();
    const recoveredTxMap = new Map(
      transactions.map((t) => [t._id.toString(), t.recoveredAmount || t.amount])
    );

    let autoAttempts = 0;
    let autoSuccess = 0;
    let autoRevenue = 0;

    let humanAttempts = 0;
    let humanSuccess = 0;
    let humanRevenue = 0;

    attempts.forEach((att) => {
      const isAuto = att.metadata?.isAutonomous === true;
      const rev =
        att.status === 'SUCCESS'
          ? recoveredTxMap.get(att.transactionId.toString()) || att.amount || 0
          : 0;

      if (isAuto) {
        autoAttempts++;
        if (att.status === 'SUCCESS') {
          autoSuccess++;
          autoRevenue += rev;
        }
      } else {
        humanAttempts++;
        if (att.status === 'SUCCESS') {
          humanSuccess++;
          humanRevenue += rev;
        }
      }
    });

    const autoSuccessRate =
      autoAttempts > 0 ? Math.round((autoSuccess / autoAttempts) * 100 * 10) / 10 : 0;
    const humanSuccessRate =
      humanAttempts > 0 ? Math.round((humanSuccess / humanAttempts) * 100 * 10) / 10 : 0;

    return {
      autonomous: {
        attempts: autoAttempts,
        successfulRecoveries: autoSuccess,
        successRate: autoSuccessRate,
        revenueRecovered: autoRevenue,
      },
      humanApproved: {
        attempts: humanAttempts,
        successfulRecoveries: humanSuccess,
        successRate: humanSuccessRate,
        revenueRecovered: humanRevenue,
      },
    };
  }

  /**
   * 9. Customer Recovery Segments
   */
  public async getCustomerSegments(merchantId: mongoose.Types.ObjectId) {
    const [customers, transactions, analyses] = await Promise.all([
      Customer.find({ merchantId }).lean(),
      Transaction.find({ merchantId }).lean(),
      RecoveryAnalysis.find({ merchantId }).lean(),
    ]);

    if (customers.length === 0) {
      return {
        segments: {
          HIGH_VALUE_HIGH_RECOVERY: { count: 0, totalLtv: 0, recoverablePipeline: 0, customers: [] },
          HIGH_VALUE_LOW_RECOVERY: { count: 0, totalLtv: 0, recoverablePipeline: 0, customers: [] },
          LOW_VALUE_HIGH_RECOVERY: { count: 0, totalLtv: 0, recoverablePipeline: 0, customers: [] },
          LOW_VALUE_LOW_RECOVERY: { count: 0, totalLtv: 0, recoverablePipeline: 0, customers: [] },
        },
      };
    }

    const txMap: Record<string, typeof transactions> = {};
    transactions.forEach((t) => {
      const cid = t.customerId.toString();
      if (!txMap[cid]) txMap[cid] = [];
      txMap[cid].push(t);
    });

    const analysisMap: Record<string, typeof analyses> = {};
    analyses.forEach((a) => {
      const cid = a.customerId.toString();
      if (!analysisMap[cid]) analysisMap[cid] = [];
      analysisMap[cid].push(a);
    });

    const segments = {
      HIGH_VALUE_HIGH_RECOVERY: { count: 0, totalLtv: 0, recoverablePipeline: 0, customers: [] as any[] },
      HIGH_VALUE_LOW_RECOVERY: { count: 0, totalLtv: 0, recoverablePipeline: 0, customers: [] as any[] },
      LOW_VALUE_HIGH_RECOVERY: { count: 0, totalLtv: 0, recoverablePipeline: 0, customers: [] as any[] },
      LOW_VALUE_LOW_RECOVERY: { count: 0, totalLtv: 0, recoverablePipeline: 0, customers: [] as any[] },
    };

    customers.forEach((cust) => {
      const cid = cust._id.toString();
      const userTxs = txMap[cid] || [];
      const userAnalyses = analysisMap[cid] || [];

      const settledTxs = userTxs.filter((t) => t.status === 'SUCCESS' || t.status === 'RECOVERED');
      const ltv = settledTxs.reduce((sum, t) => sum + (t.recoveredAmount || t.amount), 0);

      const failedTxIds = new Set(
        userTxs.filter((t) => t.status === 'FAILED').map((t) => t._id.toString())
      );
      const activeAnalyses = userAnalyses.filter((a) =>
        failedTxIds.has(a.transactionId.toString())
      );

      const avgProb =
        activeAnalyses.length > 0
          ? activeAnalyses.reduce((sum, a) => sum + a.recoveryProbability, 0) / activeAnalyses.length
          : userAnalyses.length > 0
          ? userAnalyses.reduce((sum, a) => sum + a.recoveryProbability, 0) / userAnalyses.length
          : 50;

      const recoverable = activeAnalyses.reduce(
        (sum, a) => sum + (a.expectedRecoveryAmount || 0),
        0
      );

      const isHighValue = ltv >= 15000 || userTxs.length >= 3;
      const isHighRecovery = avgProb >= 65;

      const customerPayload = {
        id: cid,
        name: cust.name,
        email: cust.email,
        ltv,
        totalTransactions: userTxs.length,
        avgProbability: Math.round(avgProb),
        recoverableRevenue: recoverable,
      };

      if (isHighValue && isHighRecovery) {
        segments.HIGH_VALUE_HIGH_RECOVERY.count++;
        segments.HIGH_VALUE_HIGH_RECOVERY.totalLtv += ltv;
        segments.HIGH_VALUE_HIGH_RECOVERY.recoverablePipeline += recoverable;
        segments.HIGH_VALUE_HIGH_RECOVERY.customers.push(customerPayload);
      } else if (isHighValue && !isHighRecovery) {
        segments.HIGH_VALUE_LOW_RECOVERY.count++;
        segments.HIGH_VALUE_LOW_RECOVERY.totalLtv += ltv;
        segments.HIGH_VALUE_LOW_RECOVERY.recoverablePipeline += recoverable;
        segments.HIGH_VALUE_LOW_RECOVERY.customers.push(customerPayload);
      } else if (!isHighValue && isHighRecovery) {
        segments.LOW_VALUE_HIGH_RECOVERY.count++;
        segments.LOW_VALUE_HIGH_RECOVERY.totalLtv += ltv;
        segments.LOW_VALUE_HIGH_RECOVERY.recoverablePipeline += recoverable;
        segments.LOW_VALUE_HIGH_RECOVERY.customers.push(customerPayload);
      } else {
        segments.LOW_VALUE_LOW_RECOVERY.count++;
        segments.LOW_VALUE_LOW_RECOVERY.totalLtv += ltv;
        segments.LOW_VALUE_LOW_RECOVERY.recoverablePipeline += recoverable;
        segments.LOW_VALUE_LOW_RECOVERY.customers.push(customerPayload);
      }
    });

    return { segments };
  }
}

export const analyticsService = new AnalyticsService();

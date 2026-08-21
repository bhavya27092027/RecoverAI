import mongoose from 'mongoose';
import { Transaction } from '../models/Transaction.model';
import { Customer } from '../models/Customer.model';
import { RecoveryAnalysis } from '../models/RecoveryAnalysis.model';
import { RecoveryAttempt } from '../models/RecoveryAttempt.model';

export type InsightPriority = 'HIGH' | 'MEDIUM' | 'INFO';
export type DataConfidence = 'HIGH_CONFIDENCE' | 'MEDIUM_CONFIDENCE' | 'LIMITED_DATA';

export interface IAiInsight {
  id: string;
  category:
    | 'REVENUE'
    | 'RECOVERY_POTENTIAL'
    | 'RECOVERY_PERFORMANCE'
    | 'FAILURE_PATTERNS'
    | 'PAYMENT_RAILS'
    | 'CUSTOMER_BEHAVIOR'
    | 'CUSTOMER_INTELLIGENCE';
  title: string;
  description: string;
  impactLevel: InsightPriority;
  dataConfidence: DataConfidence;
  metricHighlight?: string;
  actionableRecommendation?: string;
}

export class InsightsService {
  /**
   * Generates dynamic, prioritized, data-driven financial insights for the authenticated merchant.
   */
  public async getMerchantInsights(merchantId: mongoose.Types.ObjectId): Promise<IAiInsight[]> {
    const insights: IAiInsight[] = [];

    // Fetch merchant records
    const [transactions, analyses, customers, attempts] = await Promise.all([
      Transaction.find({ merchantId }).lean(),
      RecoveryAnalysis.find({ merchantId }).lean(),
      Customer.find({ merchantId }).lean(),
      RecoveryAttempt.find({ merchantId }).lean(),
    ]);

    const totalTxs = transactions.length;
    const failedTxs = transactions.filter((t) => t.status === 'FAILED');
    const recoveredTxs = transactions.filter((t) => t.status === 'RECOVERED');
    const successfulAttempts = attempts.filter((a) => a.status === 'SUCCESS');
    const completedAttempts = attempts.filter((a) =>
      ['SUCCESS', 'FAILED', 'SKIPPED'].includes(a.status)
    );

    const totalRecoveredRevenue = recoveredTxs.reduce(
      (sum, t) => sum + (t.recoveredAmount || t.amount || 0),
      0
    );

    const dataConfidence: DataConfidence =
      totalTxs >= 15 ? 'HIGH_CONFIDENCE' : totalTxs >= 5 ? 'MEDIUM_CONFIDENCE' : 'LIMITED_DATA';

    // 0 Transactions Empty State
    if (totalTxs === 0) {
      return [
        {
          id: 'initial-setup',
          category: 'REVENUE',
          title: 'Start Processing Transactions to Unlock AI Insights',
          description:
            'Your AI recovery intelligence engine is ready. Create transactions or ingest payment webhooks to begin generating automated salvage insights.',
          impactLevel: 'INFO',
          dataConfidence: 'LIMITED_DATA',
          metricHighlight: '0 Transactions',
          actionableRecommendation: 'Record your first customer payment to unlock deep failure intelligence.',
        },
      ];
    }

    // 1. REVENUE RECOVERABLE / PIPELINE INSIGHT (Priority 1)
    const activeUnrecoveredTxIds = new Set(failedTxs.map((t) => t._id.toString()));
    const activeAnalyses = analyses.filter((a) =>
      activeUnrecoveredTxIds.has(a.transactionId.toString())
    );
    const totalExpectedRecovery = activeAnalyses.reduce(
      (sum, a) => sum + (a.expectedRecoveryAmount || 0),
      0
    );
    const highProbAnalyses = activeAnalyses.filter((a) => a.recoveryProbability >= 80);

    if (activeAnalyses.length > 0) {
      insights.push({
        id: 'revenue-recoverable-pipeline',
        category: 'RECOVERY_POTENTIAL',
        title: `₹${totalExpectedRecovery.toLocaleString()} in Open Recoverable Revenue`,
        description: `RecoverAI identified ${activeAnalyses.length} open failed payment attempt(s), including ${highProbAnalyses.length} high-probability candidate(s) ready for intelligent recovery.`,
        impactLevel: totalExpectedRecovery >= 10000 ? 'HIGH' : 'MEDIUM',
        dataConfidence,
        metricHighlight: `₹${totalExpectedRecovery.toLocaleString()} Recoverable`,
        actionableRecommendation: 'Review high-priority items in the Recovery Center for immediate automated execution.',
      });
    }

    // 2. RECOVERY PERFORMANCE INSIGHT (Priority 2)
    if (recoveredTxs.length > 0 || completedAttempts.length > 0) {
      const successRate =
        completedAttempts.length > 0
          ? Math.round((successfulAttempts.length / completedAttempts.length) * 100 * 10) / 10
          : 0;

      // Find top winning strategy
      const strategyStats: Record<string, { total: number; success: number }> = {};
      attempts.forEach((att) => {
        if (!strategyStats[att.action]) {
          strategyStats[att.action] = { total: 0, success: 0 };
        }
        strategyStats[att.action].total++;
        if (att.status === 'SUCCESS') strategyStats[att.action].success++;
      });

      let bestStrategy = '';
      let bestStrategyRate = -1;
      for (const [strat, s] of Object.entries(strategyStats)) {
        if (s.total >= 1) {
          const rate = Math.round((s.success / s.total) * 100);
          if (rate > bestStrategyRate) {
            bestStrategyRate = rate;
            bestStrategy = strat.replace(/_/g, ' ');
          }
        }
      }

      insights.push({
        id: 'recovery-performance-salvage',
        category: 'RECOVERY_PERFORMANCE',
        title: `RecoverAI Salvaged ₹${totalRecoveredRevenue.toLocaleString()} in Churned Revenue`,
        description: `Your autonomous recovery pipeline achieved a ${successRate}% recovery success rate across ${completedAttempts.length} attempt(s).${
          bestStrategy ? ` ${bestStrategy} has the highest recovery rate (${bestStrategyRate}%).` : ''
        }`,
        impactLevel: 'HIGH',
        dataConfidence,
        metricHighlight: `${successRate}% Success Rate`,
        actionableRecommendation: 'Autonomous retry rules are converting previously lost churn into settled cashflow.',
      });
    }

    // 3. FAILURE PATTERNS INSIGHT (Priority 3)
    if (failedTxs.length > 0) {
      const failureCounts: Record<string, { count: number; volume: number }> = {};
      failedTxs.forEach((t) => {
        const reason = t.failureReason || 'UNKNOWN';
        if (!failureCounts[reason]) {
          failureCounts[reason] = { count: 0, volume: 0 };
        }
        failureCounts[reason].count++;
        failureCounts[reason].volume += t.amount;
      });

      let topReason = '';
      let topCount = 0;
      let topVolume = 0;
      for (const [reason, stats] of Object.entries(failureCounts)) {
        if (stats.volume > topVolume) {
          topVolume = stats.volume;
          topCount = stats.count;
          topReason = reason;
        }
      }

      const totalFailedVol = failedTxs.reduce((sum, t) => sum + t.amount, 0);
      const topShare = totalFailedVol > 0 ? Math.round((topVolume / totalFailedVol) * 100) : 0;
      const formattedReason = topReason.replace(/_/g, ' ');

      insights.push({
        id: 'failure-patterns-dominant',
        category: 'FAILURE_PATTERNS',
        title: `${formattedReason} Accounts for ${topShare}% of Failed Payment Value`,
        description: `${formattedReason} is responsible for ₹${topVolume.toLocaleString()} across ${topCount} failed transaction(s).`,
        impactLevel: topShare >= 40 ? 'HIGH' : 'MEDIUM',
        dataConfidence,
        metricHighlight: `${topShare}% of Losses`,
        actionableRecommendation:
          topReason === 'BANK_TIMEOUT'
            ? 'Bank timeouts have high recovery elasticity via smart delayed retry.'
            : topReason === 'INSUFFICIENT_BALANCE'
            ? 'Sending instant payment link reminders recovers high volume for insufficient balances.'
            : 'Routing to alternate payment rails like UPI prevents permanent checkout abandonment.',
      });
    }

    // 4. PAYMENT METHOD / RAIL PERFORMANCE INSIGHT (Priority 4)
    const railStats: Record<string, { total: number; success: number }> = {};
    transactions.forEach((t) => {
      if (!railStats[t.paymentMethod]) {
        railStats[t.paymentMethod] = { total: 0, success: 0 };
      }
      railStats[t.paymentMethod].total++;
      if (t.status === 'SUCCESS' || t.status === 'RECOVERED') {
        railStats[t.paymentMethod].success++;
      }
    });

    let bestRail = '';
    let bestRate = -1;
    for (const [rail, stats] of Object.entries(railStats)) {
      if (stats.total >= 1) {
        const rate = Math.round((stats.success / stats.total) * 100);
        if (rate > bestRate) {
          bestRate = rate;
          bestRail = rail;
        }
      }
    }

    if (bestRail) {
      insights.push({
        id: 'payment-rails-efficiency',
        category: 'PAYMENT_RAILS',
        title: `${bestRail} Currently Has the Strongest Payment Success Rate`,
        description: `${bestRail} achieves a ${bestRate}% settlement rate across your payment volume. Prioritizing this rail at checkout minimizes initial customer dropouts.`,
        impactLevel: 'MEDIUM',
        dataConfidence,
        metricHighlight: `${bestRate}% Success Rate`,
        actionableRecommendation: `Configure ${bestRail} as a prioritized payment rail in customer checkout options.`,
      });
    }

    // 5. CUSTOMER BEHAVIOR INSIGHT (Priority 5)
    if (customers.length > 0) {
      insights.push({
        id: 'customer-behavior-scoring',
        category: 'CUSTOMER_BEHAVIOR',
        title: 'Customer Payment Profiles & History Synced',
        description: `Your directory contains ${customers.length} customer account(s). Returning customers with verified payment history receive higher-confidence AI recovery scoring.`,
        impactLevel: 'INFO',
        dataConfidence,
        metricHighlight: `${customers.length} Tracked Accounts`,
        actionableRecommendation: 'Maintain clean customer identifiers to maximize AI predictive recovery accuracy.',
      });
    }

    return insights;
  }
}

export const insightsService = new InsightsService();

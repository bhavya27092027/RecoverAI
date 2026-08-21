import React, { useState, useEffect } from 'react';
import {
  getAnalyticsOverviewApi,
  getRecoveryFunnelApi,
  getRevenueTrendsApi,
  getFailureBreakdownApi,
  getPaymentMethodPerformanceApi,
  getRecoveryStrategyPerformanceApi,
  getAutonomousVsHumanComparisonApi,
  getCustomerSegmentsApi,
} from '../api/analytics.api';
import {
  AnalyticsOverview,
  RecoveryFunnelData,
  RevenueTrendsResponse,
  FailureBreakdownResponse,
  PaymentRailPerformanceResponse,
  StrategyPerformanceResponse,
  AutonomousVsHumanResponse,
  CustomerSegmentsResponse,
} from '../types';
import { AnalyticsKpiGrid } from '../components/analytics/AnalyticsKpiGrid';
import { RevenueTrendChart } from '../components/analytics/RevenueTrendChart';
import { RecoveryFunnelCard } from '../components/analytics/RecoveryFunnelCard';
import { FailureBreakdownCard } from '../components/analytics/FailureBreakdownCard';
import { PaymentRailPerformanceCard } from '../components/analytics/PaymentRailPerformanceCard';
import { StrategyPerformanceCard } from '../components/analytics/StrategyPerformanceCard';
import { AutonomousComparisonCard } from '../components/analytics/AutonomousComparisonCard';
import { CustomerSegmentsCard } from '../components/analytics/CustomerSegmentsCard';
import { Button } from '../components/ui/Button';
import { RefreshCw } from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [funnelData, setFunnelData] = useState<RecoveryFunnelData | null>(null);
  const [revenueTrends, setRevenueTrends] = useState<RevenueTrendsResponse | null>(null);
  const [failureBreakdown, setFailureBreakdown] = useState<FailureBreakdownResponse | null>(null);
  const [railPerformance, setRailPerformance] = useState<PaymentRailPerformanceResponse | null>(null);
  const [strategyPerformance, setStrategyPerformance] = useState<StrategyPerformanceResponse | null>(null);
  const [autonomousComparison, setAutonomousComparison] = useState<AutonomousVsHumanResponse | null>(null);
  const [customerSegments, setCustomerSegments] = useState<CustomerSegmentsResponse | null>(null);

  const [dateRange, setDateRange] = useState<'7D' | '30D' | '90D' | 'ALL'>('30D');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalyticsData = async (range = dateRange) => {
    try {
      setIsLoading(true);
      setError(null);

      const [
        overviewRes,
        funnelRes,
        trendsRes,
        failureRes,
        railRes,
        stratRes,
        autoRes,
        segRes,
      ] = await Promise.all([
        getAnalyticsOverviewApi(),
        getRecoveryFunnelApi(),
        getRevenueTrendsApi(range),
        getFailureBreakdownApi(),
        getPaymentMethodPerformanceApi(),
        getRecoveryStrategyPerformanceApi(),
        getAutonomousVsHumanComparisonApi(),
        getCustomerSegmentsApi(),
      ]);

      if (overviewRes.success) setOverview(overviewRes.data);
      if (funnelRes.success) setFunnelData(funnelRes.data);
      if (trendsRes.success) setRevenueTrends(trendsRes.data);
      if (failureRes.success) setFailureBreakdown(failureRes.data);
      if (railRes.success) setRailPerformance(railRes.data);
      if (stratRes.success) setStrategyPerformance(stratRes.data);
      if (autoRes.success) setAutonomousComparison(autoRes.data);
      if (segRes.success) setCustomerSegments(segRes.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData(dateRange);
  }, [dateRange]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-400">
              Merchant Analytics & Intelligence
            </span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse"></span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
            Revenue Recovery Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Deep financial telemetry, payment rail efficiency, and autonomous recovery lift derived from real database records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="md"
            onClick={() => fetchAnalyticsData(dateRange)}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh Analytics
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-300 text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => fetchAnalyticsData(dateRange)}>
            Retry
          </Button>
        </div>
      )}

      {/* 1. Top KPI Grid */}
      <AnalyticsKpiGrid overview={overview} isLoading={isLoading} />

      {/* 2. Revenue Trend Chart */}
      <RevenueTrendChart
        points={revenueTrends?.points || []}
        currentRange={dateRange}
        onRangeChange={(r) => setDateRange(r)}
        isLoading={isLoading}
      />

      {/* 3. Recovery Funnel */}
      <RecoveryFunnelCard funnelData={funnelData} isLoading={isLoading} />

      {/* 4. Failure Breakdown & Payment Rail Performance Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FailureBreakdownCard
          breakdown={failureBreakdown?.breakdown || []}
          isLoading={isLoading}
        />
        <PaymentRailPerformanceCard
          breakdown={railPerformance?.breakdown || []}
          bestMethod={railPerformance?.bestPerformingMethod || 'UPI'}
          isLoading={isLoading}
        />
      </div>

      {/* 5. Strategy Performance & Autonomous Comparison Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StrategyPerformanceCard
          breakdown={strategyPerformance?.breakdown || []}
          isLoading={isLoading}
        />
        <AutonomousComparisonCard
          comparison={autonomousComparison}
          isLoading={isLoading}
        />
      </div>

      {/* 6. Customer Recovery Segments Matrix */}
      <CustomerSegmentsCard
        segmentsData={customerSegments}
        isLoading={isLoading}
      />
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardMetricsApi, getRecentTransactionsApi } from '../api/dashboard.api';
import { getRecoveryOpportunitiesApi } from '../api/recovery.api';
import { getAiInsightsApi } from '../api/analytics.api';
import { seedDemoScenarioApi } from '../api/demo.api';
import {
  DashboardMetrics,
  Transaction,
  RecoveryOpportunity,
  AiInsight,
} from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { CreateTransactionModal } from '../components/transactions/CreateTransactionModal';
import { CreateCustomerModal } from '../components/customers/CreateCustomerModal';
import { AutonomousHeroCard } from '../components/dashboard/AutonomousHeroCard';
import { RecommendedActionBadge } from '../components/recovery/RecommendedActionBadge';
import { RecoveryScoreBadge } from '../components/recovery/RecoveryScoreBadge';
import {
  PlusCircle,
  Sparkles,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  Zap,
  Database,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user, merchant } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [topOpportunities, setTopOpportunities] = useState<RecoveryOpportunity[]>([]);
  const [topInsight, setTopInsight] = useState<AiInsight | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isCreateTxModalOpen, setIsCreateTxModalOpen] = useState(false);
  const [isCreateCustomerModalOpen, setIsCreateCustomerModalOpen] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [metricsRes, txRes, oppsRes, insightsRes] = await Promise.all([
        getDashboardMetricsApi(),
        getRecentTransactionsApi(6),
        getRecoveryOpportunitiesApi(),
        getAiInsightsApi(),
      ]);

      if (metricsRes.success && metricsRes.data) {
        setMetrics(metricsRes.data);
      }
      if (txRes.success && txRes.data) {
        setRecentTransactions(txRes.data);
      }
      if (oppsRes.success && oppsRes.data) {
        // Take top 5 ranked opportunities
        setTopOpportunities(oppsRes.data.slice(0, 5));
      }
      if (insightsRes.success && insightsRes.data && insightsRes.data.length > 0) {
        // Highest impact insight
        const highImpact = insightsRes.data.find((i) => i.impactLevel === 'HIGH') || insightsRes.data[0];
        setTopInsight(highImpact);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleSeedDemoData = async () => {
    try {
      setIsSeeding(true);
      const res = await seedDemoScenarioApi();
      if (res.success) {
        await fetchDashboardData();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to populate demo scenario');
    } finally {
      setIsSeeding(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <Badge variant="success">SUCCESS</Badge>;
      case 'FAILED':
        return <Badge variant="warning">FAILED</Badge>;
      case 'RECOVERED':
        return <Badge variant="brand">RECOVERED</Badge>;
      case 'PROCESSING':
        return <Badge variant="info">PROCESSING</Badge>;
      default:
        return <Badge variant="outline">CREATED</Badge>;
    }
  };

  const hasNoTransactions = (metrics?.totalTransactions || 0) === 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-16">
      {/* Top Welcome & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-400">
              Recovery Workspace
            </span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
            Welcome back, {user?.name || 'Partner'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            {merchant?.businessName || 'Workspace'} • {hasNoTransactions ? 'Create transactions to begin recovery telemetry' : 'Real-time autonomous revenue recovery telemetry'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {hasNoTransactions && (
            <Button
              variant="outline"
              size="md"
              leftIcon={<Database className="w-4 h-4" />}
              onClick={handleSeedDemoData}
              isLoading={isSeeding}
            >
              Load Demo Dataset
            </Button>
          )}
          <Button
            variant="primary"
            size="md"
            leftIcon={<PlusCircle className="w-4 h-4" />}
            onClick={() => setIsCreateTxModalOpen(true)}
            className="shadow-glow-brand"
          >
            {hasNoTransactions ? 'Create First Transaction' : '+ New Transaction'}
          </Button>
          <Button
            variant="outline"
            size="md"
            onClick={fetchDashboardData}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-300 text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={fetchDashboardData}>
            Retry
          </Button>
        </div>
      )}

      {/* 1. Autonomous Hero Card */}
      <AutonomousHeroCard metrics={metrics} isLoading={isLoading} />

      {/* 2. Top AI Insight Spotlight */}
      {topInsight && (
        <Card className="bg-gradient-to-r from-surface via-brand-950/30 to-surface border border-brand-500/40 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-fintech-card">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400 flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400">
                  Featured AI Intelligence
                </span>
                <span className="px-2 py-0.2 rounded-full text-[9px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {topInsight.impactLevel} Impact
                </span>
              </div>
              <h3 className="text-base font-bold text-white">{topInsight.title}</h3>
              <p className="text-xs text-slate-300 max-w-3xl">{topInsight.description}</p>
            </div>
          </div>

          <Link to="/ai-insights" className="flex-shrink-0">
            <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              All Insights
            </Button>
          </Link>
        </Card>
      )}

      {/* 3. Top Recovery Opportunities Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Priority Recovery Queue</h3>
            <p className="text-xs text-slate-400">Top ranked opportunities ready for autonomous salvage.</p>
          </div>

          <Link to="/recovery-center">
            <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
              View All Opportunities
            </Button>
          </Link>
        </div>

        {topOpportunities.length === 0 ? (
          <Card className="bg-surface border-surface-border p-8 text-center space-y-2">
            <Zap className="w-8 h-8 text-slate-500 mx-auto" />
            <p className="text-xs text-slate-400">No open recovery opportunities pending review.</p>
          </Card>
        ) : (
          <Card className="bg-surface border-surface-border p-0 overflow-hidden shadow-fintech-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-muted/60 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Failure</th>
                    <th className="py-3 px-4 text-center">Probability</th>
                    <th className="py-3 px-4">Strategy</th>
                    <th className="py-3 px-4">Policy Mode</th>
                    <th className="py-3 px-4 text-right">Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border/60">
                  {topOpportunities.map((opp) => (
                    <tr key={opp.id} className="hover:bg-surface-muted/40 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-white">
                        {opp.customer ? opp.customer.name : 'Customer'}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        ₹{opp.transaction?.amount?.toLocaleString() || 0}
                      </td>
                      <td className="py-3.5 px-4 text-rose-300">
                        {opp.transaction?.failureReason?.replace(/_/g, ' ') || 'Drop'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <RecoveryScoreBadge score={opp.recoveryProbability} size="sm" showLabel={false} />
                      </td>
                      <td className="py-3.5 px-4">
                        <RecommendedActionBadge action={opp.recommendedAction} size="sm" />
                      </td>
                      <td className="py-3.5 px-4">
                        {opp.isAutonomousReady ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Auto Ready
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Approval Req
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link to={`/recovery/${opp.transactionId}`}>
                          <Button variant="ghost" size="sm" rightIcon={<ExternalLink className="w-3 h-3" />}>
                            Audit
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* 4. Recent Transactions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Recent Transactions</h3>
            <p className="text-xs text-slate-400">Latest payment and recovery events in your workspace.</p>
          </div>

          <Link to="/transactions">
            <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
              View All Transactions
            </Button>
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <Card className="bg-surface border-surface-border p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-surface-muted mx-auto flex items-center justify-center text-slate-400">
              <PlusCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h4 className="text-base font-bold text-white">No transactions recorded yet</h4>
              <p className="text-xs text-slate-400">
                Create your first transaction to start recording payments and analyzing recovery lift.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateTxModalOpen(true)}
              leftIcon={<PlusCircle className="w-4 h-4" />}
            >
              Create Transaction
            </Button>
          </Card>
        ) : (
          <Card className="bg-surface border-surface-border p-0 overflow-hidden shadow-fintech-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-muted/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-5">Transaction</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4">Payment Method</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border/60">
                  {recentTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-surface-muted/40 transition-colors">
                      <td className="py-4 px-5 font-mono">
                        <Link
                          to={`/transactions/${tx.id}`}
                          className="font-semibold text-brand-400 hover:text-brand-300 transition-colors"
                        >
                          TXN-{tx.id.slice(-6).toUpperCase()}
                        </Link>
                      </td>

                      <td className="py-4 px-4 font-medium text-white">
                        {tx.customer ? tx.customer.name : 'Customer'}
                      </td>

                      <td className="py-4 px-4 font-mono font-bold text-white">
                        ₹{tx.amount.toLocaleString()}
                      </td>

                      <td className="py-4 px-4 text-slate-300">{tx.paymentMethod}</td>

                      <td className="py-4 px-4">{getStatusBadge(tx.status)}</td>

                      <td className="py-4 px-4 text-xs text-slate-400 whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      <td className="py-4 px-5 text-right">
                        <Link to={`/transactions/${tx.id}`}>
                          <Button variant="ghost" size="sm" rightIcon={<ExternalLink className="w-3.5 h-3.5" />}>
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Create Transaction Modal */}
      <CreateTransactionModal
        isOpen={isCreateTxModalOpen}
        onClose={() => setIsCreateTxModalOpen(false)}
        onSuccess={fetchDashboardData}
        onOpenCreateCustomer={() => setIsCreateCustomerModalOpen(true)}
      />

      {/* Create Customer Modal */}
      <CreateCustomerModal
        isOpen={isCreateCustomerModalOpen}
        onClose={() => setIsCreateCustomerModalOpen(false)}
        onSuccess={() => {
          setIsCreateTxModalOpen(true);
        }}
      />
    </div>
  );
};

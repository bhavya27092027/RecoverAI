import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getRecoveryOpportunitiesApi } from '../api/recovery.api';
import {
  RecoveryOpportunity,
  RecoveryOpportunitiesSummary,
} from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { RecoveryScoreBadge } from '../components/recovery/RecoveryScoreBadge';
import { RecommendedActionBadge } from '../components/recovery/RecommendedActionBadge';
import { RecoveryExecutionModal } from '../components/recovery/RecoveryExecutionModal';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Zap,
  ArrowLeftRight,
  Check,
} from 'lucide-react';

export const RecoveryCenterPage: React.FC = () => {
  const [opportunities, setOpportunities] = useState<RecoveryOpportunity[]>([]);
  const [summary, setSummary] = useState<RecoveryOpportunitiesSummary>({
    totalOpportunities: 0,
    highPriorityCount: 0,
    mediumPriorityCount: 0,
    lowPriorityCount: 0,
    potentialRecoverableRevenue: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [tierFilter, setTierFilter] = useState<string>('ALL');
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  // Execution Modal State
  const [selectedOpportunity, setSelectedOpportunity] = useState<RecoveryOpportunity | null>(null);
  const [isExecutionModalOpen, setIsExecutionModalOpen] = useState(false);

  const fetchOpportunities = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await getRecoveryOpportunitiesApi({
        probabilityTier: tierFilter !== 'ALL' ? tierFilter : undefined,
        recommendedAction: actionFilter !== 'ALL' ? actionFilter : undefined,
      });

      if (res.success) {
        // Priority Queue Ranking: 1. Autonomous Ready, 2. Probability DESC, 3. Expected Amount DESC, 4. Age DESC
        const sorted = [...res.data].sort((a, b) => {
          if (a.isAutonomousReady && !b.isAutonomousReady) return -1;
          if (!a.isAutonomousReady && b.isAutonomousReady) return 1;
          if (b.recoveryProbability !== a.recoveryProbability) {
            return b.recoveryProbability - a.recoveryProbability;
          }
          if (b.expectedRecoveryAmount !== a.expectedRecoveryAmount) {
            return b.expectedRecoveryAmount - a.expectedRecoveryAmount;
          }
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        setOpportunities(sorted);
        setSummary(res.summary);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load recovery opportunities');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, [tierFilter, actionFilter]);

  const handleOpenExecution = (opp: RecoveryOpportunity) => {
    setSelectedOpportunity(opp);
    setIsExecutionModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-16">
      {/* Autonomous Mode Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-surface via-brand-950/30 to-surface border border-brand-500/30 p-6 sm:p-8 shadow-fintech-card">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-brand-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Autonomous Mode Active
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Policy: ≥80% Prob & HIGH Confidence
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Autonomous Revenue Recovery Center
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-normal">
              RecoverAI automatically evaluates eligible failed payments and executes simulated recovery strategies according to its decision policy. For lower confidence cases, merchant approval is required.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="md"
              onClick={fetchOpportunities}
              isLoading={isLoading}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Refresh
            </Button>
            <Link to="/transactions">
              <Button
                variant="secondary"
                size="md"
                leftIcon={<ArrowLeftRight className="w-4 h-4" />}
              >
                Transactions
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-300 text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={fetchOpportunities}>
            Retry
          </Button>
        </div>
      )}

      {/* Summary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1: Potential Recoverable Revenue */}
        <Card className="bg-surface/80 border-surface-border relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Potential Recoverable
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <p className="text-3xl font-bold font-mono text-emerald-400">
              ₹{summary.potentialRecoverableRevenue.toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-400">
              Across {summary.totalOpportunities} analyzed opportunities
            </p>
          </div>
        </Card>

        {/* Metric 2: High-Priority Candidates (80%+) */}
        <Card className="bg-surface/80 border-surface-border relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              High Probability
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <p className="text-3xl font-bold font-mono text-white">
              {summary.highPriorityCount}
            </p>
            <p className="text-[11px] text-emerald-400/80">
              ≥ 80% calculated salvage likelihood
            </p>
          </div>
        </Card>

        {/* Metric 3: Medium-Priority Candidates (60-79%) */}
        <Card className="bg-surface/80 border-surface-border relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Medium Probability
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <p className="text-3xl font-bold font-mono text-white">
              {summary.mediumPriorityCount}
            </p>
            <p className="text-[11px] text-amber-400/80">
              60%–79% salvage likelihood
            </p>
          </div>
        </Card>

        {/* Metric 4: Low-Priority Candidates (<60%) */}
        <Card className="bg-surface/80 border-surface-border relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Low Probability
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <p className="text-3xl font-bold font-mono text-white">
              {summary.lowPriorityCount}
            </p>
            <p className="text-[11px] text-slate-400">
              Requires alternate payment rails
            </p>
          </div>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="bg-surface/80 border-surface-border p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Probability Tier Filter */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400">
              Probability Tier
            </label>
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="w-full bg-surface-muted border border-surface-border rounded-lg text-xs text-slate-200 px-3 py-2 focus:ring-brand-500 cursor-pointer"
            >
              <option value="ALL">All Probabilities</option>
              <option value="HIGH">High (80%+ Likelihood)</option>
              <option value="MEDIUM">Medium (60%–79%)</option>
              <option value="LOW">Low (&lt;60%)</option>
            </select>
          </div>

          {/* Recommended Action Filter */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400">
              Recommended Action
            </label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full bg-surface-muted border border-surface-border rounded-lg text-xs text-slate-200 px-3 py-2 focus:ring-brand-500 cursor-pointer"
            >
              <option value="ALL">All Actions</option>
              <option value="RETRY_NOW">Retry Now</option>
              <option value="WAIT_AND_RETRY">Wait & Retry</option>
              <option value="SEND_PAYMENT_LINK">Send Payment Link</option>
              <option value="SUGGEST_ALTERNATE_METHOD">Suggest Alternate Method</option>
              <option value="STOP_RECOVERY">Stop Recovery</option>
            </select>
          </div>

          {/* Reset Filters */}
          <div className="flex items-end">
            {(tierFilter !== 'ALL' || actionFilter !== 'ALL') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTierFilter('ALL');
                  setActionFilter('ALL');
                }}
                className="w-full"
              >
                Reset Filters
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Opportunities List Table */}
      {isLoading ? (
        <Card className="bg-surface border-surface-border p-12 text-center space-y-4">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/30 mx-auto flex items-center justify-center text-brand-400 animate-spin">
            <RefreshCw className="w-5 h-5" />
          </div>
          <p className="text-sm text-slate-400">Loading AI recovery pipeline...</p>
        </Card>
      ) : opportunities.length === 0 ? (
        <Card className="bg-surface border-surface-border p-12 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/30 mx-auto flex items-center justify-center text-brand-400 shadow-glow-brand">
            <Sparkles className="w-8 h-8" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-lg font-bold text-white">
              {tierFilter !== 'ALL' || actionFilter !== 'ALL'
                ? 'No matching recovery opportunities'
                : 'No recovery opportunities yet.'}
            </h3>
            <p className="text-xs text-slate-400">
              {tierFilter !== 'ALL' || actionFilter !== 'ALL'
                ? 'Try clearing or widening your filters.'
                : 'When failed transactions are evaluated by the AI Recovery Intelligence Engine, they will appear here ranked by recovery potential.'}
            </p>
          </div>
          <Link to="/transactions">
            <Button
              variant="primary"
              size="md"
              leftIcon={<ArrowLeftRight className="w-4 h-4" />}
            >
              Go to Transactions Stream
            </Button>
          </Link>
        </Card>
      ) : (
        <Card className="bg-surface border-surface-border p-0 overflow-hidden shadow-fintech-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-surface-muted/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Customer</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Failure Reason</th>
                  <th className="py-3.5 px-4 text-center">Probability</th>
                  <th className="py-3.5 px-4">Recommended Action</th>
                  <th className="py-3.5 px-4">Policy Mode</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-5 text-right">Execute / Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/60">
                {opportunities.map((opp) => {
                  const isRecovered = opp.transaction?.status === 'RECOVERED';
                  const isAutonomous = opp.isAutonomousReady;

                  return (
                    <tr key={opp.id} className="hover:bg-surface-muted/40 transition-colors group">
                      <td className="py-4 px-5">
                        <div>
                          <span className="font-semibold text-white">
                            {opp.customer ? opp.customer.name : 'Customer'}
                          </span>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {opp.customer?.email || '—'}
                          </p>
                        </div>
                      </td>

                      <td className="py-4 px-4 font-mono font-bold text-white">
                        ₹{opp.transaction?.amount?.toLocaleString() || 0}
                      </td>

                      <td className="py-4 px-4">
                        <span className="inline-block text-xs font-medium text-rose-300">
                          {opp.transaction?.failureReason?.replace(/_/g, ' ') || 'Unknown'}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <RecoveryScoreBadge score={opp.recoveryProbability} size="sm" showLabel={false} />
                        <span className="block text-[10px] text-slate-400 mt-0.5 uppercase">
                          {opp.confidence}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <RecommendedActionBadge action={opp.recommendedAction} size="sm" />
                      </td>

                      <td className="py-4 px-4">
                        {isAutonomous ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            Auto Ready
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Approval Req
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-center">
                        {isRecovered ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <Check className="w-3 h-3" /> Recovered
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-500/10 text-rose-300 border border-rose-500/20">
                            Failed
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isRecovered && (
                            <Button
                              variant={isAutonomous ? 'primary' : 'secondary'}
                              size="sm"
                              onClick={() => handleOpenExecution(opp)}
                              leftIcon={<Zap className="w-3.5 h-3.5" />}
                              className={isAutonomous ? 'shadow-glow-brand' : ''}
                            >
                              {isAutonomous ? 'Execute' : 'Approve'}
                            </Button>
                          )}
                          <Link to={`/recovery/${opp.transactionId}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
                            >
                              Audit
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Recovery Execution Modal */}
      <RecoveryExecutionModal
        isOpen={isExecutionModalOpen}
        opportunity={selectedOpportunity}
        onClose={() => setIsExecutionModalOpen(false)}
        onSuccess={() => {
          fetchOpportunities();
        }}
      />
    </div>
  );
};

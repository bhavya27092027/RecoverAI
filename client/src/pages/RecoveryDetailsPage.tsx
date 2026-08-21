import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getRecoveryDetailsApi } from '../api/recovery.api';
import {
  RecoveryDetailsResponse,
  RecoveryOpportunity,
  RecoveryAttempt,
} from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { RecoveryScoreBadge } from '../components/recovery/RecoveryScoreBadge';
import { RecommendedActionBadge } from '../components/recovery/RecommendedActionBadge';
import { DecisionFactorsCard } from '../components/recovery/DecisionFactorsCard';
import { AgentEventTimeline } from '../components/recovery/AgentEventTimeline';
import { RecoveryExecutionModal } from '../components/recovery/RecoveryExecutionModal';
import {
  ArrowLeft,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Zap,
  ExternalLink,
  RotateCcw,
  Clock,
  User,
} from 'lucide-react';

export const RecoveryDetailsPage: React.FC = () => {
  const { transactionId } = useParams<{ transactionId: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<RecoveryDetailsResponse['data'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExecutionModalOpen, setIsExecutionModalOpen] = useState(false);

  const fetchRecoveryDetails = async () => {
    if (!transactionId) return;
    try {
      setIsLoading(true);
      setError(null);
      const res = await getRecoveryDetailsApi(transactionId);
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load recovery details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecoveryDetails();
  }, [transactionId]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto py-12 text-center space-y-4">
        <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/30 mx-auto flex items-center justify-center text-brand-400 animate-spin">
          <RefreshCw className="w-5 h-5" />
        </div>
        <p className="text-sm text-slate-400">Loading AI recovery audit record...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/recovery-center')}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Back to Recovery Center
        </Button>
        <Card className="bg-surface border-surface-border p-8 text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">{error || 'Recovery record not found'}</h2>
          <Button variant="secondary" size="sm" onClick={fetchRecoveryDetails}>
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  const { transaction, analysis, attempts, events, isAutonomousReady } = data;
  const isRecovered = transaction.status === 'RECOVERED';

  // Construct synthetic opportunity for the execution modal
  const opportunity: RecoveryOpportunity | null = analysis
    ? {
        id: analysis.id,
        transactionId: transaction.id,
        recoveryProbability: analysis.recoveryProbability,
        confidence: analysis.confidence,
        recommendedAction: analysis.recommendedAction,
        expectedRecoveryAmount: analysis.expectedRecoveryAmount,
        reasoning: analysis.reasoning,
        factors: analysis.factors,
        createdAt: analysis.createdAt,
        isAutonomousReady,
        transaction: {
          id: transaction.id,
          amount: transaction.amount,
          currency: transaction.currency,
          paymentMethod: transaction.paymentMethod,
          failureReason: transaction.failureReason || ('UNKNOWN' as any),
          status: transaction.status,
          recoveredAmount: transaction.recoveredAmount,
          recoveredAt: transaction.recoveredAt,
          createdAt: transaction.createdAt,
        },
        customer: {
          id: (transaction.customer as any)?.id || '',
          name: (transaction.customer as any)?.name || 'Customer',
          email: (transaction.customer as any)?.email || '',
          phone: (transaction.customer as any)?.phone || '',
        },
      }
    : null;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-16">
      {/* Top Breadcrumb & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border/80 pb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/recovery-center')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Recovery Center
          </Button>
          <span className="text-slate-600">/</span>
          <span className="font-mono text-xs text-brand-400 font-bold">
            TXN-{transaction.id.slice(-6).toUpperCase()}
          </span>
          <span className="text-slate-600">/</span>
          <span className="text-sm font-semibold text-white">Recovery Audit</span>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRecoveryDetails}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
          {!isRecovered && opportunity && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsExecutionModalOpen(true)}
              leftIcon={<Zap className="w-4 h-4" />}
              className="shadow-glow-brand"
            >
              {isAutonomousReady ? 'Execute Recovery' : 'Approve Recovery'}
            </Button>
          )}
        </div>
      </div>

      {/* Hero Status Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-surface via-surface-muted to-surface border border-surface-border grid grid-cols-1 md:grid-cols-4 gap-6 items-center shadow-fintech-card">
        {/* Metric 1: Transaction & Status */}
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400">Transaction Status</span>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold font-mono text-white">
              ₹{transaction.amount.toLocaleString()}
            </h3>
            <Badge
              variant={
                isRecovered
                  ? 'success'
                  : transaction.status === 'FAILED'
                  ? 'warning'
                  : 'default'
              }
              size="sm"
            >
              {transaction.status}
            </Badge>
          </div>
          <p className="text-xs text-slate-400">
            {transaction.customer ? (transaction.customer as any).name : 'Customer'} • {transaction.paymentMethod}
          </p>
        </div>

        {/* Metric 2: Failure Reason */}
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400">Interchange Failure</span>
          <p className="text-sm font-semibold text-rose-400">
            {transaction.failureReason?.replace(/_/g, ' ') || 'None'}
          </p>
          <p className="text-[11px] text-slate-400">Original drop reason</p>
        </div>

        {/* Metric 3: Expected vs Actual Recovery */}
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400">
            {isRecovered ? 'Actual Recovered Revenue' : 'Expected Recovery Pipeline'}
          </span>
          <p className="text-xl font-bold font-mono text-emerald-400">
            ₹
            {isRecovered
              ? (transaction.recoveredAmount || transaction.amount).toLocaleString()
              : (analysis?.expectedRecoveryAmount || 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-400">
            {isRecovered ? 'Settled to merchant balance' : `Estimated at ${analysis?.recoveryProbability || 0}% likelihood`}
          </p>
        </div>

        {/* Metric 4: Strategy Selected */}
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400">Selected Strategy</span>
          {analysis ? (
            <RecommendedActionBadge action={analysis.recommendedAction} size="md" />
          ) : (
            <span className="text-xs text-slate-500">Not analyzed</span>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: AI Decision Breakdown & Factor Analysis */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Reasoning Card */}
          {analysis && (
            <Card className="bg-gradient-to-br from-surface to-brand-950/20 border-brand-500/30 p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-surface-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">AI Strategy Justification</h3>
                    <p className="text-[11px] text-slate-400">
                      Evaluated on {new Date(analysis.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <RecoveryScoreBadge score={analysis.recoveryProbability} size="sm" />
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-normal">
                {analysis.reasoning}
              </p>
            </Card>
          )}

          {/* Decision Factors */}
          {analysis?.factors && (
            <DecisionFactorsCard
              factors={analysis.factors}
              paymentMethod={transaction.paymentMethod}
              amount={transaction.amount}
            />
          )}

          {/* Recovery Attempt History */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Recovery Attempt History</h3>
                <p className="text-xs text-slate-400">Historical execution runs orchestrated by the agent.</p>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {attempts.length} attempt{attempts.length === 1 ? '' : 's'}
              </span>
            </div>

            {attempts.length === 0 ? (
              <Card className="bg-surface border-surface-border p-8 text-center space-y-3">
                <RotateCcw className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-xs text-slate-400">No recovery attempts executed yet for this transaction.</p>
                {!isRecovered && opportunity && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsExecutionModalOpen(true)}
                    leftIcon={<Zap className="w-4 h-4" />}
                  >
                    Execute First Attempt
                  </Button>
                )}
              </Card>
            ) : (
              <Card className="bg-surface border-surface-border p-0 overflow-hidden shadow-fintech-card">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-surface-border bg-surface-muted/60 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Attempt #</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Rail</th>
                      <th className="py-3 px-4">Result Message</th>
                      <th className="py-3 px-4 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border/60">
                    {attempts.map((att: RecoveryAttempt) => (
                      <tr key={att.id} className="hover:bg-surface-muted/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-white">
                          #{att.attemptNumber}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-300">
                          {att.action.replace(/_/g, ' ')}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              att.status === 'SUCCESS'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : att.status === 'FAILED'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {att.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">{att.paymentMethod}</td>
                        <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate">
                          {att.resultMessage || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-400 whitespace-nowrap">
                          {new Date(att.startedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </div>
        </div>

        {/* Right Column: Live Chronological Agent Event Stream */}
        <div className="space-y-6">
          <Card className="bg-surface border-surface-border p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-surface-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-400" />
                <h3 className="text-sm font-bold text-white">Agent Audit Timeline</h3>
              </div>
              <Badge variant="outline" size="sm">
                Immutable
              </Badge>
            </div>

            <AgentEventTimeline events={events} />
          </Card>

          {/* Quick Links Card */}
          <Card className="bg-surface border-surface-border p-5 space-y-3 text-xs">
            <h4 className="font-bold text-white">Associated Links</h4>
            <div className="space-y-2">
              <Link
                to={`/transactions/${transaction.id}`}
                className="flex items-center justify-between p-2 rounded-lg bg-surface-muted hover:bg-surface-border transition-colors text-slate-300"
              >
                <span>View Raw Transaction</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </Link>
              {transaction.customer && (
                <Link
                  to={`/customers/${(transaction.customer as any).id || (transaction.customer as any)._id}`}
                  className="flex items-center justify-between p-2 rounded-lg bg-surface-muted hover:bg-surface-border transition-colors text-slate-300"
                >
                  <span>Customer Profile ({(transaction.customer as any).name})</span>
                  <User className="w-3.5 h-3.5 text-slate-400" />
                </Link>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Recovery Execution Modal */}
      <RecoveryExecutionModal
        isOpen={isExecutionModalOpen}
        opportunity={opportunity}
        onClose={() => setIsExecutionModalOpen(false)}
        onSuccess={() => {
          fetchRecoveryDetails();
        }}
      />
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  RecoveryOpportunity,
  ExecuteRecoveryResponse,
  RecoveryEvent,
} from '../../types';
import {
  executeRecoveryApi,
  approveRecoveryApi,
  simulatePaymentApi,
  getRecoveryEventsApi,
} from '../../api/recovery.api';
import { Button } from '../ui/Button';
import { RecommendedActionBadge } from './RecommendedActionBadge';
import { AgentEventTimeline } from './AgentEventTimeline';
import {
  X,
  Sparkles,
  Clock,
  Send,
  CreditCard,
  Copy,
  Check,
  Zap,
} from 'lucide-react';

interface RecoveryExecutionModalProps {
  isOpen: boolean;
  opportunity: RecoveryOpportunity | null;
  onClose: () => void;
  onSuccess: () => void;
}

type ExecutionStage =
  | 'READY'
  | 'STEP_1_ANALYSIS'
  | 'STEP_2_CUSTOMER'
  | 'STEP_3_STRATEGY'
  | 'STEP_4_EXECUTING'
  | 'STEP_5_COMPLETED';

export const RecoveryExecutionModal: React.FC<RecoveryExecutionModalProps> = ({
  isOpen,
  opportunity,
  onClose,
  onSuccess,
}) => {
  const [stage, setStage] = useState<ExecutionStage>('READY');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<ExecuteRecoveryResponse['data'] | null>(null);
  const [events, setEvents] = useState<RecoveryEvent[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [alternateMethod, setAlternateMethod] = useState<'UPI' | 'Credit Card'>('UPI');

  useEffect(() => {
    if (isOpen && opportunity) {
      setStage('READY');
      setError(null);
      setExecutionResult(null);
      setEvents([]);
      setAlternateMethod(
        opportunity.transaction?.paymentMethod === 'Credit Card' ? 'UPI' : 'Credit Card'
      );
      // Pre-fetch any existing events for this transaction
      getRecoveryEventsApi(opportunity.transactionId)
        .then((res) => {
          if (res.success) setEvents(res.data);
        })
        .catch(() => {});
    }
  }, [isOpen, opportunity]);

  if (!isOpen || !opportunity) return null;

  const handleStartExecution = async (isManualApproval = false) => {
    try {
      setIsLoading(true);
      setError(null);

      // Step 1 animation
      setStage('STEP_1_ANALYSIS');
      await new Promise((r) => setTimeout(r, 400));

      // Step 2 animation
      setStage('STEP_2_CUSTOMER');
      await new Promise((r) => setTimeout(r, 400));

      // Step 3 animation
      setStage('STEP_3_STRATEGY');
      await new Promise((r) => setTimeout(r, 400));

      // Step 4 animation
      setStage('STEP_4_EXECUTING');

      const res = isManualApproval
        ? await approveRecoveryApi(opportunity.transactionId)
        : await executeRecoveryApi(opportunity.transactionId);

      if (res.success && res.data) {
        setExecutionResult(res.data);
        setEvents(res.data.events);
        setStage('STEP_5_COMPLETED');
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Recovery execution encountered an error.');
      setStage('READY');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulatePaymentCompletion = async (mode: 'PAYMENT_LINK' | 'ALTERNATE_METHOD') => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await simulatePaymentApi(opportunity.transactionId, {
        mode,
        alternatePaymentMethod: mode === 'ALTERNATE_METHOD' ? alternateMethod : undefined,
      });

      if (res.success && res.data) {
        setExecutionResult(res.data);
        setEvents(res.data.events);
        setStage('STEP_5_COMPLETED');
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to simulate payment settlement.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyPaymentLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const isAutonomous = opportunity.isAutonomousReady;
  const isRecovered = executionResult?.transaction?.status === 'RECOVERED';
  const isPendingLink =
    executionResult?.attempt?.action === 'SEND_PAYMENT_LINK' &&
    executionResult?.attempt?.status === 'PENDING';
  const isPendingAlternate =
    executionResult?.attempt?.action === 'SUGGEST_ALTERNATE_METHOD' &&
    executionResult?.attempt?.status === 'PENDING';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-surface border border-surface-border rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-surface-muted/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                RecoverAI Autonomous Recovery Agent
              </h2>
              <p className="text-[11px] text-slate-400">
                Executing simulated recovery strategy for {opportunity.customer?.name || 'Customer'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-surface-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between">
              <span>{error}</span>
              <Button variant="ghost" size="sm" onClick={() => setError(null)}>
                Dismiss
              </Button>
            </div>
          )}

          {/* Transaction Summary Card */}
          <div className="p-4 rounded-xl bg-surface-muted/60 border border-surface-border grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Amount</span>
              <p className="font-mono font-bold text-white text-base mt-0.5">
                ₹{opportunity.transaction?.amount?.toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Failure Reason</span>
              <p className="font-semibold text-rose-400 mt-0.5">
                {opportunity.transaction?.failureReason?.replace(/_/g, ' ') || 'Unknown'}
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Probability</span>
              <p className="font-mono font-bold text-emerald-400 text-base mt-0.5">
                {opportunity.recoveryProbability}% ({opportunity.confidence})
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Strategy</span>
              <div className="mt-1">
                <RecommendedActionBadge action={opportunity.recommendedAction} size="sm" />
              </div>
            </div>
          </div>

          {/* Multi-Step Stepper Progress */}
          {stage !== 'READY' && (
            <div className="space-y-3 p-4 rounded-xl bg-surface-muted/30 border border-surface-border">
              <span className="text-[10px] uppercase font-bold text-slate-400">Agent Execution Stepper</span>

              <div className="space-y-2 text-xs">
                {/* Step 1 */}
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      stage !== 'STEP_1_ANALYSIS'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-brand-500/20 text-brand-400 border border-brand-500/30 animate-pulse'
                    }`}
                  >
                    {stage !== 'STEP_1_ANALYSIS' ? <Check className="w-3 h-3" /> : '1'}
                  </div>
                  <span className={stage !== 'STEP_1_ANALYSIS' ? 'text-slate-300' : 'text-brand-300 font-semibold'}>
                    Payment failure payload & elasticity analyzed
                  </span>
                </div>

                {/* Step 2 */}
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      stage === 'STEP_3_STRATEGY' || stage === 'STEP_4_EXECUTING' || stage === 'STEP_5_COMPLETED'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : stage === 'STEP_2_CUSTOMER'
                        ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30 animate-pulse'
                        : 'bg-surface-muted text-slate-500 border border-surface-border'
                    }`}
                  >
                    {stage === 'STEP_3_STRATEGY' || stage === 'STEP_4_EXECUTING' || stage === 'STEP_5_COMPLETED' ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      '2'
                    )}
                  </div>
                  <span
                    className={
                      stage === 'STEP_2_CUSTOMER'
                        ? 'text-brand-300 font-semibold'
                        : stage === 'STEP_3_STRATEGY' || stage === 'STEP_4_EXECUTING' || stage === 'STEP_5_COMPLETED'
                        ? 'text-slate-300'
                        : 'text-slate-500'
                    }
                  >
                    Customer historical reliability score evaluated
                  </span>
                </div>

                {/* Step 3 */}
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      stage === 'STEP_4_EXECUTING' || stage === 'STEP_5_COMPLETED'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : stage === 'STEP_3_STRATEGY'
                        ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30 animate-pulse'
                        : 'bg-surface-muted text-slate-500 border border-surface-border'
                    }`}
                  >
                    {stage === 'STEP_4_EXECUTING' || stage === 'STEP_5_COMPLETED' ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      '3'
                    )}
                  </div>
                  <span
                    className={
                      stage === 'STEP_3_STRATEGY'
                        ? 'text-brand-300 font-semibold'
                        : stage === 'STEP_4_EXECUTING' || stage === 'STEP_5_COMPLETED'
                        ? 'text-slate-300'
                        : 'text-slate-500'
                    }
                  >
                    Recovery strategy selected: {opportunity.recommendedAction.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Step 4 */}
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      stage === 'STEP_5_COMPLETED'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : stage === 'STEP_4_EXECUTING'
                        ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30 animate-pulse'
                        : 'bg-surface-muted text-slate-500 border border-surface-border'
                    }`}
                  >
                    {stage === 'STEP_5_COMPLETED' ? (
                      <Check className="w-3 h-3" />
                    ) : stage === 'STEP_4_EXECUTING' ? (
                      <Clock className="w-3 h-3 animate-spin" />
                    ) : (
                      '4'
                    )}
                  </div>
                  <span
                    className={
                      stage === 'STEP_4_EXECUTING'
                        ? 'text-brand-300 font-semibold'
                        : stage === 'STEP_5_COMPLETED'
                        ? 'text-slate-300'
                        : 'text-slate-500'
                    }
                  >
                    Executing simulated recovery channel...
                  </span>
                </div>

                {/* Step 5: Outcome */}
                {stage === 'STEP_5_COMPLETED' && (
                  <div className="flex items-center gap-2.5 pt-1">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isRecovered
                          ? 'bg-emerald-500 text-white'
                          : isPendingLink || isPendingAlternate
                          ? 'bg-amber-500 text-white'
                          : 'bg-rose-500 text-white'
                      }`}
                    >
                      {isRecovered ? <Check className="w-3 h-3" /> : '!'}
                    </div>
                    <span
                      className={`font-semibold ${
                        isRecovered
                          ? 'text-emerald-400'
                          : isPendingLink || isPendingAlternate
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {isRecovered
                        ? `🎉 Recovery Successful: ₹${executionResult?.transaction?.amount?.toLocaleString()} Recovered!`
                        : isPendingLink
                        ? 'Payment link generated & ready for customer settlement'
                        : isPendingAlternate
                        ? 'Alternate payment method recommended'
                        : 'Recovery Attempt Recorded'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Interactive Actions for Specific Strategies */}
          {stage === 'STEP_5_COMPLETED' && isPendingLink && (
            <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-3">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-bold text-white">Dynamic Payment Recovery Link Active</h4>
              </div>
              <div className="flex items-center gap-2 bg-surface p-2 rounded-lg border border-surface-border">
                <input
                  type="text"
                  readOnly
                  value={executionResult?.paymentLink?.recoveryLinkId ? `https://pay.recoverai.io/salvage/${executionResult.paymentLink.recoveryLinkId}` : 'https://pay.recoverai.io/salvage/rec_link_10492'}
                  className="bg-transparent text-xs text-slate-300 font-mono flex-1 outline-none"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    copyPaymentLink(
                      `https://pay.recoverai.io/salvage/${executionResult?.paymentLink?.recoveryLinkId || 'demo'}`
                    )
                  }
                  leftIcon={copiedLink ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                >
                  {copiedLink ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <Button
                variant="primary"
                size="sm"
                className="w-full shadow-glow-brand"
                onClick={() => handleSimulatePaymentCompletion('PAYMENT_LINK')}
                isLoading={isLoading}
                leftIcon={<Zap className="w-4 h-4" />}
              >
                Simulate Customer Payment Completion
              </Button>
            </div>
          )}

          {stage === 'STEP_5_COMPLETED' && isPendingAlternate && (
            <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-purple-400" />
                <h4 className="text-xs font-bold text-white">Simulate Alternate Payment Rail</h4>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs text-slate-300">Alternate Rail:</label>
                <select
                  value={alternateMethod}
                  onChange={(e: any) => setAlternateMethod(e.target.value)}
                  className="bg-surface border border-surface-border rounded-lg text-xs text-white px-3 py-1.5 focus:ring-brand-500"
                >
                  <option value="UPI">UPI Instant Pay</option>
                  <option value="Credit Card">Credit Card</option>
                </select>
              </div>
              <Button
                variant="primary"
                size="sm"
                className="w-full shadow-glow-brand"
                onClick={() => handleSimulatePaymentCompletion('ALTERNATE_METHOD')}
                isLoading={isLoading}
                leftIcon={<Zap className="w-4 h-4" />}
              >
                Simulate Alternate Payment ({alternateMethod})
              </Button>
            </div>
          )}

          {/* Chronological Event Stream */}
          {events.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                Live Agent Audit Event Stream ({events.length} events)
              </span>
              <AgentEventTimeline events={events} />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-surface-border bg-surface-muted/40 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            {isAutonomous ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Autonomous Policy Approved
              </span>
            ) : (
              <span className="text-amber-400 font-semibold">
                Merchant Manual Oversight Required
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onClose}>
              {stage === 'STEP_5_COMPLETED' ? 'Close' : 'Cancel'}
            </Button>

            {stage === 'READY' && (
              <Button
                variant="primary"
                size="md"
                onClick={() => handleStartExecution(!isAutonomous)}
                isLoading={isLoading}
                leftIcon={<Zap className="w-4 h-4" />}
                className="shadow-glow-brand"
              >
                {isAutonomous ? 'Execute Autonomous Recovery' : 'Approve & Execute Recovery'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

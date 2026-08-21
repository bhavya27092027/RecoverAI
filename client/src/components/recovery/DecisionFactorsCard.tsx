import React from 'react';
import { DecisionFactors, FailureReason, PaymentMethod } from '../../types';
import { Card } from '../ui/Card';
import {
  Layers,
  UserCheck,
  CreditCard,
  AlertTriangle,
  History,
  TrendingUp,
  ShieldCheck,
  TrendingDown,
} from 'lucide-react';

interface DecisionFactorsCardProps {
  factors: DecisionFactors;
  failureReason?: FailureReason | null;
  paymentMethod: PaymentMethod;
  amount: number;
}

export const DecisionFactorsCard: React.FC<DecisionFactorsCardProps> = ({
  factors,
  failureReason,
  paymentMethod,
  amount,
}) => {
  const formattedReason = failureReason
    ? failureReason.replace(/_/g, ' ')
    : 'Unknown Failure';

  let failureSignal = 'Moderate';
  let failureSignalColor = 'text-slate-300';
  if (factors.failureReasonScore >= 80) {
    failureSignal = 'High recoverability';
    failureSignalColor = 'text-emerald-400';
  } else if (factors.failureReasonScore >= 60) {
    failureSignal = 'Medium recoverability';
    failureSignalColor = 'text-amber-400';
  } else {
    failureSignal = 'Low recoverability';
    failureSignalColor = 'text-rose-400';
  }

  let customerSignal = 'First-time customer';
  let customerSignalColor = 'text-slate-400';
  if (factors.historicalAttemptsCount > 0) {
    if (factors.customerSuccessRate >= 80) {
      customerSignal = 'Strong signal (High reliability)';
      customerSignalColor = 'text-emerald-400';
    } else if (factors.customerSuccessRate >= 50) {
      customerSignal = 'Moderate signal';
      customerSignalColor = 'text-amber-400';
    } else {
      customerSignal = 'Weak signal (High dropout rate)';
      customerSignalColor = 'text-rose-400';
    }
  }

  return (
    <Card className="bg-surface border-surface-border p-6 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-surface-border/70">
        <div className="flex items-center gap-2.5">
          <Layers className="w-4 h-4 text-brand-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Decision Factors Breakdown
          </h3>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">
          Deterministic Scoring
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
        {/* Factor 1: Failure Type */}
        <div className="p-3.5 rounded-xl bg-surface-muted/60 border border-surface-border space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">
              Failure Type
            </span>
            <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <p className="font-semibold text-white">{formattedReason}</p>
          <p className={`text-[11px] font-medium ${failureSignalColor}`}>
            → {failureSignal}
          </p>
        </div>

        {/* Factor 2: Customer Success Rate */}
        <div className="p-3.5 rounded-xl bg-surface-muted/60 border border-surface-border space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">
              Customer History
            </span>
            <UserCheck className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <p className="font-semibold text-white">
            {factors.historicalAttemptsCount === 0
              ? 'New Customer (0 prior txs)'
              : `${factors.customerSuccessRate}% Success (${factors.historicalAttemptsCount} prior txs)`}
          </p>
          <p className={`text-[11px] font-medium ${customerSignalColor}`}>
            → {customerSignal}
          </p>
        </div>

        {/* Factor 3: Payment Rail */}
        <div className="p-3.5 rounded-xl bg-surface-muted/60 border border-surface-border space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">
              Payment Rail
            </span>
            <CreditCard className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <p className="font-semibold text-white">{paymentMethod}</p>
          <p className="text-[11px] text-emerald-400 font-medium">
            → {factors.paymentMethodScore >= 0 ? 'Optimal settlement channel' : 'Standard channel'}
          </p>
        </div>

        {/* Factor 4: Lifetime Value */}
        <div className="p-3.5 rounded-xl bg-surface-muted/60 border border-surface-border space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">
              Customer Lifetime Spend
            </span>
            <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <p className="font-semibold font-mono text-white">
            ₹{factors.customerTotalSpend.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-400">
            {factors.customerTotalSpend >= 20000
              ? '→ VIP Tier (+5 boost)'
              : '→ Standard Tier'}
          </p>
        </div>

        {/* Factor 5: Repeat Failure Penalty */}
        <div className="p-3.5 rounded-xl bg-surface-muted/60 border border-surface-border space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">
              Streak Penalty
            </span>
            {factors.repeatFailurePenalty < 0 ? (
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </div>
          <p className="font-semibold text-white">
            {factors.repeatFailurePenalty < 0
              ? `Applied (${factors.repeatFailurePenalty} pts)`
              : 'No Penalty (0 pts)'}
          </p>
          <p className="text-[11px] text-slate-400">
            {factors.repeatFailurePenalty < 0
              ? '→ Recent repeat failure detected'
              : '→ Clean recent history'}
          </p>
        </div>

        {/* Factor 6: Transaction Value */}
        <div className="p-3.5 rounded-xl bg-surface-muted/60 border border-surface-border space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">
              Transaction Value
            </span>
            <History className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <p className="font-semibold font-mono text-white">
            ₹{amount.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-400">
            → Moderate recovery target
          </p>
        </div>
      </div>
    </Card>
  );
};

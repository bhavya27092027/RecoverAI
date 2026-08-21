import React from 'react';
import { FailureBreakdownItem } from '../../types';
import { Card } from '../ui/Card';
import { AlertTriangle } from 'lucide-react';

interface FailureBreakdownCardProps {
  breakdown: FailureBreakdownItem[];
  isLoading: boolean;
}

export const FailureBreakdownCard: React.FC<FailureBreakdownCardProps> = ({
  breakdown,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <Card className="bg-surface border-surface-border p-6 space-y-4 animate-pulse">
        <div className="h-6 w-48 bg-surface-muted rounded"></div>
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 bg-surface-muted/60 rounded-xl"></div>
          ))}
        </div>
      </Card>
    );
  }

  const items = breakdown || [];
  const maxLoss = Math.max(...items.map((i) => i.totalAmount), 1);

  return (
    <Card className="bg-surface border-surface-border p-6 space-y-5">
      <div className="flex items-center justify-between border-b border-surface-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Payment Failure Breakdown</h3>
            <p className="text-xs text-slate-400">Analysis of failure categories, lost volume, and recovery success</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {items.map((item, idx) => {
          const barWidth = Math.max(5, Math.min(100, (item.totalAmount / maxLoss) * 100));

          return (
            <div key={idx} className="p-3.5 rounded-xl bg-surface-muted/40 border border-surface-border space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{item.failureReason.replace(/_/g, ' ')}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ({item.count} drop{item.count === 1 ? '' : 's'})
                  </span>
                </div>

                <div className="flex items-center gap-4 font-mono">
                  <span className="text-rose-400 font-bold">₹{item.totalAmount.toLocaleString()}</span>
                  <span className="text-slate-400">{item.percentageOfFailures}% of losses</span>
                  <span className="text-emerald-400 font-semibold">{item.recoverySuccessRate}% salvaged</span>
                </div>
              </div>

              {/* Loss Share Bar */}
              <div className="w-full h-2 bg-surface-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-500/80 rounded-full transition-all"
                  style={{ width: `${barWidth}%` }}
                ></div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                <span>Avg. AI Probability: <strong className="text-slate-200">{item.averageRecoveryProbability}%</strong></span>
                <span>Recovered Txs: <strong className="text-emerald-400">{item.recoveredCount}</strong></span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

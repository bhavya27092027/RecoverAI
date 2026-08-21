import React from 'react';
import { RecoveryFunnelData } from '../../types';
import { Card } from '../ui/Card';
import { Layers } from 'lucide-react';

interface RecoveryFunnelCardProps {
  funnelData: RecoveryFunnelData | null;
  isLoading: boolean;
}

export const RecoveryFunnelCard: React.FC<RecoveryFunnelCardProps> = ({
  funnelData,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <Card className="bg-surface border-surface-border p-6 space-y-4 animate-pulse">
        <div className="h-6 w-48 bg-surface-muted rounded"></div>
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 bg-surface-muted/60 rounded-xl"></div>
          ))}
        </div>
      </Card>
    );
  }

  const stages = funnelData?.funnel || [];
  const maxAmount = stages.length > 0 ? stages[0].amount || 1 : 1;

  return (
    <Card className="bg-surface border-surface-border p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-surface-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Revenue Recovery Funnel</h3>
            <p className="text-xs text-slate-400">Lifecycle conversion from initial failure to completed settlement</p>
          </div>
        </div>

        {funnelData?.summary && (
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400">Overall Recovery Rate</span>
            <p className="text-sm font-bold font-mono text-emerald-400">
              {funnelData.summary.overallRecoveryRate}%
            </p>
          </div>
        )}
      </div>

      {stages.length === 0 || stages[0].count === 0 ? (
        <div className="p-8 text-center text-xs text-slate-500 bg-surface-muted/30 rounded-xl border border-surface-border">
          No transaction lifecycle data recorded yet.
        </div>
      ) : (
        <div className="space-y-3">
          {stages.map((stage, idx) => {
            const widthPct = Math.max(15, Math.min(100, (stage.amount / maxAmount) * 100));
            const isFinalStage = idx === stages.length - 1;

            return (
              <div key={idx} className="space-y-1 group">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-surface-muted border border-surface-border flex items-center justify-center text-[10px] font-mono font-bold text-slate-300">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-slate-200">{stage.stage}</span>
                  </div>

                  <div className="flex items-center gap-4 font-mono">
                    <span className="text-slate-400">{stage.count} txs</span>
                    <span className="font-bold text-white">₹{stage.amount.toLocaleString()}</span>
                    <span
                      className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                        isFinalStage
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-surface-muted text-slate-400 border border-surface-border'
                      }`}
                    >
                      {stage.conversionRate}%
                    </span>
                  </div>
                </div>

                {/* Funnel Bar */}
                <div className="w-full h-3 bg-surface-muted rounded-full overflow-hidden p-0.5 border border-surface-border/40">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isFinalStage
                        ? 'bg-gradient-to-r from-brand-500 to-emerald-400 shadow-glow-brand'
                        : idx === 0
                        ? 'bg-slate-600'
                        : idx === 1
                        ? 'bg-rose-500/80'
                        : 'bg-brand-500/70'
                    }`}
                    style={{ width: `${widthPct}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

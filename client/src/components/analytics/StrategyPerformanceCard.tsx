import React from 'react';
import { StrategyPerformanceItem } from '../../types';
import { Card } from '../ui/Card';
import { RecommendedActionBadge } from '../recovery/RecommendedActionBadge';
import { Zap } from 'lucide-react';

interface StrategyPerformanceCardProps {
  breakdown: StrategyPerformanceItem[];
  isLoading: boolean;
}

export const StrategyPerformanceCard: React.FC<StrategyPerformanceCardProps> = ({
  breakdown,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <Card className="bg-surface border-surface-border p-6 space-y-4 animate-pulse">
        <div className="h-6 w-48 bg-surface-muted rounded"></div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-surface-muted/60 rounded-xl"></div>
          ))}
        </div>
      </Card>
    );
  }

  const items = breakdown || [];

  return (
    <Card className="bg-surface border-surface-border p-6 space-y-5">
      <div className="flex items-center justify-between border-b border-surface-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Recovery Strategy Performance</h3>
            <p className="text-xs text-slate-400">Effectiveness of AI recommended actions across all execution runs</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="p-3.5 rounded-xl bg-surface-muted/40 border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-center gap-3">
              <RecommendedActionBadge action={item.action} size="sm" />
              <span className="text-slate-400 font-mono">
                {item.attempts} run{item.attempts === 1 ? '' : 's'}
              </span>
            </div>

            <div className="flex items-center gap-5 font-mono">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Success Rate</span>
                <span className="font-bold text-emerald-400 text-sm">{item.successRate}%</span>
              </div>
              <div className="text-right min-w-[90px]">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Recovered</span>
                <span className="font-bold text-white text-sm">₹{item.revenueRecovered.toLocaleString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

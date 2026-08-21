import React from 'react';
import { PaymentRailPerformanceItem } from '../../types';
import { Card } from '../ui/Card';
import { CreditCard, Award } from 'lucide-react';

interface PaymentRailPerformanceCardProps {
  breakdown: PaymentRailPerformanceItem[];
  bestMethod: string;
  isLoading: boolean;
}

export const PaymentRailPerformanceCard: React.FC<PaymentRailPerformanceCardProps> = ({
  breakdown,
  bestMethod,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <Card className="bg-surface border-surface-border p-6 space-y-4 animate-pulse">
        <div className="h-6 w-48 bg-surface-muted rounded"></div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 bg-surface-muted/60 rounded-xl"></div>
          ))}
        </div>
      </Card>
    );
  }

  const items = breakdown || [];

  return (
    <Card className="bg-surface border-surface-border p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Payment Rail Performance</h3>
            <p className="text-xs text-slate-400">Settlement efficiency and recovery across payment methods</p>
          </div>
        </div>

        {bestMethod && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <Award className="w-3.5 h-3.5" />
            <span>Best Performing: {bestMethod}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item, idx) => {
          const isBest = item.paymentMethod === bestMethod;

          return (
            <div
              key={idx}
              className={`p-4 rounded-xl space-y-3 transition-all ${
                isBest
                  ? 'bg-gradient-to-br from-surface to-brand-950/30 border border-brand-500/40 shadow-glow-brand'
                  : 'bg-surface-muted/40 border border-surface-border'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">{item.paymentMethod}</span>
                <span className="text-xs font-mono text-slate-400">{item.count} total txs</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-surface/70 border border-surface-border">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Success</span>
                  <p className="font-bold font-mono text-emerald-400 mt-0.5">{item.successRate}%</p>
                </div>
                <div className="p-2 rounded-lg bg-surface/70 border border-surface-border">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Failure</span>
                  <p className="font-bold font-mono text-rose-400 mt-0.5">{item.failureRate}%</p>
                </div>
                <div className="p-2 rounded-lg bg-surface/70 border border-surface-border">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Recovered</span>
                  <p className="font-bold font-mono text-brand-300 mt-0.5">{item.recoveryRate}%</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-300 pt-1 border-t border-surface-border/60">
                <span>Total: ₹{item.volume.toLocaleString()}</span>
                <span className="text-emerald-400">Salvaged: ₹{item.recoveredRevenue.toLocaleString()}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

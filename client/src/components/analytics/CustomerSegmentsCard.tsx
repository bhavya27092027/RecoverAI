import React from 'react';
import { CustomerSegmentsResponse } from '../../types';
import { Card } from '../ui/Card';
import { Users, Sparkles, AlertCircle, ShieldAlert, Zap } from 'lucide-react';

interface CustomerSegmentsCardProps {
  segmentsData: CustomerSegmentsResponse | null;
  isLoading: boolean;
}

export const CustomerSegmentsCard: React.FC<CustomerSegmentsCardProps> = ({
  segmentsData,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <Card className="bg-surface border-surface-border p-6 space-y-4 animate-pulse">
        <div className="h-6 w-48 bg-surface-muted rounded"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-32 bg-surface-muted/60 rounded-xl"></div>
          <div className="h-32 bg-surface-muted/60 rounded-xl"></div>
          <div className="h-32 bg-surface-muted/60 rounded-xl"></div>
          <div className="h-32 bg-surface-muted/60 rounded-xl"></div>
        </div>
      </Card>
    );
  }

  const s = segmentsData?.segments;
  const hvhr = s?.HIGH_VALUE_HIGH_RECOVERY || { count: 0, totalLtv: 0, recoverablePipeline: 0, customers: [] };
  const hvlr = s?.HIGH_VALUE_LOW_RECOVERY || { count: 0, totalLtv: 0, recoverablePipeline: 0, customers: [] };
  const lvhr = s?.LOW_VALUE_HIGH_RECOVERY || { count: 0, totalLtv: 0, recoverablePipeline: 0, customers: [] };
  const lvlr = s?.LOW_VALUE_LOW_RECOVERY || { count: 0, totalLtv: 0, recoverablePipeline: 0, customers: [] };

  return (
    <Card className="bg-surface border-surface-border p-6 space-y-5">
      <div className="flex items-center justify-between border-b border-surface-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Customer Recovery Segments</h3>
            <p className="text-xs text-slate-400">Behavioral matrix of customer value vs recovery elasticity</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Quadrant 1: High Value / High Recovery (VIP) */}
        <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> High Value / High Recovery
            </span>
            <span className="text-xs font-mono font-bold text-white bg-surface px-2 py-0.5 rounded border border-emerald-500/30">
              {hvhr.count} customer{hvhr.count === 1 ? '' : 's'}
            </span>
          </div>
          <p className="text-[11px] text-slate-300">Top enterprise VIP accounts with high salvage likelihood.</p>
          <div className="flex items-center justify-between text-[11px] font-mono pt-1">
            <span className="text-slate-400">LTV: ₹{hvhr.totalLtv.toLocaleString()}</span>
            <span className="text-emerald-400 font-bold">Pipeline: ₹{hvhr.recoverablePipeline.toLocaleString()}</span>
          </div>
        </div>

        {/* Quadrant 2: High Value / Low Recovery (At Risk) */}
        <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> High Value / Low Recovery
            </span>
            <span className="text-xs font-mono font-bold text-white bg-surface px-2 py-0.5 rounded border border-amber-500/30">
              {hvlr.count} customer{hvlr.count === 1 ? '' : 's'}
            </span>
          </div>
          <p className="text-[11px] text-slate-300">High LTV accounts facing persistent or hard decline drops.</p>
          <div className="flex items-center justify-between text-[11px] font-mono pt-1">
            <span className="text-slate-400">LTV: ₹{hvlr.totalLtv.toLocaleString()}</span>
            <span className="text-amber-400 font-bold">Pipeline: ₹{hvlr.recoverablePipeline.toLocaleString()}</span>
          </div>
        </div>

        {/* Quadrant 3: Low Value / High Recovery (Fast Salvage) */}
        <div className="p-4 rounded-xl bg-brand-950/20 border border-brand-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-brand-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Low Value / High Recovery
            </span>
            <span className="text-xs font-mono font-bold text-white bg-surface px-2 py-0.5 rounded border border-brand-500/30">
              {lvhr.count} customer{lvhr.count === 1 ? '' : 's'}
            </span>
          </div>
          <p className="text-[11px] text-slate-300">High volume candidate accounts easily salvaged via retry/link.</p>
          <div className="flex items-center justify-between text-[11px] font-mono pt-1">
            <span className="text-slate-400">LTV: ₹{lvhr.totalLtv.toLocaleString()}</span>
            <span className="text-brand-300 font-bold">Pipeline: ₹{lvhr.recoverablePipeline.toLocaleString()}</span>
          </div>
        </div>

        {/* Quadrant 4: Low Value / Low Recovery (Dropouts) */}
        <div className="p-4 rounded-xl bg-surface-muted/50 border border-surface-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" /> Low Value / Low Recovery
            </span>
            <span className="text-xs font-mono font-bold text-white bg-surface px-2 py-0.5 rounded border border-surface-border">
              {lvlr.count} customer{lvlr.count === 1 ? '' : 's'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Low engagement or high friction accounts.</p>
          <div className="flex items-center justify-between text-[11px] font-mono pt-1">
            <span className="text-slate-400">LTV: ₹{lvlr.totalLtv.toLocaleString()}</span>
            <span className="text-slate-400 font-bold">Pipeline: ₹{lvlr.recoverablePipeline.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

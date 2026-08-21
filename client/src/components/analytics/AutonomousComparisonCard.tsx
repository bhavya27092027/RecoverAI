import React from 'react';
import { AutonomousVsHumanResponse } from '../../types';
import { Card } from '../ui/Card';
import { UserCheck, ShieldCheck } from 'lucide-react';

interface AutonomousComparisonCardProps {
  comparison: AutonomousVsHumanResponse | null;
  isLoading: boolean;
}

export const AutonomousComparisonCard: React.FC<AutonomousComparisonCardProps> = ({
  comparison,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <Card className="bg-surface border-surface-border p-6 space-y-4 animate-pulse">
        <div className="h-6 w-48 bg-surface-muted rounded"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-32 bg-surface-muted/60 rounded-xl"></div>
          <div className="h-32 bg-surface-muted/60 rounded-xl"></div>
        </div>
      </Card>
    );
  }

  const auto = comparison?.autonomous || {
    attempts: 0,
    successfulRecoveries: 0,
    successRate: 0,
    revenueRecovered: 0,
  };
  const human = comparison?.humanApproved || {
    attempts: 0,
    successfulRecoveries: 0,
    successRate: 0,
    revenueRecovered: 0,
  };

  return (
    <Card className="bg-surface border-surface-border p-6 space-y-5">
      <div className="flex items-center justify-between border-b border-surface-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Autonomous vs Human Approval</h3>
            <p className="text-xs text-slate-400">Performance comparison of automated policy vs manual merchant approval</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Autonomous Mode Panel */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-surface to-brand-950/30 border border-brand-500/40 space-y-4 shadow-glow-brand">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <h4 className="text-sm font-bold text-white">Autonomous Policy Execution</h4>
            </div>
            <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              ≥80% High Confidence
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-surface/80 border border-surface-border space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-400">Recovered Revenue</span>
              <p className="text-xl font-bold font-mono text-emerald-400">₹{auto.revenueRecovered.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-xl bg-surface/80 border border-surface-border space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-400">Success Rate</span>
              <p className="text-xl font-bold font-mono text-white">{auto.successRate}%</p>
            </div>
          </div>

          <p className="text-[11px] text-slate-300">
            {auto.successfulRecoveries} of {auto.attempts} automated attempts succeeded without human intervention.
          </p>
        </div>

        {/* Human Approved Panel */}
        <div className="p-5 rounded-2xl bg-surface-muted/40 border border-surface-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-bold text-white">Merchant Manual Approvals</h4>
            </div>
            <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              Human Oversight
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-surface/80 border border-surface-border space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-400">Recovered Revenue</span>
              <p className="text-xl font-bold font-mono text-white">₹{human.revenueRecovered.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-xl bg-surface/80 border border-surface-border space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-400">Success Rate</span>
              <p className="text-xl font-bold font-mono text-white">{human.successRate}%</p>
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            {human.successfulRecoveries} of {human.attempts} manual review attempts succeeded.
          </p>
        </div>
      </div>
    </Card>
  );
};

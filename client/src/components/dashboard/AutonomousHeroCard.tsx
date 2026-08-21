import React from 'react';
import { Link } from 'react-router-dom';
import { DashboardMetrics } from '../../types';
import { Button } from '../ui/Button';
import {
  Sparkles,
  TrendingUp,
  Percent,
  Zap,
  ArrowRight,
} from 'lucide-react';

interface AutonomousHeroCardProps {
  metrics: DashboardMetrics | null;
  isLoading: boolean;
}

export const AutonomousHeroCard: React.FC<AutonomousHeroCardProps> = ({
  metrics,
  isLoading,
}) => {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface via-brand-950/40 to-surface border border-brand-500/30 p-6 sm:p-8 shadow-fintech-card">
      <div className="absolute -right-16 -top-16 w-72 h-72 bg-brand-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 space-y-6">
        {/* Header Badge & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Autonomous Mode Active
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Policy: ≥80% Prob & High Conf
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              RecoverAI Autonomous Revenue Salvage
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              RecoverAI automatically evaluates eligible failed payments and executes simulated recovery strategies according to its decision policy.
            </p>
          </div>

          <Link to="/recovery-center">
            <Button
              variant="primary"
              size="md"
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="shadow-glow-brand whitespace-nowrap"
            >
              Open Recovery Center
            </Button>
          </Link>
        </div>

        {/* Dynamic Metric Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-surface/80 border border-surface-border space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] uppercase font-bold">Revenue Recovered</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold font-mono text-emerald-400">
              {isLoading ? '...' : `₹${(metrics?.recoveredRevenue || 0).toLocaleString()}`}
            </p>
            <p className="text-[10px] text-slate-400">Total settled revenue</p>
          </div>

          <div className="p-4 rounded-xl bg-surface/80 border border-surface-border space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] uppercase font-bold">Recovery Success Rate</span>
              <Percent className="w-3.5 h-3.5 text-brand-400" />
            </div>
            <p className="text-2xl font-bold font-mono text-white">
              {isLoading ? '...' : `${metrics?.recoverySuccessRate ?? 0}%`}
            </p>
            <p className="text-[10px] text-slate-400">
              {metrics?.successfulRecoveries || 0} of {metrics?.recoveryAttempts || 0} attempts
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface/80 border border-surface-border space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] uppercase font-bold">Active Opportunities</span>
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <p className="text-2xl font-bold font-mono text-white">
              {isLoading ? '...' : metrics?.recoveryOpportunities || 0}
            </p>
            <p className="text-[10px] text-brand-400 font-mono font-medium">
              ₹{(metrics?.aiRecoverableRevenue || 0).toLocaleString()} pipeline
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface/80 border border-surface-border space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] uppercase font-bold">Autonomous Recoveries</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <p className="text-2xl font-bold font-mono text-white">
              {isLoading ? '...' : metrics?.autonomousRecoveries || 0}
            </p>
            <p className="text-[10px] text-emerald-400/90">Policy-driven auto executed</p>
          </div>
        </div>
      </div>
    </div>
  );
};

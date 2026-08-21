import React from 'react';
import { AnalyticsOverview } from '../../types';
import { Card } from '../ui/Card';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Percent,
  Sparkles,
  Zap,
  RotateCcw,
  ArrowUpRight,
} from 'lucide-react';

interface AnalyticsKpiGridProps {
  overview: AnalyticsOverview | null;
  isLoading: boolean;
}

export const AnalyticsKpiGrid: React.FC<AnalyticsKpiGridProps> = ({
  overview,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-surface-muted/60 border border-surface-border"></div>
        ))}
      </div>
    );
  }

  const kpis = [
    {
      title: 'Total Payment Volume',
      value: `₹${(overview?.totalVolume || 0).toLocaleString()}`,
      sub: `${overview?.totalTransactions || 0} total transactions`,
      icon: <TrendingUp className="w-4 h-4 text-brand-400" />,
      highlight: false,
    },
    {
      title: 'Successful Revenue',
      value: `₹${(overview?.successfulRevenue || 0).toLocaleString()}`,
      sub: `${overview?.successfulTransactions || 0} cleared payments`,
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
      highlight: false,
    },
    {
      title: 'Revenue at Risk',
      value: `₹${(overview?.revenueAtRisk || 0).toLocaleString()}`,
      sub: `${overview?.failedTransactions || 0} unrecovered drops`,
      icon: <AlertTriangle className="w-4 h-4 text-rose-400" />,
      highlight: false,
      textColor: 'text-rose-400',
    },
    {
      title: 'Recovered Revenue',
      value: `₹${(overview?.recoveredRevenue || 0).toLocaleString()}`,
      sub: `${overview?.recoveredTransactions || 0} salvaged payments`,
      icon: <Sparkles className="w-4 h-4 text-emerald-400" />,
      highlight: true,
      textColor: 'text-emerald-400',
    },
    {
      title: 'Recovery Rate',
      value: `${overview?.recoveryRate ?? 0}%`,
      sub: 'Recovered / Total Failed Revenue',
      icon: <Percent className="w-4 h-4 text-indigo-400" />,
      highlight: false,
    },
    {
      title: 'Recovery Success Rate',
      value: `${overview?.recoverySuccessRate ?? 0}%`,
      sub: `${overview?.successfulAttempts || 0} of ${overview?.totalAttempts || 0} attempts succeeded`,
      icon: <RotateCcw className="w-4 h-4 text-brand-400" />,
      highlight: false,
    },
    {
      title: 'Recovery Lift',
      value: `+${overview?.recoveryLift ?? 0}%`,
      sub: 'Net financial recovery lift',
      icon: <ArrowUpRight className="w-4 h-4 text-emerald-400" />,
      highlight: false,
      textColor: 'text-emerald-400',
    },
    {
      title: 'AI Recoverable Pipeline',
      value: `₹${(overview?.potentialRecoverableRevenue || 0).toLocaleString()}`,
      sub: `${overview?.activeRecoveryOpportunities || 0} active opportunities`,
      icon: <Zap className="w-4 h-4 text-amber-400" />,
      highlight: false,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, idx) => (
        <Card
          key={idx}
          className={`p-4 space-y-1.5 relative overflow-hidden transition-all duration-200 hover:border-slate-700 ${
            kpi.highlight
              ? 'bg-gradient-to-br from-surface to-brand-950/30 border-brand-500/40 shadow-glow-brand'
              : 'bg-surface/80 border-surface-border'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">{kpi.title}</span>
            <div className="p-1 rounded-md bg-surface-muted border border-surface-border/60">
              {kpi.icon}
            </div>
          </div>
          <p className={`text-2xl font-bold font-mono ${kpi.textColor || 'text-white'}`}>
            {kpi.value}
          </p>
          <p className="text-[10px] text-slate-400 truncate">{kpi.sub}</p>
        </Card>
      ))}
    </div>
  );
};

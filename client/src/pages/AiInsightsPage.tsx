import React, { useState, useEffect } from 'react';
import { getMerchantInsightsApi } from '../api/ai.api';
import { AiInsight } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  BrainCircuit,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  CreditCard,
  UserCheck,
  Zap,
} from 'lucide-react';

export const AiInsightsPage: React.FC = () => {
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await getMerchantInsightsApi();
      if (res.success && res.data) {
        setInsights(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load AI intelligence insights');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'REVENUE':
        return <TrendingUp className="w-5 h-5 text-emerald-400" />;
      case 'RECOVERY_PERFORMANCE':
        return <Zap className="w-5 h-5 text-brand-400" />;
      case 'FAILURE_PATTERNS':
        return <AlertTriangle className="w-5 h-5 text-rose-400" />;
      case 'PAYMENT_RAILS':
        return <CreditCard className="w-5 h-5 text-indigo-400" />;
      case 'CUSTOMER_BEHAVIOR':
        return <UserCheck className="w-5 h-5 text-amber-400" />;
      default:
        return <Sparkles className="w-5 h-5 text-brand-400" />;
    }
  };

  const getConfidenceBadge = (conf?: string) => {
    switch (conf) {
      case 'HIGH_CONFIDENCE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> High Confidence
          </span>
        );
      case 'MEDIUM_CONFIDENCE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Medium Confidence
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span> Limited Data
          </span>
        );
    }
  };

  const highImpactCount = insights.filter((i) => i.impactLevel === 'HIGH').length;
  const overallConfidence = insights.length > 0 ? insights[0].dataConfidence : 'LIMITED_DATA';

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-16">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-surface via-brand-950/30 to-surface border border-brand-500/30 p-8 shadow-fintech-card">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-brand-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-400">
                Predictive Intelligence Feed
              </span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse"></span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              AI Financial Insights & Strategic Intelligence
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-normal">
              Autonomous pattern detection derived in real-time from your workspace transaction records and recovery performance.
            </p>
          </div>

          <Button
            variant="outline"
            size="md"
            onClick={fetchInsights}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Re-evaluate Insights
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-surface/80 border-surface-border p-4 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400">Active Intelligence Insights</span>
          <p className="text-2xl font-bold font-mono text-white">{insights.length}</p>
          <p className="text-[10px] text-slate-400">Evaluated across all merchant records</p>
        </Card>

        <Card className="bg-surface/80 border-surface-border p-4 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400">High-Impact Actionables</span>
          <p className="text-2xl font-bold font-mono text-emerald-400">{highImpactCount}</p>
          <p className="text-[10px] text-slate-400">Significant revenue recovery opportunities</p>
        </Card>

        <Card className="bg-surface/80 border-surface-border p-4 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400">Dataset Reliability Tier</span>
          <div className="pt-1">{getConfidenceBadge(overallConfidence)}</div>
          <p className="text-[10px] text-slate-400">Dynamic confidence assessment</p>
        </Card>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-300 text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={fetchInsights}>
            Retry
          </Button>
        </div>
      )}

      {/* Insights Grid */}
      {isLoading ? (
        <Card className="bg-surface border-surface-border p-12 text-center space-y-4">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/30 mx-auto flex items-center justify-center text-brand-400 animate-spin">
            <RefreshCw className="w-5 h-5" />
          </div>
          <p className="text-sm text-slate-400">Generating AI intelligence insights from live telemetry...</p>
        </Card>
      ) : insights.length === 0 ? (
        <Card className="bg-surface border-surface-border p-12 text-center space-y-4">
          <BrainCircuit className="w-12 h-12 text-brand-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">No Insights Generated Yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Process payments or ingest webhook events to start generating predictive failure analysis.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {insights.map((insight) => (
            <Card
              key={insight.id}
              className="bg-surface border-surface-border hover:border-slate-700 transition-all p-6 flex flex-col justify-between space-y-5 shadow-fintech-card"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-surface-muted border border-surface-border flex items-center justify-center flex-shrink-0">
                      {getCategoryIcon(insight.category)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {insight.category.replace(/_/g, ' ')}
                        </span>
                        {getConfidenceBadge(insight.dataConfidence)}
                      </div>
                      <h3 className="text-base font-bold text-white mt-1">
                        {insight.title}
                      </h3>
                    </div>
                  </div>

                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      insight.impactLevel === 'HIGH'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : insight.impactLevel === 'MEDIUM'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {insight.impactLevel} IMPACT
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-normal">
                  {insight.description}
                </p>
              </div>

              {insight.actionableRecommendation && (
                <div className="pt-3 border-t border-surface-border/60 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
                  <div className="text-[11px] text-slate-400">
                    <span className="font-semibold text-brand-300">Actionable Strategy: </span>
                    <span>{insight.actionableRecommendation}</span>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

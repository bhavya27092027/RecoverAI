import React from 'react';
import { useLocation } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import {
  ArrowLeftRight,
  ShieldCheck,
  Users,
  BarChart3,
  Sparkles,
  Zap,
  Lock,
} from 'lucide-react';

export const PlaceholderPage: React.FC = () => {
  const location = useLocation();

  const getPageInfo = () => {
    switch (location.pathname) {
      case '/transactions':
        return {
          title: 'Transactions Stream',
          subtitle: 'Real-time ingestion and status tracking for payment attempts.',
          icon: ArrowLeftRight,
          badge: 'Next Phase',
          desc: 'Once live transactions are created, failed attempts across UPI, Cards, and Net Banking will be streamed here for autonomous recovery routing.',
        };
      case '/recovery-center':
        return {
          title: 'Recovery Center',
          subtitle: 'Autonomous dunning rules, smart retries, and manual intervention overrides.',
          icon: ShieldCheck,
          badge: 'Next Phase',
          desc: 'Configure autonomous retry timing algorithms, webhook triggers, and multi-rail failover policies.',
        };
      case '/customers':
        return {
          title: 'Customer Intelligence',
          subtitle: 'Customer churn risk scoring and payment reliability profiles.',
          icon: Users,
          badge: 'Next Phase',
          desc: 'Individual customer payment history and AI-predicted payment success probability.',
        };
      case '/analytics':
        return {
          title: 'Recovery Analytics',
          subtitle: 'Granular breakdown of recovered revenue, gateway performance, and recovery lift.',
          icon: BarChart3,
          badge: 'Next Phase',
          desc: 'Detailed financial reporting comparing recovered revenue against unmitigated churn losses.',
        };
      case '/ai-insights':
        return {
          title: 'AI Predictive Insights',
          subtitle: 'Neural insights and recommended checkout optimization strategies.',
          icon: Sparkles,
          badge: 'AI Engine',
          desc: 'Machine learning recommendations on optimal retry time windows and payment gateway health.',
        };
      default:
        return {
          title: 'Workspace Feature',
          subtitle: 'RecoverAI Autonomous Platform Module',
          icon: Zap,
          badge: 'Phase 1 Foundation',
          desc: 'Core architecture and database foundation active.',
        };
    }
  };

  const info = getPageInfo();
  const Icon = info.icon;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="flex items-center justify-between border-b border-surface-border/80 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{info.title}</h1>
          <p className="text-sm text-slate-400 mt-1">{info.subtitle}</p>
        </div>
        <Badge variant="brand" size="md">
          {info.badge}
        </Badge>
      </div>

      <Card className="bg-surface border-surface-border p-12 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/30 mx-auto flex items-center justify-center text-brand-400 shadow-glow-brand">
          <Icon className="w-8 h-8" />
        </div>

        <div className="space-y-2 max-w-md mx-auto">
          <h2 className="text-xl font-bold text-white">Module Foundation Online</h2>
          <p className="text-sm text-slate-400 leading-relaxed">{info.desc}</p>
        </div>

        <div className="p-4 rounded-xl bg-surface-muted/60 border border-surface-border max-w-md mx-auto flex items-center gap-3 text-xs text-slate-300 text-left">
          <Lock className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>
            Database schema and merchant-scoped security middleware are already initialized and ready for this module.
          </span>
        </div>
      </Card>
    </div>
  );
};

import React from 'react';
import { RecoveryEvent, RecoveryEventType } from '../../types';
import {
  Sparkles,
  Play,
  RotateCcw,
  Send,
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  Activity,
} from 'lucide-react';

interface AgentEventTimelineProps {
  events: RecoveryEvent[];
  className?: string;
}

export const AgentEventTimeline: React.FC<AgentEventTimelineProps> = ({
  events,
  className = '',
}) => {
  const getEventIcon = (type: RecoveryEventType) => {
    switch (type) {
      case 'ANALYSIS_SELECTED':
        return <Sparkles className="w-3.5 h-3.5 text-brand-400" />;
      case 'RECOVERY_STARTED':
        return <Play className="w-3.5 h-3.5 text-indigo-400" />;
      case 'ACTION_SELECTED':
        return <Activity className="w-3.5 h-3.5 text-amber-400" />;
      case 'RETRY_INITIATED':
        return <RotateCcw className="w-3.5 h-3.5 text-brand-400" />;
      case 'PAYMENT_LINK_GENERATED':
        return <Send className="w-3.5 h-3.5 text-cyan-400" />;
      case 'ALTERNATE_METHOD_SELECTED':
        return <CreditCard className="w-3.5 h-3.5 text-purple-400" />;
      case 'PAYMENT_PROCESSING':
        return <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />;
      case 'PAYMENT_RECOVERED':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      case 'RECOVERY_FAILED':
        return <XCircle className="w-3.5 h-3.5 text-rose-400" />;
      case 'RECOVERY_SKIPPED':
        return <Ban className="w-3.5 h-3.5 text-slate-400" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-brand-400" />;
    }
  };

  const formatEventTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    } catch {
      return '';
    }
  };

  if (!events || events.length === 0) {
    return (
      <div className={`p-6 text-center text-xs text-slate-500 bg-surface-muted/30 rounded-xl border border-surface-border ${className}`}>
        No agent telemetry recorded for this recovery session yet.
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-border">
        {events.map((evt, idx) => (
          <div key={evt.id || idx} className="relative group animate-fade-in">
            {/* Timeline Dot */}
            <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-surface border border-surface-border flex items-center justify-center shadow-sm group-hover:border-brand-500 transition-colors">
              {getEventIcon(evt.eventType)}
            </div>

            {/* Event Content */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-slate-400 bg-surface-muted px-1.5 py-0.5 rounded border border-surface-border/60">
                  {formatEventTime(evt.timestamp)}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  {evt.eventType.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed font-normal">
                {evt.message}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

import React from 'react';
import { RecommendedAction } from '../../types';
import {
  RotateCcw,
  Clock,
  Send,
  CreditCard,
  Ban,
} from 'lucide-react';

interface RecommendedActionBadgeProps {
  action: RecommendedAction;
  size?: 'sm' | 'md' | 'lg';
  showDescription?: boolean;
}

export const RecommendedActionBadge: React.FC<RecommendedActionBadgeProps> = ({
  action,
  size = 'md',
  showDescription = false,
}) => {
  let label = 'WAIT & RETRY';
  let description = 'Calculated delay to avoid bank reject thresholds';
  let icon = <Clock className="w-4 h-4" />;
  let colorClass = 'bg-brand-500/10 text-brand-400 border-brand-500/30';

  switch (action) {
    case 'RETRY_NOW':
      label = 'RETRY NOW';
      description = 'Immediate smart retry as gateway conditions are optimal';
      icon = <RotateCcw className="w-4 h-4" />;
      colorClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      break;
    case 'WAIT_AND_RETRY':
      label = 'WAIT & RETRY';
      description = 'Calculated delay to avoid consecutive bank reject thresholds';
      icon = <Clock className="w-4 h-4" />;
      colorClass = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
      break;
    case 'SEND_PAYMENT_LINK':
      label = 'SEND PAYMENT LINK';
      description = 'Dispatch dynamic checkout link for customer replenishment';
      icon = <Send className="w-4 h-4" />;
      colorClass = 'bg-sky-500/10 text-sky-400 border-sky-500/30';
      break;
    case 'SUGGEST_ALTERNATE_METHOD':
      label = 'SUGGEST ALTERNATE METHOD';
      description = 'Prompt customer with alternative payment rail (UPI / Net Banking)';
      icon = <CreditCard className="w-4 h-4" />;
      colorClass = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      break;
    case 'STOP_RECOVERY':
      label = 'STOP RECOVERY';
      description = 'Halt automated recovery to preserve authorization health';
      icon = <Ban className="w-4 h-4" />;
      colorClass = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      break;
  }

  if (size === 'sm') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-xs font-bold uppercase tracking-wider ${colorClass}`}
      >
        {icon}
        <span>{label}</span>
      </span>
    );
  }

  return (
    <div className="space-y-1">
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold uppercase tracking-wider ${colorClass}`}
      >
        {icon}
        <span>{label}</span>
      </div>
      {showDescription && (
        <p className="text-[11px] text-slate-400">{description}</p>
      )}
    </div>
  );
};

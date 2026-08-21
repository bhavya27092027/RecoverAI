import React from 'react';

interface RecoveryScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const RecoveryScoreBadge: React.FC<RecoveryScoreBadgeProps> = ({
  score,
  size = 'md',
  showLabel = true,
}) => {
  const clampedScore = Math.max(0, Math.min(100, score));

  // Determine tier and styling
  let tier = 'LOW';
  let tierLabel = 'LOW RECOVERY POTENTIAL';
  let strokeColor = '#f43f5e'; // rose-500
  let textColor = 'text-rose-400';
  let bgColor = 'bg-rose-500/10';
  let borderColor = 'border-rose-500/30';

  if (clampedScore >= 80) {
    tier = 'HIGH';
    tierLabel = 'HIGH RECOVERY POTENTIAL';
    strokeColor = '#10b981'; // emerald-500
    textColor = 'text-emerald-400';
    bgColor = 'bg-emerald-500/10';
    borderColor = 'border-emerald-500/30';
  } else if (clampedScore >= 60) {
    tier = 'MEDIUM';
    tierLabel = 'MEDIUM RECOVERY POTENTIAL';
    strokeColor = '#f59e0b'; // amber-500
    textColor = 'text-amber-400';
    bgColor = 'bg-amber-500/10';
    borderColor = 'border-amber-500/30';
  }

  // SVG circular dimensions
  const radius = size === 'lg' ? 44 : size === 'md' ? 32 : 20;
  const strokeWidth = size === 'lg' ? 7 : size === 'md' ? 5 : 3.5;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;
  const svgSize = (radius + strokeWidth) * 2;

  if (size === 'sm') {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${bgColor} ${borderColor}`}>
        <span className={`font-mono text-xs font-bold ${textColor}`}>{clampedScore}%</span>
        {showLabel && (
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${textColor}`}>
            {tier}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div className="relative flex items-center justify-center">
        <svg
          width={svgSize}
          height={svgSize}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            stroke="#1e293b"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress stroke */}
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span
            className={`font-mono font-extrabold tracking-tight ${
              size === 'lg' ? 'text-2xl' : 'text-lg'
            } ${textColor}`}
          >
            {clampedScore}%
          </span>
        </div>
      </div>

      {showLabel && (
        <span
          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${bgColor} ${borderColor} ${textColor}`}
        >
          {tierLabel}
        </span>
      )}
    </div>
  );
};

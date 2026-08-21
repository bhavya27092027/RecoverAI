import React, { useState } from 'react';
import { RevenueTrendPoint } from '../../types';
import { Card } from '../ui/Card';
import { TrendingUp, Calendar } from 'lucide-react';

interface RevenueTrendChartProps {
  points: RevenueTrendPoint[];
  currentRange: '7D' | '30D' | '90D' | 'ALL';
  onRangeChange: (range: '7D' | '30D' | '90D' | 'ALL') => void;
  isLoading: boolean;
}

export const RevenueTrendChart: React.FC<RevenueTrendChartProps> = ({
  points,
  currentRange,
  onRangeChange,
  isLoading,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<RevenueTrendPoint | null>(null);

  if (isLoading) {
    return (
      <Card className="bg-surface border-surface-border p-6 space-y-4 animate-pulse">
        <div className="h-6 w-48 bg-surface-muted rounded"></div>
        <div className="h-64 bg-surface-muted/40 rounded-xl"></div>
      </Card>
    );
  }

  const hasData = points && points.length > 0;
  const maxVal = hasData
    ? Math.max(
        ...points.map((p) => Math.max(p.successfulRevenue, p.failedRevenue, p.recoveredRevenue)),
        1000
      )
    : 1000;

  return (
    <Card className="bg-surface border-surface-border p-6 space-y-6">
      {/* Header & Range Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Revenue Trends & Distribution</h3>
            <p className="text-xs text-slate-400">Successful, failed, and recovered revenue aggregated over time</p>
          </div>
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center gap-1 bg-surface-muted p-1 rounded-lg border border-surface-border self-start sm:self-auto">
          {(['7D', '30D', '90D', 'ALL'] as const).map((r) => (
            <button
              key={r}
              onClick={() => onRangeChange(r)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                currentRange === r
                  ? 'bg-brand-500 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-surface-border/50'
              }`}
            >
              {r === 'ALL' ? 'All Time' : r}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-slate-300 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
          <span>Successful Revenue</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-brand-400"></span>
          <span>Recovered Revenue</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-rose-400"></span>
          <span>Failed Revenue</span>
        </div>
      </div>

      {/* Chart Canvas / SVG Container */}
      {!hasData ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-surface-muted/30 rounded-xl border border-surface-border text-slate-500 text-xs">
          <Calendar className="w-8 h-8 text-slate-600 mb-2" />
          <p className="font-semibold text-slate-400">Not enough transaction data yet</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Transactions recorded over time will appear dynamically in this chart.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="h-64 flex items-end gap-2 sm:gap-4 pt-8 pb-2 px-2 bg-surface-muted/20 rounded-xl border border-surface-border relative overflow-x-auto custom-scrollbar">
            {points.map((p, idx) => {
              const successH = Math.max(4, Math.round((p.successfulRevenue / maxVal) * 100));
              const recoveredH = Math.max(4, Math.round((p.recoveredRevenue / maxVal) * 100));
              const failedH = Math.max(4, Math.round((p.failedRevenue / maxVal) * 100));

              return (
                <div
                  key={idx}
                  className="flex-1 min-w-[36px] flex flex-col items-center justify-end h-full group relative cursor-pointer"
                  onMouseEnter={() => setHoveredPoint(p)}
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  {/* Tooltip */}
                  {hoveredPoint?.date === p.date && (
                    <div className="absolute -top-20 z-20 bg-surface border border-brand-500/40 p-2 rounded-lg shadow-xl text-[10px] space-y-0.5 pointer-events-none whitespace-nowrap min-w-[120px]">
                      <p className="font-bold text-white font-mono">{p.date}</p>
                      <p className="text-emerald-400 font-mono">Success: ₹{p.successfulRevenue.toLocaleString()}</p>
                      <p className="text-brand-300 font-mono">Recovered: ₹{p.recoveredRevenue.toLocaleString()}</p>
                      <p className="text-rose-400 font-mono">Failed: ₹{p.failedRevenue.toLocaleString()}</p>
                    </div>
                  )}

                  {/* Multi-Bar Group */}
                  <div className="w-full flex items-end justify-center gap-0.5 h-full">
                    {p.successfulRevenue > 0 && (
                      <div
                        className="w-2.5 bg-emerald-500/80 rounded-t group-hover:bg-emerald-400 transition-colors"
                        style={{ height: `${successH}%` }}
                      ></div>
                    )}
                    {p.recoveredRevenue > 0 && (
                      <div
                        className="w-2.5 bg-brand-500/90 rounded-t group-hover:bg-brand-400 transition-colors"
                        style={{ height: `${recoveredH}%` }}
                      ></div>
                    )}
                    {p.failedRevenue > 0 && (
                      <div
                        className="w-2.5 bg-rose-500/80 rounded-t group-hover:bg-rose-400 transition-colors"
                        style={{ height: `${failedH}%` }}
                      ></div>
                    )}
                  </div>

                  {/* Date Label */}
                  <span className="text-[9px] font-mono text-slate-500 mt-2 truncate max-w-full">
                    {p.date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
};

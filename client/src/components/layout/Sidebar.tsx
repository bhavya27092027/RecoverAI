import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  ShieldCheck,
  Users,
  BarChart3,
  Sparkles,
  Settings,
  LogOut,
  Zap,
  Building2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { clsx } from 'clsx';

export const Sidebar: React.FC = () => {
  const { user, merchant, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const navItems = [
    { name: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Transactions', path: '/transactions', icon: ArrowLeftRight },
    { name: 'Recovery Center', path: '/recovery-center', icon: ShieldCheck },
    { name: 'Customers', path: '/customers', icon: Users },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'AI Insights', path: '/ai-insights', icon: Sparkles, badge: 'AI' },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-surface/95 border-r border-surface-border flex flex-col h-screen select-none z-20">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-surface-border/60">
        <NavLink to="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-400 flex items-center justify-center shadow-md shadow-brand-600/30 group-hover:scale-105 transition-transform duration-200">
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
              Recover<span className="text-brand-400 font-extrabold">AI</span>
            </span>
            <span className="block text-[10px] text-slate-400 tracking-wider font-semibold uppercase -mt-0.5">
              Autonomous Recovery
            </span>
          </div>
        </NavLink>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Platform
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                clsx(
                  'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group',
                  isActive
                    ? 'bg-brand-600/15 text-brand-300 border border-brand-500/30 shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <Icon
                      className={clsx(
                        'w-4 h-4 transition-colors',
                        isActive ? 'text-brand-400' : 'text-slate-400 group-hover:text-slate-200'
                      )}
                    />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-brand-500/20 text-brand-300 border border-brand-500/30">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Merchant & User Profile Footer */}
      <div className="p-3 border-t border-surface-border/80 bg-surface-muted/40">
        <div className="p-2.5 rounded-xl bg-surface-muted border border-surface-border/70 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white uppercase flex-shrink-0 shadow-sm">
                {user?.name ? user.name.charAt(0) : 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-200 truncate">{user?.name || 'User'}</p>
                <div className="flex items-center gap-1 text-[11px] text-slate-400 truncate">
                  <Building2 className="w-3 h-3 text-slate-400 flex-shrink-0" />
                  <span className="truncate">{merchant?.businessName || 'Merchant'}</span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-300 hover:bg-rose-950/30 border border-transparent hover:border-rose-900/40 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

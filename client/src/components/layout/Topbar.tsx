import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getNotificationsApi,
  markNotificationAsReadApi,
  markAllNotificationsAsReadApi,
} from '../../api/notification.api';
import { globalSearchApi } from '../../api/search.api';
import { NotificationItem, SearchResultItem } from '../../types';
import {
  Bell,
  Search,
  CheckCheck,
  User,
  CreditCard,
  X,
} from 'lucide-react';

export const Topbar: React.FC = () => {
  const { merchant } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Notifications State
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    customers: SearchResultItem[];
    transactions: SearchResultItem[];
  }>({ customers: [], transactions: [] });
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await getNotificationsApi();
      if (res.success) {
        setNotifications(res.data);
        setUnreadCount(res.unreadCount);
      }
    } catch {
      // Graceful fallback
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut Ctrl+K for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Live search query effect
  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      setIsSearching(true);
      const timer = setTimeout(async () => {
        try {
          const res = await globalSearchApi(searchQuery.trim());
          if (res.success) {
            setSearchResults(res.data);
          }
        } finally {
          setIsSearching(false);
        }
      }, 250);
      return () => clearTimeout(timer);
    } else {
      setSearchResults({ customers: [], transactions: [] });
      setIsSearching(false);
    }
  }, [searchQuery]);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsReadApi();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Fallback
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      markNotificationAsReadApi(notif.id).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setIsNotifOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard':
        return 'Overview';
      case '/transactions':
        return 'Transactions Stream';
      case '/recovery-center':
        return 'Recovery Center';
      case '/customers':
        return 'Customer Intelligence';
      case '/analytics':
        return 'Recovery Analytics';
      case '/ai-insights':
        return 'AI Predictive Insights';
      case '/settings':
        return 'Merchant Settings';
      default:
        return 'Platform';
    }
  };

  return (
    <header className="h-16 border-b border-surface-border/60 bg-surface/70 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold text-white tracking-tight">{getPageTitle()}</h1>
        <span className="text-slate-600 hidden sm:inline">/</span>
        <span className="text-xs text-slate-400 font-medium hidden sm:inline">
          {merchant?.businessName || 'Workspace'}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Global Omnibar Search Trigger */}
        <div className="relative" ref={searchRef}>
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-muted hover:bg-surface-border/60 border border-surface-border text-xs text-slate-400 hover:text-white transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Search records...</span>
            <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[9px] font-mono bg-surface border border-surface-border rounded text-slate-400">
              Ctrl+K
            </kbd>
          </button>

          {/* Omnibar Dropdown Modal */}
          {isSearchOpen && (
            <div className="absolute right-0 top-11 w-80 sm:w-96 bg-surface border border-surface-border rounded-2xl shadow-2xl p-3 space-y-3 z-50 animate-fade-in">
              <div className="flex items-center gap-2 bg-surface-muted px-3 py-2 rounded-xl border border-surface-border">
                <Search className="w-4 h-4 text-brand-400 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search customers, transactions, IDs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="bg-transparent text-xs text-white placeholder-slate-500 outline-none w-full"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')}>
                    <X className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
                  </button>
                )}
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2 custom-scrollbar">
                {isSearching ? (
                  <p className="text-[11px] text-center text-slate-400 py-3">Searching...</p>
                ) : searchResults.customers.length === 0 && searchResults.transactions.length === 0 ? (
                  <p className="text-[11px] text-center text-slate-500 py-3">
                    {searchQuery.length >= 2 ? 'No matching records found' : 'Type 2+ characters to search'}
                  </p>
                ) : (
                  <>
                    {searchResults.customers.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 px-2">Customers</span>
                        {searchResults.customers.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => {
                              setIsSearchOpen(false);
                              navigate(c.url);
                            }}
                            className="p-2 rounded-lg hover:bg-surface-muted cursor-pointer flex items-center justify-between text-xs transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <User className="w-3.5 h-3.5 text-brand-400" />
                              <span className="font-semibold text-white">{c.title}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">{c.subtitle}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {searchResults.transactions.length > 0 && (
                      <div className="space-y-1 pt-1 border-t border-surface-border/50">
                        <span className="text-[10px] uppercase font-bold text-slate-400 px-2">Transactions</span>
                        {searchResults.transactions.map((t) => (
                          <div
                            key={t.id}
                            onClick={() => {
                              setIsSearchOpen(false);
                              navigate(t.url);
                            }}
                            className="p-2 rounded-lg hover:bg-surface-muted cursor-pointer flex items-center justify-between text-xs transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="font-semibold text-white">{t.title}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">{t.subtitle}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Demo Mode / Simulation Environment Indicator */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 text-[10px] font-bold uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          <span>Simulation Mode</span>
        </div>

        {/* Real-Time AI Status Badge */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Engine Active</span>
        </div>

        {/* Notification Center Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="w-9 h-9 rounded-xl bg-surface-muted hover:bg-surface-hover border border-surface-border flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors relative"
            title="Autonomous System Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-500 text-white font-bold text-[10px] flex items-center justify-center border-2 border-surface shadow-glow-brand animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 top-11 w-80 sm:w-96 bg-surface border border-surface-border rounded-2xl shadow-2xl p-4 space-y-3 z-50 animate-fade-in">
              <div className="flex items-center justify-between border-b border-surface-border/60 pb-2">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-brand-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Notifications</h3>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[10px] text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1"
                  >
                    <CheckCheck className="w-3 h-3" /> Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2 custom-scrollbar">
                {notifications.length === 0 ? (
                  <p className="text-xs text-center text-slate-500 py-4">No notifications yet.</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer space-y-1 ${
                        !n.isRead
                          ? 'bg-brand-950/20 border-brand-500/40 hover:bg-brand-950/40'
                          : 'bg-surface-muted/40 border-surface-border hover:bg-surface-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white truncate max-w-[200px]">{n.title}</span>
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-brand-400 flex-shrink-0"></span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-300 leading-snug">{n.message}</p>
                      <span className="text-[9px] font-mono text-slate-500 block pt-0.5">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

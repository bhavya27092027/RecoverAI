import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCustomersApi } from '../api/customer.api';
import { Customer, CustomerHealth } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { CreateCustomerModal } from '../components/customers/CreateCustomerModal';
import {
  Users,
  UserPlus,
  Search,
  RefreshCw,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = async (query = searchQuery) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await getCustomersApi({ q: query || undefined });
      if (res.success && res.data) {
        setCustomers(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load customers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers(searchQuery);
  };

  const handleCustomerCreated = (newCustomer: Customer) => {
    setCustomers((prev) => [newCustomer, ...prev]);
  };

  const calculateHealth = (c: Customer): CustomerHealth => {
    const total = c.totalTransactions || 0;
    if (total === 0) return 'Strong';
    const success = (c.successfulPayments || 0) + (c.recoveredPayments || 0);
    const rate = Math.round((success / total) * 100);

    if (rate >= 70 || (c.totalValue || 0) >= 20000) return 'Strong';
    if (rate >= 40) return 'Watch';
    return 'At Risk';
  };

  const getHealthBadge = (health: CustomerHealth) => {
    switch (health) {
      case 'Strong':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Strong
          </span>
        );
      case 'Watch':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Watch
          </span>
        );
      case 'At Risk':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span> At Risk
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border/80 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Customer Intelligence</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your merchant customer accounts, account health metrics, and lifetime recovery elasticity.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchCustomers()}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            leftIcon={<UserPlus className="w-4 h-4" />}
            className="shadow-glow-brand"
          >
            + New Customer
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => fetchCustomers()}>
            Retry
          </Button>
        </div>
      )}

      {/* Search Bar */}
      <Card className="bg-surface/80 border-surface-border p-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by customer name, email address, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-muted border border-surface-border rounded-xl pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
          {searchQuery && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                fetchCustomers('');
              }}
            >
              Clear
            </Button>
          )}
        </form>
      </Card>

      {/* Customers Table */}
      {isLoading ? (
        <Card className="bg-surface border-surface-border p-12 text-center space-y-4">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/30 mx-auto flex items-center justify-center text-brand-400 animate-spin">
            <RefreshCw className="w-5 h-5" />
          </div>
          <p className="text-sm text-slate-400">Loading workspace customer directory...</p>
        </Card>
      ) : customers.length === 0 ? (
        <Card className="bg-surface border-surface-border p-12 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/30 mx-auto flex items-center justify-center text-brand-400 shadow-glow-brand">
            <Users className="w-8 h-8" />
          </div>
          <div className="space-y-1.5 max-w-sm mx-auto">
            <h3 className="text-lg font-bold text-white">
              {searchQuery ? 'No matching customers found' : 'No customers yet.'}
            </h3>
            <p className="text-xs text-slate-400">
              {searchQuery
                ? 'Try refining your search keyword or clearing the filter.'
                : 'Create your first customer to start recording payments.'}
            </p>
          </div>
          {!searchQuery && (
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsModalOpen(true)}
              leftIcon={<UserPlus className="w-4 h-4" />}
            >
              Create First Customer
            </Button>
          )}
        </Card>
      ) : (
        <Card className="bg-surface border-surface-border p-0 overflow-hidden shadow-fintech-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-surface-muted/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Customer</th>
                  <th className="py-3.5 px-4">Contact Phone</th>
                  <th className="py-3.5 px-4 text-center">Health Status</th>
                  <th className="py-3.5 px-4 text-center">Transactions</th>
                  <th className="py-3.5 px-4 text-center">Successful</th>
                  <th className="py-3.5 px-4 text-center">Failed</th>
                  <th className="py-3.5 px-4 text-center">Recovered</th>
                  <th className="py-3.5 px-4 text-right">Lifetime Value</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/60">
                {customers.map((c) => {
                  const health = calculateHealth(c);

                  return (
                    <tr key={c.id} className="hover:bg-surface-muted/40 transition-colors group">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-xs font-bold text-brand-400 uppercase flex-shrink-0">
                            {c.name.charAt(0)}
                          </div>
                          <div>
                            <Link
                              to={`/customers/${c.id}`}
                              className="font-semibold text-white hover:text-brand-400 transition-colors flex items-center gap-1.5"
                            >
                              <span>{c.name}</span>
                            </Link>
                            <p className="text-xs text-slate-400 font-mono">{c.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-slate-300">
                        {c.phone ? (
                          <span className="font-mono text-xs text-slate-300">{c.phone}</span>
                        ) : (
                          <span className="text-slate-500 text-xs">—</span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-center">
                        {getHealthBadge(health)}
                      </td>

                      <td className="py-4 px-4 text-center font-mono font-medium text-slate-200">
                        {c.totalTransactions || 0}
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {c.successfulPayments || 0}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-mono font-semibold ${
                            (c.failedPayments || 0) > 0
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {c.failedPayments || 0}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-mono font-semibold ${
                            (c.recoveredPayments || 0) > 0
                              ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {c.recoveredPayments || 0}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right font-mono font-bold text-white">
                        ₹{(c.totalValue || 0).toLocaleString()}
                      </td>

                      <td className="py-4 px-5 text-right">
                        <Link to={`/customers/${c.id}`}>
                          <Button variant="ghost" size="sm" rightIcon={<ExternalLink className="w-3.5 h-3.5" />}>
                            Profile
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create Customer Modal */}
      <CreateCustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleCustomerCreated}
      />
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getTransactionsApi } from '../api/transaction.api';
import { Transaction } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { CreateTransactionModal } from '../components/transactions/CreateTransactionModal';
import { CreateCustomerModal } from '../components/customers/CreateCustomerModal';
import {
  ArrowLeftRight,
  PlusCircle,
  Search,
  RefreshCw,
  ExternalLink,
  Sparkles,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Zap,
} from 'lucide-react';

type SortField = 'date' | 'amount' | 'status';
type SortOrder = 'asc' | 'desc';

export const TransactionsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, pages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sorting
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Filters State
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'ALL');
  const [methodFilter, setMethodFilter] = useState<string>(searchParams.get('method') || 'ALL');
  const [reasonFilter, setReasonFilter] = useState<string>(searchParams.get('reason') || 'ALL');
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  // Modals State
  const [isCreateTxModalOpen, setIsCreateTxModalOpen] = useState(false);
  const [isCreateCustomerModalOpen, setIsCreateCustomerModalOpen] = useState(false);

  const fetchTransactions = async (page = currentPage) => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await getTransactionsApi({
        q: searchQuery || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        paymentMethod: methodFilter !== 'ALL' ? methodFilter : undefined,
        failureReason: reasonFilter !== 'ALL' ? reasonFilter : undefined,
        page,
        limit: 20,
      });

      if (res.success && res.data) {
        setTransactions(res.data);
        setPagination(res.pagination);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch transactions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions(currentPage);
  }, [currentPage, statusFilter, methodFilter, reasonFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTransactions(1);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setMethodFilter('ALL');
    setReasonFilter('ALL');
    setSearchParams({});
    fetchTransactions(1);
  };

  const handleTransactionCreated = (newTx: Transaction) => {
    setTransactions((prev) => [newTx, ...prev]);
    fetchTransactions(1);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedTransactions = useMemo(() => {
    const list = [...transactions];
    list.sort((a, b) => {
      if (sortField === 'amount') {
        return sortOrder === 'asc' ? a.amount - b.amount : b.amount - a.amount;
      }
      if (sortField === 'status') {
        return sortOrder === 'asc' ? a.status.localeCompare(b.status) : b.status.localeCompare(a.status);
      }
      // default: date
      return sortOrder === 'asc'
        ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return list;
  }, [transactions, sortField, sortOrder]);

  const getStatusBadge = (tx: Transaction) => {
    switch (tx.status) {
      case 'SUCCESS':
        return <Badge variant="success">SUCCESS</Badge>;
      case 'FAILED':
        return <Badge variant="warning">FAILED</Badge>;
      case 'RECOVERED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <Sparkles className="w-3 h-3" /> RECOVERED
          </span>
        );
      case 'PROCESSING':
        return <Badge variant="info">PROCESSING</Badge>;
      default:
        return <Badge variant="outline">CREATED</Badge>;
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-slate-500 inline ml-1" />;
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-brand-400 inline ml-1" />
    ) : (
      <ArrowDown className="w-3 h-3 text-brand-400 inline ml-1" />
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border/80 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Transactions Stream</h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time merchant payment ledger with dynamic multi-column sorting, AI recovery status, and failure auditing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchTransactions(currentPage)}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateTxModalOpen(true)}
            leftIcon={<PlusCircle className="w-4 h-4" />}
            className="shadow-glow-brand"
          >
            + New Transaction
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => fetchTransactions(currentPage)}>
            Retry
          </Button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <Card className="bg-surface/80 border-surface-border p-4 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by Transaction ID, Customer Name, Email, or Amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-muted border border-surface-border rounded-xl pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-2 border-t border-surface-border/60">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-surface-muted border border-surface-border rounded-lg text-xs text-slate-200 px-2.5 py-1.5 focus:ring-brand-500 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="CREATED">Created</option>
              <option value="PROCESSING">Processing</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILED">Failed</option>
              <option value="RECOVERED">Recovered</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400">Payment Rail</label>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full bg-surface-muted border border-surface-border rounded-lg text-xs text-slate-200 px-2.5 py-1.5 focus:ring-brand-500 cursor-pointer"
            >
              <option value="ALL">All Rails</option>
              <option value="UPI">UPI</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Debit Card">Debit Card</option>
              <option value="Net Banking">Net Banking</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400">Failure Reason</label>
            <select
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value)}
              className="w-full bg-surface-muted border border-surface-border rounded-lg text-xs text-slate-200 px-2.5 py-1.5 focus:ring-brand-500 cursor-pointer"
            >
              <option value="ALL">All Failure Reasons</option>
              <option value="BANK_TIMEOUT">Bank Timeout</option>
              <option value="INSUFFICIENT_BALANCE">Insufficient Balance</option>
              <option value="CARD_DECLINED">Card Declined</option>
              <option value="AUTHENTICATION_FAILURE">Authentication Failure</option>
              <option value="TRANSACTION_LIMIT">Transaction Limit</option>
              <option value="CUSTOMER_ABANDONMENT">Customer Abandonment</option>
            </select>
          </div>

          <div className="flex items-end">
            {(searchQuery || statusFilter !== 'ALL' || methodFilter !== 'ALL' || reasonFilter !== 'ALL') && (
              <Button type="button" variant="ghost" size="sm" onClick={handleClearFilters} className="w-full">
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Transactions Table */}
      {isLoading ? (
        <Card className="bg-surface border-surface-border p-12 text-center space-y-4">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/30 mx-auto flex items-center justify-center text-brand-400 animate-spin">
            <RefreshCw className="w-5 h-5" />
          </div>
          <p className="text-sm text-slate-400">Loading merchant transactions...</p>
        </Card>
      ) : transactions.length === 0 ? (
        <Card className="bg-surface border-surface-border p-12 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/30 mx-auto flex items-center justify-center text-brand-400 shadow-glow-brand">
            <ArrowLeftRight className="w-8 h-8" />
          </div>
          <div className="space-y-1.5 max-w-sm mx-auto">
            <h3 className="text-lg font-bold text-white">
              {searchQuery || statusFilter !== 'ALL' || methodFilter !== 'ALL' || reasonFilter !== 'ALL'
                ? 'No matching transactions found'
                : 'No transactions recorded yet.'}
            </h3>
            <p className="text-xs text-slate-400">
              {searchQuery || statusFilter !== 'ALL'
                ? 'Try adjusting your filters or search keywords.'
                : 'Create your first transaction to start tracking payment performance.'}
            </p>
          </div>
          {!(searchQuery || statusFilter !== 'ALL') && (
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsCreateTxModalOpen(true)}
              leftIcon={<PlusCircle className="w-4 h-4" />}
            >
              Create Transaction
            </Button>
          )}
        </Card>
      ) : (
        <Card className="bg-surface border-surface-border p-0 overflow-hidden shadow-fintech-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-surface-muted/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider select-none">
                  <th className="py-3.5 px-5">Transaction ID</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th
                    className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('amount')}
                  >
                    Amount {renderSortIcon('amount')}
                  </th>
                  <th className="py-3.5 px-4">Payment Rail</th>
                  <th
                    className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('status')}
                  >
                    Status {renderSortIcon('status')}
                  </th>
                  <th className="py-3.5 px-4">Failure Reason</th>
                  <th
                    className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('date')}
                  >
                    Date {renderSortIcon('date')}
                  </th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/60">
                {sortedTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-surface-muted/40 transition-colors group">
                    <td className="py-4 px-5 font-mono">
                      <Link
                        to={`/transactions/${tx.id}`}
                        className="font-semibold text-brand-400 hover:text-brand-300 transition-colors"
                      >
                        TXN-{tx.id.slice(-6).toUpperCase()}
                      </Link>
                    </td>

                    <td className="py-4 px-4">
                      {tx.customer ? (
                        <div>
                          <Link
                            to={`/customers/${tx.customer.id}`}
                            className="font-medium text-white hover:text-brand-400 transition-colors"
                          >
                            {tx.customer.name}
                          </Link>
                          <p className="text-[11px] text-slate-400 font-mono">{tx.customer.email}</p>
                        </div>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    <td className="py-4 px-4 font-mono font-bold text-white">
                      ₹{tx.amount.toLocaleString()}
                    </td>

                    <td className="py-4 px-4 text-slate-300">{tx.paymentMethod}</td>

                    <td className="py-4 px-4">{getStatusBadge(tx)}</td>

                    <td className="py-4 px-4">
                      {tx.failureReason ? (
                        <span className="inline-block text-xs font-semibold text-rose-400">
                          {tx.failureReason.replace(/_/g, ' ')}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">—</span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-xs text-slate-400 whitespace-nowrap">
                      {new Date(tx.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {(tx.status === 'FAILED' || tx.status === 'RECOVERED') && (
                          <Link to={`/recovery/${tx.id}`}>
                            <Button
                              variant="secondary"
                              size="sm"
                              leftIcon={<Zap className="w-3.5 h-3.5 text-brand-400" />}
                            >
                              Recovery
                            </Button>
                          </Link>
                        )}
                        <Link to={`/transactions/${tx.id}`}>
                          <Button variant="ghost" size="sm" rightIcon={<ExternalLink className="w-3.5 h-3.5" />}>
                            View
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="p-4 border-t border-surface-border bg-surface-muted/30 flex items-center justify-between text-xs text-slate-400">
              <span>
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} records
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setSearchParams({ page: (pagination.page - 1).toString() })}
                  leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
                >
                  Previous
                </Button>
                <span className="px-2 font-mono font-medium text-slate-300">
                  {pagination.page} / {pagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => setSearchParams({ page: (pagination.page + 1).toString() })}
                  rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Create Transaction Modal */}
      <CreateTransactionModal
        isOpen={isCreateTxModalOpen}
        onClose={() => setIsCreateTxModalOpen(false)}
        onSuccess={handleTransactionCreated}
        onOpenCreateCustomer={() => setIsCreateCustomerModalOpen(true)}
      />

      {/* Create Customer Modal */}
      <CreateCustomerModal
        isOpen={isCreateCustomerModalOpen}
        onClose={() => setIsCreateCustomerModalOpen(false)}
        onSuccess={() => {
          setIsCreateTxModalOpen(true);
        }}
      />
    </div>
  );
};

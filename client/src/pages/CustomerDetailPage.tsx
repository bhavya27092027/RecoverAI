import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getCustomerByIdApi } from '../api/customer.api';
import {
  Customer,
  CustomerStats,
  AiRecoveryProfile,
  CustomerRecoveryHistoryItem,
  Transaction,
} from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { CreateTransactionModal } from '../components/transactions/CreateTransactionModal';
import { RecommendedActionBadge } from '../components/recovery/RecommendedActionBadge';
import {
  Phone,
  Calendar,
  ArrowLeft,
  PlusCircle,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

export const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [aiProfile, setAiProfile] = useState<AiRecoveryProfile | null>(null);
  const [recoveryHistory, setRecoveryHistory] = useState<CustomerRecoveryHistoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateTxModalOpen, setIsCreateTxModalOpen] = useState(false);

  const fetchCustomerDetails = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      const res = await getCustomerByIdApi(id);
      if (res.success && res.data) {
        setCustomer(res.data.customer);
        setStats(res.data.stats);
        setAiProfile(res.data.aiRecoveryProfile || null);
        setRecoveryHistory(res.data.recoveryHistory || []);
        setTransactions(res.data.transactions);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load customer profile');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerDetails();
  }, [id]);

  const handleTransactionCreated = (newTx: Transaction) => {
    setTransactions((prev) => [newTx, ...prev]);
    // Refresh stats and AI profile
    fetchCustomerDetails();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <Badge variant="success">SUCCESS</Badge>;
      case 'FAILED':
        return <Badge variant="warning">FAILED</Badge>;
      case 'RECOVERED':
        return <Badge variant="brand">RECOVERED</Badge>;
      case 'PROCESSING':
        return <Badge variant="info">PROCESSING</Badge>;
      default:
        return <Badge variant="outline">CREATED</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto py-12 text-center space-y-4">
        <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/30 mx-auto flex items-center justify-center text-brand-400 animate-spin">
          <RefreshCw className="w-5 h-5" />
        </div>
        <p className="text-sm text-slate-400">Loading customer profile and history...</p>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/customers')}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Back to Customers
        </Button>
        <Card className="bg-surface border-surface-border p-8 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">{error || 'Customer not found'}</h2>
          <Button variant="secondary" size="sm" onClick={fetchCustomerDetails}>
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-16">
      {/* Top Breadcrumb & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border/80 pb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/customers')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Customers
          </Button>
          <span className="text-slate-600">/</span>
          <span className="text-base font-bold text-white">{customer.name}</span>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCustomerDetails}
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

      {/* Customer Profile & Statistics Header Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="bg-surface border-surface-border p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-lg font-bold text-white uppercase shadow-md">
              {customer.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{customer.name}</h2>
              <p className="text-xs text-slate-400 font-mono">{customer.email}</p>
            </div>
          </div>

          <div className="space-y-3 pt-2 text-xs border-t border-surface-border/70">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-2">
                <Phone className="w-3.5 h-3.5" /> Phone
              </span>
              <span className="font-mono text-slate-200">{customer.phone || 'Not provided'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" /> Customer Since
              </span>
              <span className="text-slate-300">
                {new Date(customer.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </Card>

        {/* Dynamic Statistics Grid */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="bg-surface/80 border-surface-border p-4 space-y-1">
            <span className="text-[10px] uppercase font-semibold text-slate-400">Total Spent</span>
            <p className="text-2xl font-bold font-mono text-emerald-400">
              ₹{(stats?.totalSpent || 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-400">Successful & Recovered</p>
          </Card>

          <Card className="bg-surface/80 border-surface-border p-4 space-y-1">
            <span className="text-[10px] uppercase font-semibold text-slate-400">Transactions</span>
            <p className="text-2xl font-bold font-mono text-white">
              {stats?.totalTransactions || 0}
            </p>
            <p className="text-[10px] text-slate-400">Total Recorded</p>
          </Card>

          <Card className="bg-surface/80 border-surface-border p-4 space-y-1">
            <span className="text-[10px] uppercase font-semibold text-slate-400">Failed</span>
            <p className="text-2xl font-bold font-mono text-rose-400">
              {stats?.failedPayments || 0}
            </p>
            <p className="text-[10px] text-slate-400">Payment Dropouts</p>
          </Card>

          <Card className="bg-surface/80 border-surface-border p-4 space-y-1">
            <span className="text-[10px] uppercase font-semibold text-slate-400">Recovered</span>
            <p className="text-2xl font-bold font-mono text-brand-400">
              ₹{(stats?.revenueRecovered || 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-400">{stats?.recoveredPayments || 0} Salvaged Payments</p>
          </Card>
        </div>
      </div>

      {/* AI RECOVERY PROFILE SECTION */}
      <Card className="bg-gradient-to-r from-surface via-brand-950/20 to-surface border-brand-500/30 p-6 space-y-5 shadow-fintech-card">
        <div className="flex items-center justify-between border-b border-surface-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">AI Recovery Profile</h3>
              <p className="text-xs text-slate-400">Predictive reliability and open salvage opportunities</p>
            </div>
          </div>
          <Badge variant="brand" size="sm">
            AI Scored
          </Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-xl bg-surface-muted/60 border border-surface-border">
            <span className="text-[10px] uppercase font-bold text-slate-400">Payment Reliability</span>
            <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">
              {aiProfile?.paymentReliability ?? 100}%
            </p>
            <p className="text-[10px] text-slate-400">Settlement consistency</p>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-muted/60 border border-surface-border">
            <span className="text-[10px] uppercase font-bold text-slate-400">Historical Success Rate</span>
            <p className="text-2xl font-bold font-mono text-white mt-1">
              {aiProfile?.historicalSuccessRate ?? 100}%
            </p>
            <p className="text-[10px] text-slate-400">First-attempt clearance</p>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-muted/60 border border-surface-border">
            <span className="text-[10px] uppercase font-bold text-slate-400">Open Opportunities</span>
            <p className="text-2xl font-bold font-mono text-brand-400 mt-1">
              {aiProfile?.openRecoveryOpportunities ?? 0}
            </p>
            <p className="text-[10px] text-slate-400">Analyzed candidates</p>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-muted/60 border border-surface-border">
            <span className="text-[10px] uppercase font-bold text-slate-400">Potential Recovery</span>
            <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">
              ₹{(aiProfile?.potentialRecoverableRevenue || 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-400">Expected salvage amount</p>
          </div>
        </div>
      </Card>

      {/* RECOVERY HISTORY SECTION */}
      {recoveryHistory.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Recovery History</h3>
              <p className="text-xs text-slate-400">Autonomous and approved recovery executions for this customer.</p>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {recoveryHistory.length} recovery event{recoveryHistory.length === 1 ? '' : 's'}
            </span>
          </div>

          <Card className="bg-surface border-surface-border p-0 overflow-hidden shadow-fintech-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-muted/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-5">Transaction</th>
                    <th className="py-3.5 px-4">Original Amount</th>
                    <th className="py-3.5 px-4">Failure Reason</th>
                    <th className="py-3.5 px-4">Action</th>
                    <th className="py-3.5 px-4 text-center">Attempt</th>
                    <th className="py-3.5 px-4">Outcome</th>
                    <th className="py-3.5 px-4 text-right">Recovered Amount</th>
                    <th className="py-3.5 px-5 text-right">Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border/60">
                  {recoveryHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-surface-muted/40 transition-colors">
                      <td className="py-4 px-5 font-mono">
                        <Link
                          to={`/recovery/${item.transactionId}`}
                          className="font-semibold text-brand-400 hover:text-brand-300"
                        >
                          TXN-{item.transactionId.slice(-6).toUpperCase()}
                        </Link>
                      </td>

                      <td className="py-4 px-4 font-mono font-bold text-white">
                        ₹{item.originalAmount.toLocaleString()}
                      </td>

                      <td className="py-4 px-4 text-rose-300">
                        {item.failureReason ? item.failureReason.replace(/_/g, ' ') : '—'}
                      </td>

                      <td className="py-4 px-4">
                        <RecommendedActionBadge action={item.action} size="sm" />
                      </td>

                      <td className="py-4 px-4 text-center font-mono font-bold text-slate-300">
                        #{item.attemptNumber}
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            item.outcome === 'SUCCESS'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : item.outcome === 'FAILED'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {item.outcome}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right font-mono font-bold text-emerald-400">
                        {item.recoveredAmount > 0 ? `₹${item.recoveredAmount.toLocaleString()}` : '—'}
                      </td>

                      <td className="py-4 px-5 text-right">
                        <Link to={`/recovery/${item.transactionId}`}>
                          <Button variant="ghost" size="sm" rightIcon={<ExternalLink className="w-3.5 h-3.5" />}>
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Transaction History Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Transaction History</h3>
            <p className="text-xs text-slate-400">Complete payment attempts recorded for {customer.name}.</p>
          </div>
          <span className="text-xs text-slate-400 font-mono font-medium">
            {transactions.length} record{transactions.length === 1 ? '' : 's'}
          </span>
        </div>

        {transactions.length === 0 ? (
          <Card className="bg-surface border-surface-border p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-surface-muted mx-auto flex items-center justify-center text-slate-400">
              <PlusCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h4 className="text-base font-bold text-white">No transactions recorded yet</h4>
              <p className="text-xs text-slate-400">
                Create a transaction for this customer to begin tracking payment success and recovery.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateTxModalOpen(true)}
              leftIcon={<PlusCircle className="w-4 h-4" />}
            >
              Create First Transaction
            </Button>
          </Card>
        ) : (
          <Card className="bg-surface border-surface-border p-0 overflow-hidden shadow-fintech-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-muted/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-5">Transaction ID</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4">Payment Method</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Failure Reason</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border/60">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-surface-muted/40 transition-colors">
                      <td className="py-4 px-5">
                        <Link
                          to={`/transactions/${tx.id}`}
                          className="font-mono text-xs text-brand-400 hover:text-brand-300 font-semibold"
                        >
                          TXN-{tx.id.slice(-6).toUpperCase()}
                        </Link>
                      </td>

                      <td className="py-4 px-4 font-mono font-bold text-white">
                        ₹{tx.amount.toLocaleString()}
                      </td>

                      <td className="py-4 px-4 text-slate-300">{tx.paymentMethod}</td>

                      <td className="py-4 px-4">{getStatusBadge(tx.status)}</td>

                      <td className="py-4 px-4">
                        {tx.failureReason ? (
                          <span className="text-xs font-medium text-rose-300">
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
                        <Link to={`/transactions/${tx.id}`}>
                          <Button variant="ghost" size="sm" rightIcon={<ExternalLink className="w-3.5 h-3.5" />}>
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Create Transaction Modal with preselected customer */}
      <CreateTransactionModal
        isOpen={isCreateTxModalOpen}
        preselectedCustomerId={customer.id}
        onClose={() => setIsCreateTxModalOpen(false)}
        onSuccess={handleTransactionCreated}
      />
    </div>
  );
};

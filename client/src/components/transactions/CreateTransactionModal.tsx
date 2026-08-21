import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { getCustomersApi } from '../../api/customer.api';
import { createTransactionApi } from '../../api/transaction.api';
import { Customer, PaymentMethod, Transaction } from '../../types';
import {
  CreditCard,
  X,
  PlusCircle,
  AlertCircle,
  QrCode,
  Smartphone,
  Landmark,
  FileText,
  Loader2,
} from 'lucide-react';

interface CreateTransactionModalProps {
  isOpen: boolean;
  preselectedCustomerId?: string;
  onClose: () => void;
  onSuccess: (transaction: Transaction) => void;
  onOpenCreateCustomer?: () => void;
}

export const CreateTransactionModal: React.FC<CreateTransactionModalProps> = ({
  isOpen,
  preselectedCustomerId,
  onClose,
  onSuccess,
  onOpenCreateCustomer,
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);

  const [selectedCustomerId, setSelectedCustomerId] = useState(preselectedCustomerId || '');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [description, setDescription] = useState('');

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (preselectedCustomerId) {
        setSelectedCustomerId(preselectedCustomerId);
      }
      fetchCustomers();
    }
  }, [isOpen, preselectedCustomerId]);

  const fetchCustomers = async () => {
    try {
      setIsLoadingCustomers(true);
      const res = await getCustomersApi({ limit: 100 });
      if (res.success && res.data) {
        setCustomers(res.data);
        if (!selectedCustomerId && res.data.length > 0 && !preselectedCustomerId) {
          setSelectedCustomerId(res.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load customers for transaction:', err);
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  if (!isOpen) return null;

  const paymentMethods: { method: PaymentMethod; label: string; icon: any }[] = [
    { method: 'UPI', label: 'UPI Intent', icon: QrCode },
    { method: 'Credit Card', label: 'Credit Card', icon: CreditCard },
    { method: 'Debit Card', label: 'Debit Card', icon: Smartphone },
    { method: 'Net Banking', label: 'Net Banking', icon: Landmark },
  ];

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    if (!selectedCustomerId) {
      newErrors.customerId = 'Please select a customer';
    }

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      newErrors.amount = 'Please enter a valid positive amount';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) return;

    try {
      setIsSubmitting(true);
      const res = await createTransactionApi({
        customerId: selectedCustomerId,
        amount: parseFloat(amount),
        currency: 'INR',
        paymentMethod,
        description: description.trim() || undefined,
      });

      if (res.success && res.data) {
        setAmount('');
        setDescription('');
        onSuccess(res.data);
        onClose();
      }
    } catch (err: any) {
      setServerError(err.message || 'Failed to create transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <Card className="max-w-lg w-full relative bg-surface border border-surface-border p-6 shadow-fintech-card max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 pb-4 border-b border-surface-border/70">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
            <PlusCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Create New Transaction</h3>
            <p className="text-xs text-slate-400">Record a payment event ready for processing.</p>
          </div>
        </div>

        {serverError && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-5">
          {/* Customer Selection */}
          <div className="space-y-1.5 text-left">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Select Customer *
              </label>
              {onOpenCreateCustomer && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCreateCustomer();
                  }}
                  className="text-xs text-brand-400 hover:text-brand-300 font-medium"
                >
                  + Add New Customer
                </button>
              )}
            </div>

            {isLoadingCustomers ? (
              <div className="p-3 rounded-xl bg-surface-muted border border-surface-border flex items-center gap-2 text-xs text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
                <span>Loading workspace customers...</span>
              </div>
            ) : customers.length === 0 ? (
              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs space-y-2">
                <p className="text-amber-300 font-medium">No customers found in your workspace.</p>
                <p className="text-slate-400">You need to create a customer before recording transactions.</p>
                {onOpenCreateCustomer && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      onClose();
                      onOpenCreateCustomer();
                    }}
                  >
                    Create First Customer
                  </Button>
                )}
              </div>
            ) : (
              <div className="relative">
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="block w-full rounded-xl bg-surface-muted border border-surface-border text-slate-100 text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
                >
                  <option value="" disabled>
                    -- Select Customer --
                  </option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id} className="bg-surface-muted text-white">
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>
            )}
            {errors.customerId && (
              <p className="text-xs font-medium text-rose-400 mt-1">{errors.customerId}</p>
            )}
          </div>

          {/* Amount & Currency */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Input
                label="Amount (INR) *"
                type="number"
                step="0.01"
                min="1"
                placeholder="7500"
                leftIcon={<span className="text-slate-400 font-bold">₹</span>}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                error={errors.amount}
              />
            </div>
            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Currency
              </label>
              <input
                type="text"
                value="INR (₹)"
                disabled
                className="block w-full rounded-xl bg-surface-muted/50 border border-surface-border text-slate-400 text-sm px-3.5 py-2.5 cursor-not-allowed font-mono"
              />
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Payment Rail *
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {paymentMethods.map((m) => {
                const Icon = m.icon;
                const isSelected = paymentMethod === m.method;
                return (
                  <button
                    key={m.method}
                    type="button"
                    onClick={() => setPaymentMethod(m.method)}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-brand-600/15 border-brand-500 text-white shadow-sm ring-1 ring-brand-500'
                        : 'bg-surface-muted/60 border-surface-border text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-brand-400" />
                      <span className="text-xs font-medium">{m.label}</span>
                    </div>
                    <span
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-brand-500 bg-brand-500' : 'border-slate-600'
                      }`}
                    >
                      {isSelected && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <Input
            label="Transaction Description / Memo (Optional)"
            placeholder="e.g. Annual Enterprise SaaS Subscription"
            leftIcon={<FileText className="w-4 h-4" />}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-border">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              disabled={customers.length === 0}
              leftIcon={<PlusCircle className="w-4 h-4" />}
            >
              Create Transaction
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { processPaymentApi } from '../../api/transaction.api';
import { Transaction, FailureReason } from '../../types';
import {
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

interface ProcessPaymentModalProps {
  isOpen: boolean;
  transaction: Transaction;
  onClose: () => void;
  onSuccess: (updatedTransaction: Transaction) => void;
}

export const ProcessPaymentModal: React.FC<ProcessPaymentModalProps> = ({
  isOpen,
  transaction,
  onClose,
  onSuccess,
}) => {
  const [simulationChoice, setSimulationChoice] = useState<'SUCCESS' | 'FAILED'>('SUCCESS');
  const [failureReason, setFailureReason] = useState<FailureReason>('BANK_TIMEOUT');

  // Animation & Processing State
  const [processingState, setProcessingState] = useState<'IDLE' | 'PROCESSING' | 'COMPLETED'>('IDLE');
  const [animationStep, setAnimationStep] = useState(1);
  const [processedTransaction, setProcessedTransaction] = useState<Transaction | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const failureReasons: { reason: FailureReason; label: string; desc: string }[] = [
    { reason: 'BANK_TIMEOUT', label: 'Bank Timeout', desc: 'Issuing bank gateway failed to respond in time' },
    { reason: 'INSUFFICIENT_BALANCE', label: 'Insufficient Balance', desc: 'Customer account had inadequate funds' },
    { reason: 'CARD_DECLINED', label: 'Card Declined', desc: 'Card issuer rejected transaction authorization' },
    { reason: 'AUTHENTICATION_FAILURE', label: 'Authentication Failure', desc: '3D Secure / OTP verification failed or expired' },
    { reason: 'TRANSACTION_LIMIT', label: 'Transaction Limit', desc: 'Exceeded maximum permitted per-transaction limit' },
    { reason: 'CUSTOMER_ABANDONMENT', label: 'Customer Abandonment', desc: 'Customer closed payment window or cancelled' },
  ];

  const handleStartSimulation = async () => {
    setErrorMessage(null);
    setProcessingState('PROCESSING');
    setAnimationStep(1);

    // Step 1: Processing payment...
    setTimeout(() => {
      setAnimationStep(2); // Checking payment provider...
    }, 750);

    // Step 2: Verifying transaction...
    setTimeout(() => {
      setAnimationStep(3);
    }, 1500);

    try {
      const res = await processPaymentApi(transaction.id, {
        simulateStatus: simulationChoice,
        failureReason: simulationChoice === 'FAILED' ? failureReason : undefined,
      });

      setTimeout(() => {
        setProcessedTransaction(res.data);
        setProcessingState('COMPLETED');
      }, 2250);
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment simulation failed to execute');
      setProcessingState('IDLE');
    }
  };

  const handleFinish = () => {
    if (processedTransaction) {
      onSuccess(processedTransaction);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <Card className="max-w-lg w-full relative bg-surface border border-surface-border p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        {processingState !== 'PROCESSING' && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Modal Header */}
        <div className="pb-4 border-b border-surface-border/70 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold tracking-wider text-brand-400 uppercase">
              Simulated Payment Provider
            </span>
            <h3 className="text-lg font-bold text-white mt-0.5">Process Payment</h3>
          </div>
          <Badge variant="outline" size="sm">
            TXN-{transaction.id.slice(-6).toUpperCase()}
          </Badge>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STATE 1: IDLE CONFIGURATION */}
        {processingState === 'IDLE' && (
          <div className="space-y-5 mt-5">
            {/* Transaction Brief */}
            <div className="p-4 rounded-xl bg-surface-muted/60 border border-surface-border flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Total Inbound Amount</p>
                <p className="text-2xl font-bold font-mono text-white mt-0.5">
                  ₹{transaction.amount.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Selected Rail</p>
                <p className="text-xs font-semibold text-slate-200 mt-0.5">{transaction.paymentMethod}</p>
                <p className="text-[11px] text-slate-400">{transaction.customer?.name || 'Customer'}</p>
              </div>
            </div>

            {/* Simulation Option Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Select Simulation Outcome *
              </label>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSimulationChoice('SUCCESS')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    simulationChoice === 'SUCCESS'
                      ? 'bg-emerald-950/30 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500 shadow-glow-accent'
                      : 'bg-surface-muted/60 border-surface-border text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        simulationChoice === 'SUCCESS' ? 'border-emerald-400 bg-emerald-500' : 'border-slate-600'
                      }`}
                    >
                      {simulationChoice === 'SUCCESS' && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-white">Simulate Success</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Transitions status to SUCCESS (₹ credited)</p>
                </button>

                <button
                  type="button"
                  onClick={() => setSimulationChoice('FAILED')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    simulationChoice === 'FAILED'
                      ? 'bg-rose-950/30 border-rose-500 text-rose-300 ring-1 ring-rose-500'
                      : 'bg-surface-muted/60 border-surface-border text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <XCircle className="w-5 h-5 text-rose-400" />
                    <span
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        simulationChoice === 'FAILED' ? 'border-rose-400 bg-rose-500' : 'border-slate-600'
                      }`}
                    >
                      {simulationChoice === 'FAILED' && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-white">Simulate Failed</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Triggers revenue risk with failure reason</p>
                </button>
              </div>
            </div>

            {/* Failure Reason Selector if FAILED */}
            {simulationChoice === 'FAILED' && (
              <div className="space-y-2 animate-fade-in">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Select Specific Failure Reason *
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {failureReasons.map((item) => {
                    const isSelected = failureReason === item.reason;
                    return (
                      <button
                        key={item.reason}
                        type="button"
                        onClick={() => setFailureReason(item.reason)}
                        className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-rose-950/40 border-rose-500 text-white ring-1 ring-rose-500'
                            : 'bg-surface-muted/40 border-surface-border text-slate-300 hover:bg-surface-muted'
                        }`}
                      >
                        <div>
                          <p className="text-xs font-semibold text-slate-200">{item.label}</p>
                          <p className="text-[10px] text-slate-400">{item.desc}</p>
                        </div>
                        <span
                          className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                            isSelected ? 'border-rose-500 bg-rose-500' : 'border-slate-600'
                          }`}
                        >
                          {isSelected && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-border">
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="button"
                variant={simulationChoice === 'SUCCESS' ? 'accent' : 'danger'}
                size="md"
                onClick={handleStartSimulation}
                leftIcon={<Play className="w-4 h-4 fill-current" />}
              >
                Execute {simulationChoice === 'SUCCESS' ? 'Successful' : 'Failed'} Simulation
              </Button>
            </div>
          </div>
        )}

        {/* STATE 2: PROCESSING ANIMATION */}
        {processingState === 'PROCESSING' && (
          <div className="py-12 px-4 text-center space-y-8 animate-fade-in">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-brand-500/20 animate-ping"></div>
              <div className="w-20 h-20 rounded-full bg-brand-500/10 border-2 border-brand-500 flex items-center justify-center text-brand-400">
                <RefreshCw className="w-8 h-8 animate-spin" />
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xl font-bold text-white">Executing Payment Gateway Rail</h4>
              <p className="text-xs text-slate-400">Simulating real-time interchange routing and authorization</p>
            </div>

            {/* Stepper text */}
            <div className="max-w-xs mx-auto space-y-3 text-left">
              <div
                className={`flex items-center gap-3 text-xs transition-opacity duration-300 ${
                  animationStep >= 1 ? 'text-white opacity-100' : 'text-slate-600 opacity-40'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                    animationStep > 1 ? 'bg-emerald-500 text-white' : 'bg-brand-500 text-white animate-pulse'
                  }`}
                >
                  {animationStep > 1 ? '✓' : '1'}
                </div>
                <span>Processing payment...</span>
              </div>

              <div
                className={`flex items-center gap-3 text-xs transition-opacity duration-300 ${
                  animationStep >= 2 ? 'text-white opacity-100' : 'text-slate-600 opacity-40'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                    animationStep > 2
                      ? 'bg-emerald-500 text-white'
                      : animationStep === 2
                      ? 'bg-brand-500 text-white animate-pulse'
                      : 'bg-surface-border text-slate-500'
                  }`}
                >
                  {animationStep > 2 ? '✓' : '2'}
                </div>
                <span>Checking payment provider...</span>
              </div>

              <div
                className={`flex items-center gap-3 text-xs transition-opacity duration-300 ${
                  animationStep >= 3 ? 'text-white opacity-100' : 'text-slate-600 opacity-40'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                    animationStep === 3 ? 'bg-brand-500 text-white animate-pulse' : 'bg-surface-border text-slate-500'
                  }`}
                >
                  3
                </div>
                <span>Verifying transaction response...</span>
              </div>
            </div>
          </div>
        )}

        {/* STATE 3: COMPLETED RESULT */}
        {processingState === 'COMPLETED' && processedTransaction && (
          <div className="py-8 px-2 text-center space-y-6 animate-fade-in">
            {processedTransaction.status === 'SUCCESS' ? (
              <>
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 mx-auto flex items-center justify-center text-emerald-400 shadow-glow-accent">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-2xl font-bold text-emerald-400">✓ Payment Successful</h4>
                  <p className="text-3xl font-extrabold font-mono text-white pt-1">
                    ₹{processedTransaction.amount.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-400 pt-1">
                    Transaction ID: <span className="font-mono text-slate-300">TXN-{processedTransaction.id.slice(-6).toUpperCase()}</span>
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs text-emerald-300">
                  Funds cleared via {processedTransaction.paymentMethod}. Dashboard metrics have been dynamically updated.
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 mx-auto flex items-center justify-center text-rose-400">
                  <XCircle className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-2xl font-bold text-rose-400">✕ Payment Failed</h4>
                  <p className="text-3xl font-extrabold font-mono text-white pt-1">
                    ₹{processedTransaction.amount.toLocaleString()}
                  </p>
                  <div className="pt-2">
                    <Badge variant="warning" size="md">
                      Reason: {processedTransaction.failureReason?.replace(/_/g, ' ') || 'Bank Timeout'}
                    </Badge>
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 text-xs text-rose-300 space-y-1 text-left">
                  <p className="font-semibold">Revenue At Risk Recorded in Workspace</p>
                  <p className="text-slate-400">
                    This failed transaction is now logged. In Phase 3, the AI Recovery Engine will analyze and dispatch smart retries for this failure.
                  </p>
                </div>
              </>
            )}

            <div className="pt-4 border-t border-surface-border flex justify-end">
              <Button variant="primary" size="md" onClick={handleFinish} rightIcon={<ArrowRight className="w-4 h-4" />}>
                Done & View Transaction
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getTransactionByIdApi } from '../api/transaction.api';
import {
  analyzeTransactionApi,
  getTransactionRecoveryAnalysisApi,
} from '../api/recovery.api';
import { Transaction, RecoveryAnalysis } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ProcessPaymentModal } from '../components/transactions/ProcessPaymentModal';
import { RazorpayCheckoutModal } from '../components/payments/RazorpayCheckoutModal';
import { RecoveryScoreBadge } from '../components/recovery/RecoveryScoreBadge';
import { RecommendedActionBadge } from '../components/recovery/RecommendedActionBadge';
import { DecisionFactorsCard } from '../components/recovery/DecisionFactorsCard';
import {
  ArrowLeft,
  User,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Play,
  RefreshCw,
  Clock,
  ExternalLink,
  FileText,
  Sparkles,
  BrainCircuit,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';

export const TransactionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [analysis, setAnalysis] = useState<RecoveryAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [isRazorpayModalOpen, setIsRazorpayModalOpen] = useState(false);

  // AI Analysis Execution Animation State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(1);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const fetchTransactionAndAnalysis = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      const [txRes, analysisRes] = await Promise.all([
        getTransactionByIdApi(id),
        getTransactionRecoveryAnalysisApi(id).catch(() => ({ success: true, data: null })),
      ]);

      if (txRes.success && txRes.data) {
        setTransaction(txRes.data);
      }
      if (analysisRes.success && analysisRes.data) {
        setAnalysis(analysisRes.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load transaction details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactionAndAnalysis();
  }, [id]);

  const handlePaymentProcessed = (updatedTx: Transaction) => {
    setTransaction(updatedTx);
    if (updatedTx.status === 'FAILED') {
      // Auto fetch or clear analysis
      setAnalysis(null);
    }
  };

  const handleRunAiAnalysis = async () => {
    if (!transaction) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisStep(1);

    // Step 1: Analyzing payment...
    const t1 = setTimeout(() => setAnalysisStep(2), 600);
    // Step 2: Checking customer history...
    const t2 = setTimeout(() => setAnalysisStep(3), 1200);
    // Step 3: Analyzing failure pattern...
    const t3 = setTimeout(() => setAnalysisStep(4), 1800);
    // Step 4: Calculating recovery probability...
    const t4 = setTimeout(() => setAnalysisStep(5), 2400);

    try {
      const res = await analyzeTransactionApi(transaction.id);
      setTimeout(() => {
        setAnalysis(res.data);
        setIsAnalyzing(false);
      }, 3000);
    } catch (err: any) {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      setAnalysisError(err.message || 'AI Analysis failed to execute');
      setIsAnalyzing(false);
    }
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
        <p className="text-sm text-slate-400">Loading transaction record...</p>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/transactions')}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Back to Transactions
        </Button>
        <Card className="bg-surface border-surface-border p-8 text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">{error || 'Transaction not found'}</h2>
          <Button variant="secondary" size="sm" onClick={fetchTransactionAndAnalysis}>
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-16">
      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border/80 pb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/transactions')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Transactions
          </Button>
          <span className="text-slate-600">/</span>
          <span className="font-mono text-base font-bold text-white">
            TXN-{transaction.id.slice(-6).toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTransactionAndAnalysis}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>

          {transaction.status === 'CREATED' && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                onClick={() => setIsRazorpayModalOpen(true)}
                leftIcon={<CreditCard className="w-4 h-4" />}
              >
                Pay (Razorpay Test)
              </Button>
              <Button
                variant="accent"
                size="sm"
                onClick={() => setIsProcessModalOpen(true)}
                leftIcon={<Play className="w-4 h-4 fill-current" />}
                className="shadow-glow-accent"
              >
                Simulate Payment
              </Button>
            </div>
          )}

          {transaction.status === 'FAILED' && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                onClick={() => setIsRazorpayModalOpen(true)}
                leftIcon={<CreditCard className="w-4 h-4" />}
              >
                Pay (Razorpay Test)
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsProcessModalOpen(true)}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Re-simulate Payment
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Status & Amount Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-surface via-surface-muted to-surface border border-surface-border p-8 shadow-fintech-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Transaction Status
              </span>
              {getStatusBadge(transaction.status)}
              <Badge variant={transaction.provider === 'RAZORPAY' ? 'warning' : 'default'}>
                {transaction.provider === 'RAZORPAY' ? 'RAZORPAY TEST' : 'DEMO PROVIDER'}
              </Badge>
            </div>
            <p className="text-4xl font-extrabold font-mono text-white">
              ₹{transaction.amount.toLocaleString()}{' '}
              <span className="text-sm font-normal text-slate-400 font-sans">{transaction.currency}</span>
            </p>
            <p className="text-xs text-slate-400">
              Payment Rail: <span className="text-slate-200 font-semibold">{transaction.paymentMethod}</span>
            </p>
          </div>

          <div className="text-right text-xs space-y-1 text-slate-400">
            <p>
              Created:{' '}
              <span className="text-slate-200">
                {new Date(transaction.createdAt).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </p>
            <p>
              Record ID: <span className="font-mono text-slate-300">{transaction.id}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Visual Status Timeline / Stepper */}
      <Card className="bg-surface border-surface-border p-6 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider text-slate-300">
          Payment Processing Lifecycle
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* Step 1: Created */}
          <div className="p-4 rounded-xl bg-surface-muted/60 border border-surface-border flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">1. Transaction Created</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Payload ingested in workspace</p>
            </div>
          </div>

          {/* Step 2: Processing */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              transaction.status !== 'CREATED'
                ? 'bg-surface-muted/60 border-surface-border text-white'
                : 'bg-surface-muted/20 border-surface-border/50 text-slate-500'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                transaction.status !== 'CREATED'
                  ? 'bg-brand-500/10 border border-brand-500/30 text-brand-400'
                  : 'bg-surface-border text-slate-600'
              }`}
            >
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold">2. Payment Routing</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Dispatched to payment rail</p>
            </div>
          </div>

          {/* Step 3: Outcome */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              transaction.status === 'SUCCESS' || transaction.status === 'RECOVERED'
                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                : transaction.status === 'FAILED'
                ? 'bg-rose-950/20 border-rose-500/40 text-rose-300'
                : 'bg-surface-muted/20 border-surface-border/50 text-slate-500'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                transaction.status === 'SUCCESS' || transaction.status === 'RECOVERED'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : transaction.status === 'FAILED'
                  ? 'bg-rose-500/20 text-rose-400'
                  : 'bg-surface-border text-slate-600'
              }`}
            >
              {transaction.status === 'SUCCESS' || transaction.status === 'RECOVERED' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : transaction.status === 'FAILED' ? (
                <XCircle className="w-4 h-4" />
              ) : (
                <Clock className="w-4 h-4" />
              )}
            </div>
            <div>
              <p className="text-xs font-bold">
                3. {transaction.status === 'SUCCESS' ? 'Payment Succeeded' : transaction.status === 'FAILED' ? 'Payment Failed' : 'Outcome Pending'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {transaction.status === 'SUCCESS'
                  ? 'Settlement completed'
                  : transaction.status === 'FAILED'
                  ? transaction.failureReason?.replace(/_/g, ' ')
                  : 'Awaiting process payment action'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* PHASE 3: AI RECOVERY INTELLIGENCE ENGINE SECTION */}
      {transaction.status === 'FAILED' && (
        <div className="space-y-6 animate-fade-in">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-brand-950/40 via-surface to-brand-950/30 border border-brand-500/40 shadow-glow-brand">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-brand-500/20 border border-brand-500/40 flex items-center justify-center text-brand-400 shadow-md">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand-400">
                  AI Recovery Intelligence Engine
                </span>
                <h3 className="text-xl font-bold text-white">RecoverAI Analysis</h3>
              </div>
            </div>

            <div>
              {!isAnalyzing && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleRunAiAnalysis}
                  leftIcon={<Sparkles className="w-4 h-4" />}
                  className="shadow-glow-brand"
                >
                  {analysis ? 'Re-analyze with RecoverAI' : 'Analyze with RecoverAI'}
                </Button>
              )}
            </div>
          </div>

          {analysisError && (
            <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{analysisError}</span>
            </div>
          )}

          {/* ANIMATED LOADING SEQUENCE */}
          {isAnalyzing && (
            <Card className="bg-surface border-brand-500/40 p-8 text-center space-y-6 shadow-2xl animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-brand-500/10 border-2 border-brand-500 flex items-center justify-center text-brand-400 mx-auto shadow-glow-brand">
                <BrainCircuit className="w-8 h-8 animate-pulse" />
              </div>

              <div className="space-y-1">
                <h4 className="text-lg font-bold text-white">Running AI Recovery Intelligence Engine</h4>
                <p className="text-xs text-slate-400">
                  Evaluating historical transaction patterns and failure elasticity
                </p>
              </div>

              {/* 5-Step Sequence */}
              <div className="max-w-md mx-auto space-y-2.5 text-left text-xs">
                <div
                  className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                    analysisStep >= 1 ? 'text-white bg-surface-muted/60' : 'text-slate-600 opacity-40'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                      analysisStep > 1 ? 'bg-emerald-500 text-white' : 'bg-brand-500 text-white animate-spin'
                    }`}
                  >
                    {analysisStep > 1 ? '✓' : '1'}
                  </div>
                  <span>Analyzing payment payload & rail metadata...</span>
                </div>

                <div
                  className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                    analysisStep >= 2 ? 'text-white bg-surface-muted/60' : 'text-slate-600 opacity-40'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                      analysisStep > 2
                        ? 'bg-emerald-500 text-white'
                        : analysisStep === 2
                        ? 'bg-brand-500 text-white animate-spin'
                        : 'bg-surface-border text-slate-600'
                    }`}
                  >
                    {analysisStep > 2 ? '✓' : '2'}
                  </div>
                  <span>Checking customer historical settlement rate...</span>
                </div>

                <div
                  className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                    analysisStep >= 3 ? 'text-white bg-surface-muted/60' : 'text-slate-600 opacity-40'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                      analysisStep > 3
                        ? 'bg-emerald-500 text-white'
                        : analysisStep === 3
                        ? 'bg-brand-500 text-white animate-spin'
                        : 'bg-surface-border text-slate-600'
                    }`}
                  >
                    {analysisStep > 3 ? '✓' : '3'}
                  </div>
                  <span>Analyzing interchange failure pattern & elasticity...</span>
                </div>

                <div
                  className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                    analysisStep >= 4 ? 'text-white bg-surface-muted/60' : 'text-slate-600 opacity-40'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                      analysisStep > 4
                        ? 'bg-emerald-500 text-white'
                        : analysisStep === 4
                        ? 'bg-brand-500 text-white animate-spin'
                        : 'bg-surface-border text-slate-600'
                    }`}
                  >
                    {analysisStep > 4 ? '✓' : '4'}
                  </div>
                  <span>Calculating deterministic recovery probability score...</span>
                </div>

                <div
                  className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                    analysisStep >= 5 ? 'text-white bg-surface-muted/60' : 'text-slate-600 opacity-40'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                      analysisStep === 5 ? 'bg-brand-500 text-white animate-spin' : 'bg-surface-border text-slate-600'
                    }`}
                  >
                    5
                  </div>
                  <span>Selecting optimal recovery action & generating reasoning...</span>
                </div>
              </div>
            </Card>
          )}

          {/* COMPLETED ANALYSIS OUTCOME CARDS */}
          {!isAnalyzing && analysis && (
            <div className="space-y-6 animate-fade-in">
              {/* Top 4 Metrics Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* 1. Recovery Score Visualizer */}
                <Card className="bg-surface border-surface-border p-6 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 mb-2">
                    Recovery Probability
                  </span>
                  <RecoveryScoreBadge score={analysis.recoveryProbability} size="lg" showLabel={true} />
                </Card>

                {/* 2. Confidence Level */}
                <Card className="bg-surface border-surface-border p-6 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Model Confidence
                    </span>
                    <div className="mt-3">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          analysis.confidence === 'HIGH'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : analysis.confidence === 'MEDIUM'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {analysis.confidence} CONFIDENCE
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    {analysis.confidence === 'HIGH'
                      ? 'Backed by established customer & merchant transaction history'
                      : analysis.confidence === 'MEDIUM'
                      ? 'Supported by moderate transaction volume'
                      : 'Limited historical data (weighted on failure category)'}
                  </p>
                </Card>

                {/* 3. Recommended Action */}
                <Card className="bg-surface border-surface-border p-6 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Recommended Action
                    </span>
                    <div className="mt-3">
                      <RecommendedActionBadge action={analysis.recommendedAction} size="md" />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    Autonomous dispatch ready for Phase 4 execution
                  </p>
                </Card>

                {/* 4. Expected Recovery */}
                <Card className="bg-surface border-surface-border p-6 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Expected Recovery
                    </span>
                    <p className="text-3xl font-extrabold font-mono text-emerald-400 mt-2">
                      ₹{analysis.expectedRecoveryAmount.toLocaleString()}
                    </p>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    {analysis.recoveryProbability}% of ₹{transaction.amount.toLocaleString()} target
                  </p>
                </Card>
              </div>

              {/* Reasoning Card */}
              <Card className="bg-gradient-to-br from-surface to-brand-950/20 border-surface-border p-6 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-400" />
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                    Why RecoverAI Recommends This
                  </h4>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed font-normal">
                  {analysis.reasoning}
                </p>
              </Card>

              {/* Transparent Decision Factors Breakdown */}
              <DecisionFactorsCard
                factors={analysis.factors}
                failureReason={transaction.failureReason}
                paymentMethod={transaction.paymentMethod}
                amount={transaction.amount}
              />
            </div>
          )}

          {/* Prompt if not yet analyzed */}
          {!isAnalyzing && !analysis && (
            <Card className="bg-surface border-surface-border p-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400 mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h4 className="text-base font-bold text-white">
                  Payment Failure Awaiting AI Analysis
                </h4>
                <p className="text-xs text-slate-400">
                  Click "Analyze with RecoverAI" above to evaluate recovery probability, calculate expected revenue, and determine the optimal recovery strategy.
                </p>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Failure Information Card if FAILED (Basic Audit) */}
      {transaction.status === 'FAILED' && (
        <Card className="bg-surface border-surface-border p-6 space-y-4 border-l-4 border-l-rose-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Payment Failure Audit</h3>
              <p className="text-xs text-slate-400">Interchange response classification</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-3.5 rounded-xl bg-surface-muted/60 border border-surface-border">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Failure Reason</span>
              <p className="text-sm font-bold text-rose-400 mt-1">
                {transaction.failureReason?.replace(/_/g, ' ') || 'Unknown Error'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-muted/60 border border-surface-border">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Failure Category</span>
              <p className="text-sm font-bold text-slate-200 mt-1">
                {transaction.failureReason === 'INSUFFICIENT_BALANCE'
                  ? 'Soft Failure (Retry Candidate)'
                  : transaction.failureReason === 'BANK_TIMEOUT'
                  ? 'Gateway Dropout (Auto Failover)'
                  : 'Authorization Block'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-muted/60 border border-surface-border">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Recovery Status</span>
              <p className="text-sm font-bold text-brand-400 mt-1">
                {analysis ? 'Analyzed (AI Ready)' : 'Pending Analysis'}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Transaction Details & Customer Link Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Information Card */}
        <Card className="bg-surface border-surface-border p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-surface-border/70">
            <div className="flex items-center gap-2.5">
              <User className="w-4 h-4 text-brand-400" />
              <h3 className="text-sm font-bold text-white">Customer Information</h3>
            </div>
            {transaction.customer && (
              <Link to={`/customers/${transaction.customer.id}`}>
                <Button variant="ghost" size="sm" rightIcon={<ExternalLink className="w-3 h-3" />}>
                  View Profile
                </Button>
              </Link>
            )}
          </div>

          {transaction.customer ? (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Full Name</span>
                <span className="font-semibold text-white">{transaction.customer.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Email</span>
                <span className="font-mono text-slate-200">{transaction.customer.email}</span>
              </div>
              {transaction.customer.phone && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Phone</span>
                  <span className="font-mono text-slate-200">{transaction.customer.phone}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-400">No customer details attached.</p>
          )}
        </Card>

        {/* Transaction Memo / Description Card */}
        <Card className="bg-surface border-surface-border p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-surface-border/70">
            <FileText className="w-4 h-4 text-brand-400" />
            <h3 className="text-sm font-bold text-white">Description & Metadata</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Description / Memo</span>
              <span className="font-medium text-slate-200">{transaction.description || 'None provided'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Database Multi-Tenancy</span>
              <span className="font-semibold text-emerald-400">Merchant Scoped</span>
            </div>
          </div>
        </Card>

        {/* Razorpay Gateway Details Card */}
        <Card className="bg-surface border-surface-border p-6 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between pb-3 border-b border-surface-border/70">
            <div className="flex items-center gap-2.5">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Payment Gateway Details</h3>
            </div>
            <Badge variant={transaction.provider === 'RAZORPAY' ? 'warning' : 'default'}>
              {transaction.provider === 'RAZORPAY' ? 'RAZORPAY TEST MODE' : 'DEMO PROVIDER'}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-surface-muted/40 rounded-xl border border-surface-border space-y-1">
              <span className="text-slate-400 text-[11px] block">Payment Provider</span>
              <span className="font-semibold text-white font-mono">
                {transaction.provider || 'DEMO'}
              </span>
            </div>

            <div className="p-3 bg-surface-muted/40 rounded-xl border border-surface-border space-y-1">
              <span className="text-slate-400 text-[11px] block">Razorpay Order ID</span>
              <span className="font-semibold text-brand-400 font-mono">
                {transaction.razorpayOrderId || '—'}
              </span>
            </div>

            <div className="p-3 bg-surface-muted/40 rounded-xl border border-surface-border space-y-1">
              <span className="text-slate-400 text-[11px] block">Razorpay Payment ID</span>
              <span className="font-semibold text-emerald-400 font-mono">
                {transaction.razorpayPaymentId || '—'}
              </span>
            </div>

            <div className="p-3 bg-surface-muted/40 rounded-xl border border-surface-border space-y-1">
              <span className="text-slate-400 text-[11px] block">Verification Status</span>
              <span className="font-semibold text-slate-200">
                {transaction.paymentVerifiedAt ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 inline" /> Verified
                  </span>
                ) : (
                  'Unverified'
                )}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Payment Processing Simulation Modal */}
      <ProcessPaymentModal
        isOpen={isProcessModalOpen}
        transaction={transaction}
        onClose={() => setIsProcessModalOpen(false)}
        onSuccess={handlePaymentProcessed}
      />

      {/* Razorpay Test Checkout Modal */}
      <RazorpayCheckoutModal
        isOpen={isRazorpayModalOpen}
        transaction={transaction}
        onClose={() => setIsRazorpayModalOpen(false)}
        onSuccess={(updatedTx) => {
          setTransaction(updatedTx);
          fetchTransactionAndAnalysis();
        }}
      />
    </div>
  );
};

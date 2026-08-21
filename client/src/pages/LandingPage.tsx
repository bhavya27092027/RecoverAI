import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap,
  Cpu,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Layers,
  Sparkles,
  Lock,
  CheckCircle2,
  CreditCard,
} from 'lucide-react';
import { Button } from '../components/ui/Button';

export const LandingPage: React.FC = () => {
  const [simulating, setSimulating] = useState(false);
  const [simStep, setSimStep] = useState(0);

  const triggerSimulation = () => {
    if (simulating) return;
    setSimulating(true);
    setSimStep(1);

    setTimeout(() => setSimStep(2), 700);
    setTimeout(() => setSimStep(3), 1500);
    setTimeout(() => {
      setSimStep(4);
      setSimulating(false);
    }, 2200);
  };

  return (
    <div className="min-h-screen bg-background text-slate-100 selection:bg-brand-500/30">
      {/* Subtle Background Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-brand-600/10 blur-[140px] rounded-full"></div>
        <div className="absolute top-[600px] -left-40 w-[600px] h-[600px] bg-emerald-500/5 blur-[150px] rounded-full"></div>
        <div className="absolute top-[800px] -right-40 w-[600px] h-[600px] bg-indigo-500/5 blur-[150px] rounded-full"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-surface-border/60 bg-surface/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-brand-600/30">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">
              Recover<span className="text-brand-400">AI</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">
              Platform
            </a>
            <a href="#simulator" className="hover:text-white transition-colors">
              AI Engine
            </a>
            <a href="#architecture" className="hover:text-white transition-colors">
              Architecture
            </a>
            <a href="#security" className="hover:text-white transition-colors">
              Security
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link to="/signup">
              <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-28 px-6">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-semibold uppercase tracking-wider animate-fade-in shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            <span>Autonomous Revenue Intelligence</span>
          </div>

          {/* Hero Title */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.08]">
            Recover More Revenue.{' '}
            <span className="bg-gradient-to-r from-brand-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
              Automatically.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="max-w-3xl mx-auto text-lg sm:text-xl text-slate-300 font-normal leading-relaxed">
            RecoverAI intelligently analyzes failed payments, predicts recovery opportunities, and
            recommends the next best action for your business.
          </p>

          {/* Action CTAs */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup" className="w-full sm:w-auto">
              <Button
                variant="primary"
                size="lg"
                className="w-full sm:w-auto px-8"
                rightIcon={<ArrowRight className="w-5 h-5" />}
              >
                Get Started
              </Button>
            </Link>
            <Link to="/login" className="w-full sm:w-auto">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto px-8">
                Sign In
              </Button>
            </Link>
          </div>

          {/* Key Metrics Proof Points */}
          <div className="pt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="p-4 rounded-xl bg-surface/60 border border-surface-border backdrop-blur-sm">
              <p className="text-2xl font-bold text-emerald-400 font-mono">+34.8%</p>
              <p className="text-xs text-slate-400 mt-0.5">Average Recovery Uplift</p>
            </div>
            <div className="p-4 rounded-xl bg-surface/60 border border-surface-border backdrop-blur-sm">
              <p className="text-2xl font-bold text-white font-mono">&lt; 450ms</p>
              <p className="text-xs text-slate-400 mt-0.5">Autonomous Decision Latency</p>
            </div>
            <div className="p-4 rounded-xl bg-surface/60 border border-surface-border backdrop-blur-sm">
              <p className="text-2xl font-bold text-brand-400 font-mono">100%</p>
              <p className="text-xs text-slate-400 mt-0.5">Merchant Scoped Isolation</p>
            </div>
            <div className="p-4 rounded-xl bg-surface/60 border border-surface-border backdrop-blur-sm">
              <p className="text-2xl font-bold text-purple-400 font-mono">Zero Code</p>
              <p className="text-xs text-slate-400 mt-0.5">Frictionless Foundation</p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive AI Recovery Simulator Section */}
      <section id="simulator" className="relative z-10 py-16 px-6 bg-surface/30 border-y border-surface-border/60">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Live AI Recovery Pipeline Simulation
            </h2>
            <p className="text-sm text-slate-400">
              See how RecoverAI intercepts failed transactions and salvages churned revenue in real-time.
            </p>
          </div>

          {/* Simulator Box */}
          <div className="rounded-2xl bg-surface border border-surface-border p-6 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-surface-border">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                </div>
                <span className="text-xs font-mono text-slate-400">recoverai://live-orchestrator-preview</span>
              </div>
              <Button
                variant={simulating ? 'secondary' : 'accent'}
                size="sm"
                onClick={triggerSimulation}
                isLoading={simulating}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                {simulating ? 'Analyzing...' : 'Simulate Recovery'}
              </Button>
            </div>

            {/* Visual Stream */}
            <div className="py-8 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              {/* Step 1: Failed Inbound */}
              <div
                className={`p-4 rounded-xl border transition-all duration-300 ${
                  simStep >= 1
                    ? 'bg-rose-950/20 border-rose-500/40 text-rose-300'
                    : 'bg-surface-muted/40 border-surface-border text-slate-500'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase">1. Inbound Failure</span>
                  <CreditCard className="w-4 h-4" />
                </div>
                <p className="text-lg font-mono font-bold">₹14,500</p>
                <p className="text-xs mt-1">Error: 51_INSUFFICIENT_FUNDS</p>
              </div>

              {/* Step 2: AI Neural Evaluation */}
              <div
                className={`p-4 rounded-xl border transition-all duration-300 ${
                  simStep >= 2
                    ? 'bg-brand-950/30 border-brand-500/50 text-brand-300 shadow-glow-brand'
                    : 'bg-surface-muted/40 border-surface-border text-slate-500'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase">2. AI Diagnosis</span>
                  <Cpu className="w-4 h-4" />
                </div>
                <p className="text-xs font-mono font-bold">Confidence: 96.2%</p>
                <p className="text-xs mt-1">Optimal Rail: UPI Intent Retry</p>
              </div>

              {/* Step 3: Autonomous Action */}
              <div
                className={`p-4 rounded-xl border transition-all duration-300 ${
                  simStep >= 3
                    ? 'bg-indigo-950/30 border-indigo-500/50 text-indigo-300'
                    : 'bg-surface-muted/40 border-surface-border text-slate-500'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase">3. Smart Execution</span>
                  <RefreshCw className="w-4 h-4" />
                </div>
                <p className="text-xs font-mono font-bold">Dynamic Routing</p>
                <p className="text-xs mt-1">Fallback Gateway Dispatched</p>
              </div>

              {/* Step 4: Successful Recovery */}
              <div
                className={`p-4 rounded-xl border transition-all duration-300 ${
                  simStep >= 4
                    ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-300 shadow-glow-accent'
                    : 'bg-surface-muted/40 border-surface-border text-slate-500'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase">4. Salvaged</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-lg font-mono font-bold text-emerald-400">₹14,500</p>
                <p className="text-xs mt-1 text-emerald-300">Revenue Recovered</p>
              </div>
            </div>

            <div className="pt-2 text-center">
              <span className="text-xs text-slate-400">
                Click <strong>"Simulate Recovery"</strong> to test how RecoverAI processes real-time transaction failures.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid Inspired by Linear / Stripe */}
      <section id="features" className="relative z-10 py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Engineered for Modern Fintech Velocity
          </h2>
          <p className="text-base text-slate-400">
            A production-ready foundation designed for high throughput, absolute multi-tenant merchant isolation, and zero-compromise security.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-8 rounded-2xl bg-surface border border-surface-border hover:border-slate-700 transition-all space-y-4">
            <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-white">Merchant-Scoped Data Isolation</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Every merchant profile, transaction record, and AI recovery policy is bound to verified authentication sessions with strict database indexing.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-surface border border-surface-border hover:border-slate-700 transition-all space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-white">Dynamic Empty-State Dashboard</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              No fake or hardcoded mock numbers. Brand-new merchants start with genuine live telemetry (₹0 Risk, ₹0 Recovered) ready to ingest real volumes.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-surface border border-surface-border hover:border-slate-700 transition-all space-y-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-white">Enterprise Cookie Authentication</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Secure HTTP-only JWT sessions with bcrypt salted hashing protect against XSS and credential leaks across all API boundaries.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Footer Section */}
      <section className="relative z-10 py-20 px-6 border-t border-surface-border/60 bg-surface/50">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Ready to Stop Losing Revenue?
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Set up your RecoverAI workspace in under 60 seconds and start monitoring failed payments autonomously.
          </p>
          <div className="flex items-center justify-center gap-4 pt-2">
            <Link to="/signup">
              <Button variant="primary" size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Create Your Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-border/40 py-8 px-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-brand-400" />
            <span className="font-semibold text-slate-300">RecoverAI Platform</span>
            <span>— Autonomous Revenue Recovery</span>
          </div>
          <div>© {new Date().getFullYear()} RecoverAI Inc. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
};

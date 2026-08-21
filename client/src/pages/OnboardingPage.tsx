import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { completeOnboardingApi } from '../api/merchant.api';
import { BusinessType, MonthlyPaymentVolume, PaymentMethod } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  Zap,
  Building,
  Briefcase,
  TrendingUp,
  CreditCard,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  ShoppingBag,
  Cloud,
  Repeat,
  Store,
  GraduationCap,
  Wrench,
  HelpCircle,
  QrCode,
  Smartphone,
  Landmark,
} from 'lucide-react';

export const OnboardingPage: React.FC = () => {
  const { user, merchant, updateMerchant } = useAuth();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [businessName, setBusinessName] = useState(merchant?.businessName || '');
  const [businessType, setBusinessType] = useState<BusinessType>(merchant?.businessType || 'SaaS');
  const [monthlyPaymentVolume, setMonthlyPaymentVolume] = useState<MonthlyPaymentVolume>(
    merchant?.monthlyPaymentVolume || '< ₹1L'
  );
  const [preferredPaymentMethods, setPreferredPaymentMethods] = useState<PaymentMethod[]>(
    merchant?.preferredPaymentMethods?.length
      ? merchant.preferredPaymentMethods
      : ['UPI', 'Credit Card']
  );

  const businessTypes: { type: BusinessType; title: string; desc: string; icon: any }[] = [
    { type: 'SaaS', title: 'SaaS', desc: 'B2B & B2C cloud software subscriptions', icon: Cloud },
    { type: 'Subscription', title: 'Subscription', desc: 'Recurring memberships, boxes & media', icon: Repeat },
    { type: 'E-commerce', title: 'E-commerce', desc: 'Direct-to-consumer online storefronts', icon: ShoppingBag },
    { type: 'Marketplace', title: 'Marketplace', desc: 'Multi-vendor buyer & seller platforms', icon: Store },
    { type: 'Education', title: 'Education', desc: 'EdTech courses, coaching & schools', icon: GraduationCap },
    { type: 'Services', title: 'Services', desc: 'Agencies, consultancies & freelancing', icon: Wrench },
    { type: 'Other', title: 'Other', desc: 'Specialized business models & enterprises', icon: HelpCircle },
  ];

  const volumes: { volume: MonthlyPaymentVolume; label: string; desc: string }[] = [
    { volume: '< ₹1L', label: '< ₹1 Lakh', desc: 'Early stage & launching products' },
    { volume: '₹1L–₹5L', label: '₹1L – ₹5 Lakhs', desc: 'Growing businesses with steady volume' },
    { volume: '₹5L–₹25L', label: '₹5L – ₹25 Lakhs', desc: 'Scaling operations & high transaction volume' },
    { volume: '₹25L+', label: '₹25 Lakhs+', desc: 'High-volume enterprises & established merchants' },
  ];

  const paymentMethods: { method: PaymentMethod; title: string; icon: any; desc: string }[] = [
    { method: 'UPI', title: 'UPI Intent & QR', icon: QrCode, desc: 'Instant UPI collect & intent fallback' },
    { method: 'Credit Card', title: 'Credit Cards', icon: CreditCard, desc: 'Visa, Mastercard, RuPay & Amex' },
    { method: 'Debit Card', title: 'Debit Cards', icon: Smartphone, desc: 'Direct banking debit networks' },
    { method: 'Net Banking', title: 'Net Banking', icon: Landmark, desc: '50+ direct integrated Indian banks' },
  ];

  const togglePaymentMethod = (method: PaymentMethod) => {
    if (preferredPaymentMethods.includes(method)) {
      if (preferredPaymentMethods.length === 1) return; // Must have at least one
      setPreferredPaymentMethods(preferredPaymentMethods.filter((m) => m !== method));
    } else {
      setPreferredPaymentMethods([...preferredPaymentMethods, method]);
    }
  };

  const handleNext = () => {
    setError(null);
    if (currentStep === 2 && !businessName.trim()) {
      setError('Please provide your business name');
      return;
    }
    if (currentStep === 5 && preferredPaymentMethods.length === 0) {
      setError('Please select at least one preferred payment method');
      return;
    }
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      const res = await completeOnboardingApi({
        businessName: businessName.trim(),
        businessType,
        monthlyPaymentVolume,
        preferredPaymentMethods,
      });

      if (res.success && res.merchant) {
        updateMerchant(res.merchant);
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to complete onboarding. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand-600/10 blur-[140px] rounded-full pointer-events-none"></div>

      <div className="max-w-2xl mx-auto w-full relative z-10 space-y-6">
        {/* Header Branding & Step Counter */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-400 flex items-center justify-center shadow-md shadow-brand-600/30">
              <Zap className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="font-bold text-xl text-white">
              Recover<span className="text-brand-400">AI</span>
            </span>
          </div>

          <p className="text-xs font-semibold uppercase tracking-wider text-brand-400">
            Step {currentStep} of 5
          </p>

          {/* Stepper Progress Bar */}
          <div className="flex gap-2 max-w-xs mx-auto pt-1">
            {[1, 2, 3, 4, 5].map((step) => (
              <div
                key={step}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  currentStep >= step ? 'bg-brand-500 shadow-sm shadow-brand-500/50' : 'bg-surface-border'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Wizard Main Card */}
        <Card className="shadow-fintech-card bg-surface/95 backdrop-blur-xl border border-surface-border p-8">
          {error && (
            <div className="mb-6 p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Welcome */}
          {currentStep === 1 && (
            <div className="text-center space-y-6 py-4">
              <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/30 mx-auto flex items-center justify-center text-brand-400 shadow-glow-brand">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Welcome to RecoverAI, {user?.name || 'Merchant'}
                </h2>
                <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                  Let's configure your autonomous recovery workspace in 4 quick steps so our AI can calibrate its predictive models to your payment profile.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-muted/60 border border-surface-border text-left max-w-md mx-auto space-y-2.5">
                <div className="flex items-center gap-2.5 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Real-time smart retry intelligence</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Merchant-scoped telemetry & data isolation</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Zero fake numbers — ready for live transactions</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Business Name */}
          {currentStep === 2 && (
            <div className="space-y-6 py-2">
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400">
                  <Building className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Confirm Business Name</h2>
                <p className="text-sm text-slate-400">
                  This identifier will be displayed across your recovery reports and invoices.
                </p>
              </div>

              <Input
                label="Business / Merchant Legal Name"
                placeholder="e.g. Nexus Pay Technologies"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                autoFocus
              />
            </div>
          )}

          {/* STEP 3: Business Type */}
          {currentStep === 3 && (
            <div className="space-y-6 py-2">
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400">
                  <Briefcase className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Select Business Type</h2>
                <p className="text-sm text-slate-400">
                  Our machine learning model applies tailored recovery policies based on your revenue model.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[340px] overflow-y-auto pr-1">
                {businessTypes.map((item) => {
                  const Icon = item.icon;
                  const isSelected = businessType === item.type;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setBusinessType(item.type)}
                      className={`p-3.5 rounded-xl text-left border transition-all flex items-start gap-3 ${
                        isSelected
                          ? 'bg-brand-600/15 border-brand-500 text-white shadow-sm ring-1 ring-brand-500'
                          : 'bg-surface-muted/60 border-surface-border text-slate-300 hover:border-slate-600 hover:bg-surface-muted'
                      }`}
                    >
                      <div
                        className={`p-2 rounded-lg ${
                          isSelected ? 'bg-brand-500/20 text-brand-300' : 'bg-surface-border text-slate-400'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{item.title}</p>
                        <p className="text-[11px] text-slate-400 leading-tight mt-0.5">{item.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: Monthly Payment Volume */}
          {currentStep === 4 && (
            <div className="space-y-6 py-2">
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Monthly Payment Volume</h2>
                <p className="text-sm text-slate-400">
                  Helps RecoverAI scale concurrency rate limits and webhook dunning frequency.
                </p>
              </div>

              <div className="space-y-3">
                {volumes.map((item) => {
                  const isSelected = monthlyPaymentVolume === item.volume;
                  return (
                    <button
                      key={item.volume}
                      type="button"
                      onClick={() => setMonthlyPaymentVolume(item.volume)}
                      className={`w-full p-4 rounded-xl text-left border transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-brand-600/15 border-brand-500 text-white shadow-sm ring-1 ring-brand-500'
                          : 'bg-surface-muted/60 border-surface-border text-slate-300 hover:border-slate-600 hover:bg-surface-muted'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-bold">{item.label}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-600'
                        }`}
                      >
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white"></div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 5: Preferred Payment Methods */}
          {currentStep === 5 && (
            <div className="space-y-6 py-2">
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400">
                  <CreditCard className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Preferred Payment Methods</h2>
                <p className="text-sm text-slate-400">
                  Select the payment rails enabled for your checkout and subscription billing.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {paymentMethods.map((item) => {
                  const Icon = item.icon;
                  const isSelected = preferredPaymentMethods.includes(item.method);
                  return (
                    <button
                      key={item.method}
                      type="button"
                      onClick={() => togglePaymentMethod(item.method)}
                      className={`p-4 rounded-xl text-left border transition-all flex items-start gap-3.5 ${
                        isSelected
                          ? 'bg-brand-600/15 border-brand-500 text-white shadow-sm ring-1 ring-brand-500'
                          : 'bg-surface-muted/60 border-surface-border text-slate-300 hover:border-slate-600 hover:bg-surface-muted'
                      }`}
                    >
                      <div
                        className={`p-2 rounded-lg ${
                          isSelected ? 'bg-brand-500/20 text-brand-300' : 'bg-surface-border text-slate-400'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold">{item.title}</p>
                          <span
                            className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                              isSelected ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-600'
                            }`}
                          >
                            {isSelected && '✓'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-tight mt-1">{item.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="mt-8 pt-6 border-t border-surface-border flex items-center justify-between">
            {currentStep > 1 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleBack}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Back
              </Button>
            ) : (
              <div></div>
            )}

            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleNext}
              isLoading={isSubmitting}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {currentStep === 1
                ? "Let's Get Started"
                : currentStep === 5
                ? 'Complete Setup & Launch'
                : 'Next Step'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

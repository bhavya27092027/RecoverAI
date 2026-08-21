import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getProfileApi, updateProfileApi } from '../api/merchant.api';
import { BusinessType, MonthlyPaymentVolume, PaymentMethod } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { seedDemoScenarioApi } from '../api/demo.api';
import {
  User,
  Building,
  Mail,
  CreditCard,
  Check,
  AlertCircle,
  Save,
  Shield,
  QrCode,
  Smartphone,
  Landmark,
  Database,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, merchant, updateUserProfile } = useAuth();

  const [name, setName] = useState(user?.name || '');
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

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingDemo, setIsGeneratingDemo] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGenerateDemoData = async () => {
    try {
      setIsGeneratingDemo(true);
      setErrorMessage(null);
      const res = await seedDemoScenarioApi();
      if (res.success) {
        setSuccessMessage('Successfully generated realistic demo scenario dataset in MongoDB!');
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate demo dataset');
    } finally {
      setIsGeneratingDemo(false);
    }
  };

  // Sync state with freshest profile from server
  useEffect(() => {
    const fetchLatestProfile = async () => {
      try {
        setIsLoading(true);
        const data = await getProfileApi();
        if (data.user && data.merchant) {
          setName(data.user.name);
          setBusinessName(data.merchant.businessName);
          setBusinessType(data.merchant.businessType);
          setMonthlyPaymentVolume(data.merchant.monthlyPaymentVolume);
          setPreferredPaymentMethods(data.merchant.preferredPaymentMethods);
          updateUserProfile(data.user, data.merchant);
        }
      } catch (err: any) {
        console.error('Failed to load profile:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLatestProfile();
  }, []);

  const businessTypes: BusinessType[] = [
    'E-commerce',
    'SaaS',
    'Subscription',
    'Marketplace',
    'Education',
    'Services',
    'Other',
  ];

  const volumes: MonthlyPaymentVolume[] = ['< ₹1L', '₹1L–₹5L', '₹5L–₹25L', '₹25L+'];

  const paymentMethodOptions: { method: PaymentMethod; label: string; icon: any }[] = [
    { method: 'UPI', label: 'UPI Intent & QR', icon: QrCode },
    { method: 'Credit Card', label: 'Credit Cards', icon: CreditCard },
    { method: 'Debit Card', label: 'Debit Cards', icon: Smartphone },
    { method: 'Net Banking', label: 'Net Banking', icon: Landmark },
  ];

  const togglePaymentMethod = (method: PaymentMethod) => {
    if (preferredPaymentMethods.includes(method)) {
      if (preferredPaymentMethods.length === 1) return;
      setPreferredPaymentMethods(preferredPaymentMethods.filter((m) => m !== method));
    } else {
      setPreferredPaymentMethods([...preferredPaymentMethods, method]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Full name is required');
      return;
    }

    if (!businessName.trim()) {
      setErrorMessage('Business name is required');
      return;
    }

    if (preferredPaymentMethods.length === 0) {
      setErrorMessage('Please select at least one preferred payment method');
      return;
    }

    try {
      setIsSaving(true);
      const res = await updateProfileApi({
        name: name.trim(),
        businessName: businessName.trim(),
        businessType,
        monthlyPaymentVolume,
        preferredPaymentMethods,
      });

      if (res.success && res.user && res.merchant) {
        updateUserProfile(res.user, res.merchant);
        setSuccessMessage('Merchant profile and settings updated successfully in MongoDB!');
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Settings Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border/80 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Merchant & User Profile</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your account credentials, business configuration, and AI recovery preferences.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="brand" size="md">
            Merchant ID: {merchant?.id ? `${merchant.id.slice(0, 8)}...` : 'Active'}
          </Badge>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 text-sm flex items-center gap-3">
          <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* User Profile Card */}
        <Card className="bg-surface border-surface-border space-y-6">
          <div className="flex items-center gap-2.5 pb-2 border-b border-surface-border/60">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Personal Account</h2>
              <p className="text-xs text-slate-400">Your operator details and identity</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              placeholder="e.g. Alex Mercer"
              leftIcon={<User className="w-4 h-4" />}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Email Address
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="block w-full rounded-xl bg-surface-muted/50 border border-surface-border text-slate-400 text-sm pl-10 pr-3.5 py-2.5 cursor-not-allowed"
                />
              </div>
              <p className="text-[10px] text-slate-400">Email is unique and bound to your account.</p>
            </div>
          </div>
        </Card>

        {/* Business Details Card */}
        <Card className="bg-surface border-surface-border space-y-6">
          <div className="flex items-center gap-2.5 pb-2 border-b border-surface-border/60">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Merchant Business Details</h2>
              <p className="text-xs text-slate-400">Configure your business classification and volume</p>
            </div>
          </div>

          <div className="space-y-4">
            <Input
              label="Business / Company Name"
              placeholder="e.g. Nexus Pay Systems Ltd"
              leftIcon={<Building className="w-4 h-4" />}
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              disabled={isLoading}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Business Type */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Business Model
                </label>
                <div className="relative">
                  <select
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value as BusinessType)}
                    className="block w-full rounded-xl bg-surface-muted border border-surface-border text-slate-200 text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
                  >
                    {businessTypes.map((type) => (
                      <option key={type} value={type} className="bg-surface-muted text-white">
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Monthly Payment Volume */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Monthly Payment Volume
                </label>
                <div className="relative">
                  <select
                    value={monthlyPaymentVolume}
                    onChange={(e) => setMonthlyPaymentVolume(e.target.value as MonthlyPaymentVolume)}
                    className="block w-full rounded-xl bg-surface-muted border border-surface-border text-slate-200 text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
                  >
                    {volumes.map((vol) => (
                      <option key={vol} value={vol} className="bg-surface-muted text-white">
                        {vol}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Preferred Payment Methods */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Enabled Payment Rails
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {paymentMethodOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isChecked = preferredPaymentMethods.includes(opt.method);
                  return (
                    <button
                      key={opt.method}
                      type="button"
                      onClick={() => togglePaymentMethod(opt.method)}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                        isChecked
                          ? 'bg-brand-600/15 border-brand-500 text-white shadow-sm ring-1 ring-brand-500'
                          : 'bg-surface-muted/60 border-surface-border text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-brand-400" />
                        <span className="text-xs font-semibold">{opt.label}</span>
                      </div>
                      <span
                        className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[9px] ${
                          isChecked ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-600'
                        }`}
                      >
                        {isChecked && '✓'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        {/* Simulation Environment & Demo Dataset */}
        <Card className="bg-surface border-surface-border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Simulation Environment & Demo Dataset</h2>
                <p className="text-xs text-slate-400">Generate realistic sample records for presentations and evaluation</p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerateDemoData}
              isLoading={isGeneratingDemo}
              leftIcon={<Database className="w-3.5 h-3.5" />}
            >
              Generate Demo Scenario
            </Button>
          </div>
          <p className="text-xs text-slate-400">
            Populates 6 customers, 18 transactions over 30 days, AI recovery scores, and simulated autonomous retry attempts into this merchant profile.
          </p>
        </Card>

        {/* Security & Scoping Summary */}
        <Card className="bg-surface border-surface-border p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold text-slate-200">Database Multi-Tenancy & Integrity</p>
              <p className="text-slate-400 leading-relaxed">
                All profile edits are securely committed to your isolated merchant document in MongoDB. Changes immediately apply to active session telemetry.
              </p>
            </div>
          </div>
        </Card>

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSaving}
            leftIcon={<Save className="w-4 h-4" />}
            className="shadow-glow-brand"
          >
            Save Profile Changes
          </Button>
        </div>
      </form>
    </div>
  );
};

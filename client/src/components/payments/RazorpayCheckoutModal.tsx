import React, { useState, useEffect } from 'react';
import { Transaction } from '../../types';
import { createRazorpayOrderApi, verifyRazorpayPaymentApi } from '../../api/payment.api';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  Zap,
  Info,
} from 'lucide-react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  onSuccess: (updatedTx: Transaction) => void;
}

type PaymentFlowState =
  | 'IDLE'
  | 'CREATING_ORDER'
  | 'AWAITING_PAYMENT'
  | 'VERIFYING'
  | 'SUCCESS'
  | 'ERROR';

export const RazorpayCheckoutModal: React.FC<RazorpayCheckoutModalProps> = ({
  isOpen,
  onClose,
  transaction,
  onSuccess,
}) => {
  const [state, setState] = useState<PaymentFlowState>('IDLE');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState<boolean>(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);

  // Load Razorpay Checkout Script dynamically
  useEffect(() => {
    if (window.Razorpay) {
      setScriptLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => {
      setErrorMsg('Failed to load Razorpay Checkout script. Check internet connectivity.');
    };
    document.body.appendChild(script);
  }, []);

  // Reset state when opening with a new transaction
  useEffect(() => {
    if (isOpen) {
      setState('IDLE');
      setErrorMsg(null);
      setPaymentResult(null);
    }
  }, [isOpen, transaction]);

  if (!isOpen || !transaction) return null;

  const handleStartPayment = async () => {
    try {
      setState('CREATING_ORDER');
      setErrorMsg(null);

      // 1. Create order on backend
      const orderRes = await createRazorpayOrderApi(transaction.id);
      const { orderId, amountInPaise, currency, keyId, businessName } = orderRes.data;

      if (!window.Razorpay) {
        throw new Error('Razorpay SDK is not initialized.');
      }

      setState('AWAITING_PAYMENT');

      // 2. Open Razorpay Test Mode Checkout
      const options = {
        key: keyId,
        amount: amountInPaise,
        currency: currency || 'INR',
        name: businessName || 'RecoverAI Merchant',
        description: transaction.description || 'Test Mode Recovery Payment',
        order_id: orderId,
        prefill: {
          name: transaction.customer?.name || 'Test Customer',
          email: transaction.customer?.email || 'customer@test.com',
          contact: transaction.customer?.phone || '+91 99999 88888',
        },
        theme: {
          color: '#10b981', // Emerald theme matching fintech UI
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            setState('VERIFYING');

            // 3. Cryptographically verify signature on backend
            const verifyRes = await verifyRazorpayPaymentApi({
              transactionId: transaction.id,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            setState('SUCCESS');
            setPaymentResult({
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
            });
            onSuccess(verifyRes.data);
          } catch (verifyErr: any) {
            setState('ERROR');
            setErrorMsg(
              verifyErr.response?.data?.error ||
                verifyErr.message ||
                'Cryptographic verification failed.'
            );
          }
        },
        modal: {
          ondismiss: () => {
            if (state === 'AWAITING_PAYMENT') {
              setState('IDLE');
            }
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (failResponse: any) => {
        setState('ERROR');
        setErrorMsg(
          failResponse.error?.description ||
            failResponse.error?.reason ||
            'Payment failed on Razorpay test gateway.'
        );
      });
      rzp.open();
    } catch (err: any) {
      setState('ERROR');
      setErrorMsg(
        err.response?.data?.error ||
          err.message ||
          'Failed to initialize Razorpay test payment order.'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-semibold text-white">Razorpay Test Checkout</h3>
                <Badge variant="warning">TEST MODE</Badge>
              </div>
              <p className="text-xs text-slate-400">
                Safe test payment processing via Razorpay gateway
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Test Mode Disclaimer Banner */}
        <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start space-x-2.5">
          <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300 leading-relaxed">
            <strong>Simulation Safety:</strong> This is a Razorpay Test Mode integration. No real
            money, cards, or bank accounts will be debited. Use Razorpay test credentials or test
            UPI IDs in checkout.
          </p>
        </div>

        {/* Transaction Summary Box */}
        <div className="mt-4 bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400">Customer</span>
            <span className="text-white font-medium">
              {transaction.customer?.name || 'Walk-in Customer'}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400">Customer Email</span>
            <span className="text-slate-300">
              {transaction.customer?.email || 'customer@recoverai.io'}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400">Payment Amount</span>
            <span className="text-emerald-400 font-bold text-base">
              ₹{transaction.amount.toLocaleString()} {transaction.currency || 'INR'}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400">Current Status</span>
            <Badge
              variant={
                transaction.status === 'SUCCESS' || transaction.status === 'RECOVERED'
                  ? 'success'
                  : transaction.status === 'FAILED'
                  ? 'warning'
                  : 'default'
              }
            >
              {transaction.status}
            </Badge>
          </div>
        </div>

        {/* Flow State Renderers */}
        <div className="mt-5">
          {state === 'IDLE' && (
            <div className="space-y-3">
              <div className="p-3.5 bg-slate-800/40 rounded-xl border border-slate-800 text-xs text-slate-300 flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>
                  Backend cryptographically verifies the SHA-256 payment signature before
                  crediting revenue.
                </span>
              </div>
              <div className="flex space-x-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white"
                  onClick={handleStartPayment}
                  disabled={!scriptLoaded}
                >
                  <Zap className="w-4 h-4 mr-1.5" />
                  Launch Test Checkout
                </Button>
              </div>
            </div>
          )}

          {(state === 'CREATING_ORDER' ||
            state === 'AWAITING_PAYMENT' ||
            state === 'VERIFYING') && (
            <div className="py-6 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
              <div className="space-y-1">
                <h4 className="text-sm font-medium text-white">
                  {state === 'CREATING_ORDER' && 'Generating Razorpay Test Order...'}
                  {state === 'AWAITING_PAYMENT' && 'Awaiting Razorpay Checkout Completion...'}
                  {state === 'VERIFYING' && 'Verifying HMAC SHA-256 Signature...'}
                </h4>
                <p className="text-xs text-slate-400">
                  {state === 'CREATING_ORDER' && 'Creating order via Razorpay Node.js SDK'}
                  {state === 'AWAITING_PAYMENT' && 'Complete the test payment in the Razorpay modal'}
                  {state === 'VERIFYING' && 'Validating payment ID against Razorpay test gateway'}
                </p>
              </div>
            </div>
          )}

          {state === 'SUCCESS' && (
            <div className="py-4 text-center space-y-4">
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-semibold text-white">
                  Payment Captured & Verified!
                </h4>
                <p className="text-xs text-slate-400">
                  Transaction marked as SUCCESS in MongoDB with verified payment ID.
                </p>
                {paymentResult && (
                  <div className="mt-2 text-xs font-mono text-slate-300 bg-slate-950/80 p-2 rounded border border-slate-800">
                    Payment ID: {paymentResult.paymentId}
                  </div>
                )}
              </div>
              <Button variant="primary" className="w-full" onClick={onClose}>
                Done
              </Button>
            </div>
          )}

          {state === 'ERROR' && (
            <div className="py-4 text-center space-y-4">
              <div className="w-12 h-12 bg-rose-500/10 text-rose-400 rounded-full flex items-center justify-center mx-auto border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-semibold text-white">Payment Processing Issue</h4>
                <p className="text-xs text-rose-300 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20 text-left">
                  {errorMsg || 'An error occurred during Razorpay test payment execution.'}
                </p>
              </div>
              <div className="flex space-x-3">
                <Button variant="outline" className="flex-1" onClick={onClose}>
                  Close
                </Button>
                <Button variant="primary" className="flex-1" onClick={handleStartPayment}>
                  Retry Test Payment
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import { FailureReason } from '../models/Transaction.model';

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret?: string;
  isConfigured: boolean;
}

export const getRazorpayConfig = (): RazorpayConfig => {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

  const isConfigured = Boolean(
    keyId && keySecret && !keyId.includes('your_') && !keySecret.includes('your_')
  );

  return {
    keyId,
    keySecret,
    webhookSecret,
    isConfigured,
  };
};

/**
 * Returns safe public Razorpay metadata for frontend checkout initialization.
 * NEVER returns keySecret or webhookSecret.
 */
export const getSafeRazorpayPublicConfig = () => {
  const { keyId, isConfigured } = getRazorpayConfig();
  return {
    isConfigured,
    keyId: isConfigured ? keyId : null,
    mode: 'TEST' as const,
  };
};

/**
 * Maps Razorpay gateway error reasons/codes to RecoverAI failure reason taxonomy
 */
export const mapRazorpayFailureReason = (
  errorReason?: string,
  errorCode?: string
): FailureReason => {
  const raw = `${errorReason || ''} ${errorCode || ''}`.toLowerCase();

  if (raw.includes('timeout') || raw.includes('gateway_error') || raw.includes('server_error')) {
    return 'BANK_TIMEOUT';
  }
  if (
    raw.includes('insufficient') ||
    raw.includes('balance') ||
    raw.includes('funds') ||
    raw.includes('low_balance')
  ) {
    return 'INSUFFICIENT_BALANCE';
  }
  if (
    raw.includes('auth') ||
    raw.includes('otp') ||
    raw.includes('pin') ||
    raw.includes('2fa') ||
    raw.includes('verification_failed')
  ) {
    return 'AUTHENTICATION_FAILURE';
  }
  if (
    raw.includes('limit') ||
    raw.includes('exceeded') ||
    raw.includes('max_amount') ||
    raw.includes('threshold')
  ) {
    return 'TRANSACTION_LIMIT';
  }
  if (
    raw.includes('decline') ||
    raw.includes('card_not_supported') ||
    raw.includes('expired') ||
    raw.includes('invalid_card')
  ) {
    return 'CARD_DECLINED';
  }

  return 'CUSTOMER_ABANDONMENT';
};

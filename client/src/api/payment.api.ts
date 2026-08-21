import client from './client';
import {
  RazorpayPublicConfig,
  RazorpayOrderData,
  RazorpayVerificationPayload,
  Transaction,
} from '../types';

/**
 * Fetch Razorpay public configuration
 */
export const getRazorpayConfigApi = async (): Promise<{
  success: boolean;
  data: RazorpayPublicConfig;
}> => {
  const response = await client.get('/payments/config');
  return response.data;
};

/**
 * Create Razorpay TEST order for a transaction
 */
export const createRazorpayOrderApi = async (
  transactionId: string
): Promise<{
  success: boolean;
  data: RazorpayOrderData;
}> => {
  const response = await client.post('/payments/razorpay/order', { transactionId });
  return response.data;
};

/**
 * Verify Razorpay payment signature after checkout completes
 */
export const verifyRazorpayPaymentApi = async (
  payload: RazorpayVerificationPayload
): Promise<{
  success: boolean;
  message: string;
  data: Transaction;
}> => {
  const response = await client.post('/payments/razorpay/verify', payload);
  return response.data;
};

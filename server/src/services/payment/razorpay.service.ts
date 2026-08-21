import crypto from 'crypto';
import Razorpay from 'razorpay';
import { getRazorpayConfig } from '../../config/razorpay';

export interface CreateRazorpayOrderParams {
  amount: number; // In Rupees (will be converted to paise)
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResult {
  orderId: string;
  amount: number; // in paise
  currency: string;
  receipt: string;
  status: string;
}

export interface VerifyPaymentSignatureParams {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface VerifyWebhookSignatureParams {
  rawBody: string | Buffer;
  signature: string;
  secret?: string;
}

export class RazorpayPaymentService {
  private getClient(): Razorpay {
    const config = getRazorpayConfig();
    if (!config.isConfigured) {
      throw new Error(
        'Razorpay TEST credentials not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your environment.'
      );
    }
    return new Razorpay({
      key_id: config.keyId,
      key_secret: config.keySecret,
    });
  }

  /**
   * Creates a Razorpay TEST order in smallest currency unit (paise for INR)
   */
  public async createOrder(params: CreateRazorpayOrderParams): Promise<RazorpayOrderResult> {
    const client = this.getClient();
    const amountInPaise = Math.round(params.amount * 100);

    const order = await client.orders.create({
      amount: amountInPaise,
      currency: params.currency || 'INR',
      receipt: params.receipt,
      notes: params.notes || {},
    });

    return {
      orderId: order.id,
      amount: Number(order.amount),
      currency: order.currency,
      receipt: order.receipt || params.receipt,
      status: order.status,
    };
  }

  /**
   * Cryptographically verifies Razorpay checkout payment signature using HMAC SHA-256
   */
  public verifyPaymentSignature(params: VerifyPaymentSignatureParams): boolean {
    const config = getRazorpayConfig();
    if (!config.keySecret) {
      return false;
    }

    try {
      const generatedSignature = crypto
        .createHmac('sha256', config.keySecret)
        .update(`${params.orderId}|${params.paymentId}`)
        .digest('hex');

      const expectedBuffer = Buffer.from(generatedSignature, 'utf8');
      const providedBuffer = Buffer.from(params.signature, 'utf8');

      if (expectedBuffer.length !== providedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
    } catch {
      return false;
    }
  }

  /**
   * Cryptographically verifies Razorpay webhook signature using HMAC SHA-256
   */
  public verifyWebhookSignature(params: VerifyWebhookSignatureParams): boolean {
    const config = getRazorpayConfig();
    const secret = params.secret || config.webhookSecret || config.keySecret;
    if (!secret || !params.signature) {
      return false;
    }

    try {
      const payloadString =
        typeof params.rawBody === 'string'
          ? params.rawBody
          : params.rawBody.toString('utf8');

      const generatedSignature = crypto
        .createHmac('sha256', secret)
        .update(payloadString)
        .digest('hex');

      const expectedBuffer = Buffer.from(generatedSignature, 'utf8');
      const providedBuffer = Buffer.from(params.signature, 'utf8');

      if (expectedBuffer.length !== providedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
    } catch {
      return false;
    }
  }

  /**
   * Fetches payment details from Razorpay TEST gateway
   */
  public async fetchPayment(paymentId: string): Promise<any> {
    const client = this.getClient();
    return await client.payments.fetch(paymentId);
  }

  /**
   * Fetches order details from Razorpay TEST gateway
   */
  public async fetchOrder(orderId: string): Promise<any> {
    const client = this.getClient();
    return await client.orders.fetch(orderId);
  }
}

export const razorpayPaymentService = new RazorpayPaymentService();

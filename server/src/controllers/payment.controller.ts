import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { Transaction } from '../models/Transaction.model';
import { RecoveryEvent } from '../models/RecoveryEvent.model';
import {
  razorpayPaymentService,
  CreateRazorpayOrderParams,
} from '../services/payment/razorpay.service';
import { getRazorpayConfig, getSafeRazorpayPublicConfig } from '../config/razorpay';

export class PaymentController {
  /**
   * Returns public Razorpay configuration for frontend checkout.
   * Never leaks secrets.
   */
  public async getPublicConfig(_req: AuthenticatedRequest, res: Response): Promise<void> {
    const config = getSafeRazorpayPublicConfig();
    res.status(200).json({
      success: true,
      data: config,
    });
  }

  /**
   * Creates a Razorpay TEST MODE order for a merchant transaction
   */
  public async createRazorpayOrder(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const merchant = req.merchant;
      if (!merchant) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { transactionId } = req.body;
      if (!transactionId || !mongoose.Types.ObjectId.isValid(transactionId)) {
        res.status(400).json({ success: false, error: 'Valid transactionId is required' });
        return;
      }

      const transaction = await Transaction.findOne({
        _id: transactionId,
        merchantId: merchant._id,
      });

      if (!transaction) {
        res.status(404).json({ success: false, error: 'Transaction not found or unauthorized' });
        return;
      }

      if (transaction.status === 'SUCCESS' || transaction.status === 'RECOVERED') {
        res.status(400).json({
          success: false,
          error: `Transaction is already in ${transaction.status} state. Cannot create new payment order.`,
        });
        return;
      }

      const config = getRazorpayConfig();
      if (!config.isConfigured) {
        res.status(503).json({
          success: false,
          error:
            'Razorpay TEST credentials not configured on the server. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET or use the Demo Payment simulation.',
        });
        return;
      }

      const orderParams: CreateRazorpayOrderParams = {
        amount: transaction.amount,
        currency: transaction.currency || 'INR',
        receipt: `rcpt_${transaction._id.toString().slice(-8)}`,
        notes: {
          merchantId: merchant._id.toString(),
          transactionId: transaction._id.toString(),
          businessName: merchant.businessName,
        },
      };

      const order = await razorpayPaymentService.createOrder(orderParams);

      transaction.provider = 'RAZORPAY';
      transaction.razorpayOrderId = order.orderId;
      transaction.status = 'PROCESSING';
      await transaction.save();

      // Record audit event
      await RecoveryEvent.create({
        merchantId: merchant._id,
        transactionId: transaction._id,
        eventType: 'PAYMENT_LINK_GENERATED',
        message: `Razorpay TEST order created: ${order.orderId} for ₹${transaction.amount.toLocaleString()}`,
        metadata: {
          orderId: order.orderId,
          amount: transaction.amount,
          provider: 'RAZORPAY',
        },
        timestamp: new Date(),
      });

      // Return ONLY safe information needed by frontend
      res.status(200).json({
        success: true,
        data: {
          orderId: order.orderId,
          amount: transaction.amount,
          amountInPaise: order.amount,
          currency: order.currency,
          keyId: config.keyId,
          businessName: merchant.businessName,
          transactionId: transaction._id,
        },
      });
    } catch (error: any) {
      console.error('[Razorpay Order Error]:', error.message);
      next(error);
    }
  }

  /**
   * Cryptographically verifies Razorpay payment signature and captures payment
   */
  public async verifyRazorpayPayment(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const merchant = req.merchant;
      if (!merchant) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { transactionId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

      if (!transactionId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        res.status(400).json({
          success: false,
          error:
            'Missing required payment verification parameters (transactionId, razorpayOrderId, razorpayPaymentId, razorpaySignature)',
        });
        return;
      }

      const transaction = await Transaction.findOne({
        _id: transactionId,
        merchantId: merchant._id,
      });

      if (!transaction) {
        res.status(404).json({ success: false, error: 'Transaction not found or unauthorized' });
        return;
      }

      if (transaction.razorpayOrderId && transaction.razorpayOrderId !== razorpayOrderId) {
        res.status(400).json({
          success: false,
          error: 'Razorpay order ID mismatch with recorded transaction order',
        });
        return;
      }

      // Cryptographic verification
      const isValid = razorpayPaymentService.verifyPaymentSignature({
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
        signature: razorpaySignature,
      });

      if (!isValid) {
        await RecoveryEvent.create({
          merchantId: merchant._id,
          transactionId: transaction._id,
          eventType: 'RECOVERY_FAILED',
          message: `Razorpay payment signature verification failed for payment ${razorpayPaymentId}`,
          metadata: {
            orderId: razorpayOrderId,
            paymentId: razorpayPaymentId,
          },
          timestamp: new Date(),
        });

        res.status(400).json({
          success: false,
          error: 'Payment verification failed: Invalid cryptographic signature.',
        });
        return;
      }

      // Transition transaction to SUCCESS
      transaction.status = 'SUCCESS';
      transaction.provider = 'RAZORPAY';
      transaction.razorpayOrderId = razorpayOrderId;
      transaction.razorpayPaymentId = razorpayPaymentId;
      transaction.razorpaySignature = razorpaySignature;
      transaction.paymentVerifiedAt = new Date();
      transaction.failureReason = null;
      await transaction.save();

      // Record immutable event
      await RecoveryEvent.create({
        merchantId: merchant._id,
        transactionId: transaction._id,
        eventType: 'PAYMENT_RECOVERED',
        message: `Payment verified and captured successfully via Razorpay TEST gateway (${razorpayPaymentId})`,
        metadata: {
          orderId: razorpayOrderId,
          paymentId: razorpayPaymentId,
          amount: transaction.amount,
          provider: 'RAZORPAY',
        },
        timestamp: new Date(),
      });

      res.status(200).json({
        success: true,
        message: 'Payment verified and captured successfully',
        data: {
          id: transaction._id,
          status: transaction.status,
          amount: transaction.amount,
          provider: transaction.provider,
          razorpayOrderId: transaction.razorpayOrderId,
          razorpayPaymentId: transaction.razorpayPaymentId,
          paymentVerifiedAt: transaction.paymentVerifiedAt,
        },
      });
    } catch (error: any) {
      console.error('[Razorpay Verify Error]:', error.message);
      next(error);
    }
  }
}

export const paymentController = new PaymentController();

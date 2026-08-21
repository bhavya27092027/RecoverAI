import { Request, Response } from 'express';
import { Transaction } from '../models/Transaction.model';
import { WebhookEvent } from '../models/WebhookEvent.model';
import { RecoveryEvent } from '../models/RecoveryEvent.model';
import { Notification } from '../models/Notification.model';
import { razorpayPaymentService } from '../services/payment/razorpay.service';
import { mapRazorpayFailureReason } from '../config/razorpay';

export class WebhookController {
  /**
   * Handles incoming Razorpay webhook events with signature verification and idempotency.
   */
  public async handleRazorpayWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.headers['x-razorpay-signature'] as string;
      const eventIdHeader = req.headers['x-razorpay-event-id'] as string;

      if (!signature) {
        console.warn('[Webhook Alert]: Missing x-razorpay-signature header');
        res.status(400).json({ success: false, error: 'Missing x-razorpay-signature header' });
        return;
      }

      // Use raw body captured by express.json({ verify })
      const rawBody = (req as any).rawBody
        ? (req as any).rawBody.toString('utf8')
        : JSON.stringify(req.body);

      const isValidSignature = razorpayPaymentService.verifyWebhookSignature({
        rawBody,
        signature,
      });

      if (!isValidSignature) {
        console.warn('[Webhook Security Alert]: Invalid Razorpay webhook signature detected.');
        res.status(400).json({ success: false, error: 'Invalid webhook signature' });
        return;
      }

      const body = req.body;
      const eventType = body?.event;
      const eventId = eventIdHeader || body?.event_id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // 1. Webhook Idempotency Check
      const existingEvent = await WebhookEvent.findOne({ eventId });
      if (existingEvent) {
        console.log(`[Webhook Idempotency]: Event ${eventId} already processed. Skipping duplicate execution.`);
        res.status(200).json({
          success: true,
          message: 'Event already processed (idempotent)',
        });
        return;
      }

      const paymentEntity = body?.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;

      // Find target transaction by Razorpay order ID or metadata notes
      let transaction = null;
      if (orderId) {
        transaction = await Transaction.findOne({ razorpayOrderId: orderId });
      }
      if (!transaction && paymentEntity?.notes?.transactionId) {
        transaction = await Transaction.findById(paymentEntity.notes.transactionId);
      }

      // Record webhook event in MongoDB
      await WebhookEvent.create({
        eventId,
        eventType: eventType || 'unknown',
        provider: 'RAZORPAY',
        merchantId: transaction?.merchantId || null,
        transactionId: transaction?._id || null,
        payload: body,
        processedAt: new Date(),
      });

      // Process Event Types
      if (eventType === 'payment.captured' || eventType === 'order.paid') {
        if (transaction && transaction.status !== 'SUCCESS' && transaction.status !== 'RECOVERED') {
          transaction.status = 'SUCCESS';
          transaction.provider = 'RAZORPAY';
          if (paymentId) transaction.razorpayPaymentId = paymentId;
          transaction.paymentVerifiedAt = new Date();
          transaction.failureReason = null;
          await transaction.save();

          await RecoveryEvent.create({
            merchantId: transaction.merchantId,
            transactionId: transaction._id,
            eventType: 'PAYMENT_RECOVERED',
            message: `Payment captured via Razorpay webhook: ${paymentId || orderId}`,
            metadata: {
              orderId,
              paymentId,
              amount: transaction.amount,
              source: 'WEBHOOK',
            },
            timestamp: new Date(),
          });

          await Notification.create({
            merchantId: transaction.merchantId,
            type: 'RECOVERY_SUCCESS',
            title: `Payment Captured: ₹${transaction.amount.toLocaleString()}`,
            message: `Razorpay payment ${paymentId || orderId} captured successfully.`,
            metadata: {
              transactionId: transaction._id,
              amount: transaction.amount,
            },
          });
        }
      } else if (eventType === 'payment.failed') {
        if (transaction && transaction.status !== 'SUCCESS' && transaction.status !== 'RECOVERED') {
          const failureReason = mapRazorpayFailureReason(
            paymentEntity?.error_reason,
            paymentEntity?.error_code
          );

          transaction.status = 'FAILED';
          transaction.provider = 'RAZORPAY';
          transaction.failureReason = failureReason;
          if (paymentId) transaction.razorpayPaymentId = paymentId;
          await transaction.save();

          await RecoveryEvent.create({
            merchantId: transaction.merchantId,
            transactionId: transaction._id,
            eventType: 'RECOVERY_FAILED',
            message: `Razorpay payment failed: ${paymentEntity?.error_description || failureReason}`,
            metadata: {
              orderId,
              paymentId,
              errorReason: paymentEntity?.error_reason,
              errorCode: paymentEntity?.error_code,
              source: 'WEBHOOK',
            },
            timestamp: new Date(),
          });

          await Notification.create({
            merchantId: transaction.merchantId,
            type: 'FAILURE_SPIKE',
            title: `Payment Failed: ₹${transaction.amount.toLocaleString()}`,
            message: `Reason: ${failureReason.replace(/_/g, ' ')} (${paymentEntity?.error_description || 'Gateway decline'})`,
            metadata: {
              transactionId: transaction._id,
              failureReason,
            },
          });
        }
      }

      res.status(200).json({
        success: true,
        message: 'Razorpay webhook processed successfully',
        eventId,
      });
    } catch (error: any) {
      console.error('[Webhook Processing Error]:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to process Razorpay webhook event',
      });
    }
  }
}

export const webhookController = new WebhookController();

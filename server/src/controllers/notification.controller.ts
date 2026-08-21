import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Notification } from '../models/Notification.model';
import { Transaction } from '../models/Transaction.model';
import { RecoveryAnalysis } from '../models/RecoveryAnalysis.model';
import { RecoveryAttempt } from '../models/RecoveryAttempt.model';
import { RecoveryEvent } from '../models/RecoveryEvent.model';

export class NotificationController {
  /**
   * Returns live system notifications derived from real database events + stored notifications
   */
  public async getNotifications(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = (req as any).merchant._id;

      // 1. Fetch persisted notifications
      const storedNotifications = await Notification.find({ merchantId })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

      // 2. Fetch real data to construct real-time dynamic alerts
      const [failedTxs, analyses, successfulAttempts] = await Promise.all([
        Transaction.find({ merchantId, status: 'FAILED' })
          .populate('customerId', 'name')
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),
        RecoveryAnalysis.find({ merchantId })
          .sort({ expectedRecoveryAmount: -1 })
          .limit(5)
          .lean(),
        RecoveryAttempt.find({ merchantId, status: 'SUCCESS' })
          .populate('customerId', 'name')
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),
      ]);

      const dynamicAlerts: any[] = [];

      // Alert 1: High-value recovery opportunities
      const highValueOpp = analyses.find((a) => a.expectedRecoveryAmount >= 5000 && a.recoveryProbability >= 70);
      if (highValueOpp) {
        dynamicAlerts.push({
          id: `opp-${highValueOpp._id}`,
          merchantId,
          type: 'HIGH_VALUE_OPPORTUNITY',
          title: `High-Value Recovery Identified (₹${highValueOpp.expectedRecoveryAmount.toLocaleString()})`,
          message: `RecoverAI detected a high-probability opportunity (${highValueOpp.recoveryProbability}%) to salvage revenue via ${highValueOpp.recommendedAction.replace(/_/g, ' ')}.`,
          link: `/recovery/${highValueOpp.transactionId}`,
          isRead: false,
          createdAt: highValueOpp.createdAt,
        });
      }

      // Alert 2: Successful Recovery Events
      successfulAttempts.forEach((att) => {
        const custName = (att.customerId as any)?.name || 'Customer';
        dynamicAlerts.push({
          id: `rec-success-${att._id}`,
          merchantId,
          type: 'RECOVERY_SUCCESS',
          title: `Revenue Recovered: ₹${att.amount.toLocaleString()}`,
          message: `Autonomous recovery strategy successfully settled payment for ${custName}.`,
          link: `/recovery/${att.transactionId}`,
          isRead: false,
          createdAt: att.completedAt || att.createdAt,
        });
      });

      // Alert 3: Failure Alert (if there are active drops)
      if (failedTxs.length >= 3) {
        dynamicAlerts.push({
          id: `fail-spike-${Date.now()}`,
          merchantId,
          type: 'FAILURE_SPIKE',
          title: `${failedTxs.length} Open Payment Failures Awaiting Review`,
          message: 'Multiple customer transactions have dropped. Open the Recovery Center to inspect AI salvage strategies.',
          link: '/recovery-center',
          isRead: false,
          createdAt: failedTxs[0].createdAt,
        });
      }

      // Combine stored + dynamic, deduplicating IDs
      const combined = [...storedNotifications];
      const storedIds = new Set(storedNotifications.map((n) => n._id.toString()));

      dynamicAlerts.forEach((da) => {
        if (!storedIds.has(da.id)) {
          combined.push(da);
        }
      });

      // Sort by newest
      combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const unreadCount = combined.filter((n) => !n.isRead).length;

      res.status(200).json({
        success: true,
        data: combined.slice(0, 20),
        unreadCount,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Mark a single notification as read
   */
  public async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = (req as any).merchant._id;
      const { id } = req.params;

      if (typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)) {
        await Notification.findOneAndUpdate(
          { _id: new mongoose.Types.ObjectId(id), merchantId },
          { isRead: true, readAt: new Date() }
        );
      }

      res.status(200).json({ success: true, message: 'Notification marked as read' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Mark all notifications as read
   */
  public async markAllAsRead(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = (req as any).merchant._id;
      await Notification.updateMany(
        { merchantId, isRead: false },
        { isRead: true, readAt: new Date() }
      );

      res.status(200).json({ success: true, message: 'All notifications marked as read' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export const notificationController = new NotificationController();

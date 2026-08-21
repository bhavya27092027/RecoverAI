import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { Customer } from '../models/Customer.model';
import { Transaction } from '../models/Transaction.model';
import { RecoveryAnalysis } from '../models/RecoveryAnalysis.model';
import { RecoveryAttempt } from '../models/RecoveryAttempt.model';

export const createCustomer = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const merchant = req.merchant;
    if (!merchant) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { name, email, phone } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if customer already exists for this specific merchant
    const existing = await Customer.findOne({
      merchantId: merchant._id,
      email: normalizedEmail,
    });

    if (existing) {
      res.status(409).json({
        success: false,
        error: 'A customer with this email address already exists in your workspace.',
      });
      return;
    }

    const customer = await Customer.create({
      merchantId: merchant._id,
      name: name.trim(),
      email: normalizedEmail,
      phone: phone ? phone.trim() : '',
    });

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
        totalTransactions: 0,
        successfulPayments: 0,
        failedPayments: 0,
        recoveredPayments: 0,
        totalValue: 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const merchant = req.merchant;
    if (!merchant) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { q, page = '1', limit = '50' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const filter: any = { merchantId: merchant._id };

    if (q && typeof q === 'string' && q.trim()) {
      const regex = new RegExp(q.trim(), 'i');
      filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
    }

    const total = await Customer.countDocuments(filter);
    const customers = await Customer.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    if (customers.length === 0) {
      res.status(200).json({
        success: true,
        data: [],
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum) || 1,
        },
      });
      return;
    }

    const customerIds = customers.map((c) => c._id);

    // Aggregate real statistics for each customer
    const statsAgg = await Transaction.aggregate([
      {
        $match: {
          merchantId: merchant._id,
          customerId: { $in: customerIds },
        },
      },
      {
        $group: {
          _id: '$customerId',
          totalTransactions: { $sum: 1 },
          successfulPayments: {
            $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, 1, 0] },
          },
          failedPayments: {
            $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] },
          },
          recoveredPayments: {
            $sum: { $cond: [{ $eq: ['$status', 'RECOVERED'] }, 1, 0] },
          },
          totalValue: {
            $sum: {
              $cond: [
                { $in: ['$status', ['SUCCESS', 'RECOVERED']] },
                { $ifNull: ['$recoveredAmount', '$amount'] },
                0,
              ],
            },
          },
        },
      },
    ]);

    const statsMap = new Map<string, any>();
    statsAgg.forEach((stat) => {
      statsMap.set(stat._id.toString(), stat);
    });

    const enrichedCustomers = customers.map((c) => {
      const stats = statsMap.get(c._id.toString()) || {
        totalTransactions: 0,
        successfulPayments: 0,
        failedPayments: 0,
        recoveredPayments: 0,
        totalValue: 0,
      };

      return {
        id: c._id,
        name: c.name,
        email: c.email,
        phone: c.phone || '',
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        totalTransactions: stats.totalTransactions,
        successfulPayments: stats.successfulPayments,
        failedPayments: stats.failedPayments,
        recoveredPayments: stats.recoveredPayments,
        totalValue: stats.totalValue,
      };
    });

    res.status(200).json({
      success: true,
      data: enrichedCustomers,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomerById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const merchant = req.merchant;
    if (!merchant) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const id = req.params.id as string;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: 'Invalid customer ID' });
      return;
    }

    const customer = await Customer.findOne({
      _id: id,
      merchantId: merchant._id,
    }).lean();

    if (!customer) {
      res.status(404).json({ success: false, error: 'Customer not found' });
      return;
    }

    // Fetch customer's transactions, active recovery analyses, and recovery attempts
    const [transactions, customerAnalyses, customerAttempts] = await Promise.all([
      Transaction.find({
        merchantId: merchant._id,
        customerId: customer._id,
      })
        .sort({ createdAt: -1 })
        .lean(),
      RecoveryAnalysis.find({
        merchantId: merchant._id,
        customerId: customer._id,
      }).lean(),
      RecoveryAttempt.find({
        merchantId: merchant._id,
        customerId: customer._id,
      })
        .sort({ createdAt: -1 })
        .populate('analysisId', 'recoveryProbability recommendedAction')
        .lean(),
    ]);

    // Compute stats
    let totalTransactions = transactions.length;
    let successfulPayments = 0;
    let failedPayments = 0;
    let recoveredPayments = 0;
    let totalSpent = 0;
    let revenueRecovered = 0;

    transactions.forEach((tx) => {
      if (tx.status === 'SUCCESS') {
        successfulPayments++;
        totalSpent += tx.amount;
      } else if (tx.status === 'FAILED') {
        failedPayments++;
      } else if (tx.status === 'RECOVERED') {
        recoveredPayments++;
        revenueRecovered += tx.recoveredAmount || tx.amount;
        totalSpent += tx.recoveredAmount || tx.amount;
      }
    });

    const potentialRecoverableRevenue = customerAnalyses
      .filter((a) => {
        const matchingTx = transactions.find(
          (t) => t._id.toString() === a.transactionId.toString()
        );
        return matchingTx && matchingTx.status === 'FAILED';
      })
      .reduce((sum, a) => sum + (a.expectedRecoveryAmount || 0), 0);

    const paymentReliability =
      totalTransactions > 0
        ? Math.round(((successfulPayments + recoveredPayments) / totalTransactions) * 100)
        : 100;

    const historicalSuccessRate =
      totalTransactions > 0
        ? Math.round((successfulPayments / totalTransactions) * 100)
        : 100;

    const recoveryHistory = customerAttempts.map((att: any) => ({
      id: att._id,
      transactionId: att.transactionId,
      originalAmount: att.amount,
      failureReason: att.failureReason,
      recoveryProbability: att.analysisId?.recoveryProbability ?? 0,
      action: att.action,
      attemptNumber: att.attemptNumber,
      outcome: att.status,
      resultMessage: att.resultMessage,
      recoveredAmount: att.status === 'SUCCESS' ? att.amount : 0,
      date: att.createdAt,
    }));

    res.status(200).json({
      success: true,
      data: {
        customer: {
          id: customer._id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone || '',
          createdAt: customer.createdAt,
          updatedAt: customer.updatedAt,
        },
        stats: {
          totalTransactions,
          successfulPayments,
          failedPayments,
          recoveredPayments,
          totalSpent,
          revenueRecovered,
        },
        aiRecoveryProfile: {
          paymentReliability,
          historicalSuccessRate,
          openRecoveryOpportunities: customerAnalyses.length,
          potentialRecoverableRevenue,
          previousRecoveryAttempts: customerAttempts.length,
        },
        recoveryHistory,
        transactions: transactions.map((t) => ({
          id: t._id,
          amount: t.amount,
          currency: t.currency,
          paymentMethod: t.paymentMethod,
          status: t.status,
          failureReason: t.failureReason,
          recoveredAmount: t.recoveredAmount,
          recoveredAt: t.recoveredAt,
          description: t.description,
          createdAt: t.createdAt,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateCustomer = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const merchant = req.merchant;
    if (!merchant) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const id = req.params.id as string;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: 'Invalid customer ID' });
      return;
    }

    const { name, email, phone } = req.body;

    const customer = await Customer.findOne({
      _id: id,
      merchantId: merchant._id,
    });

    if (!customer) {
      res.status(404).json({ success: false, error: 'Customer not found' });
      return;
    }

    if (name && name.trim()) customer.name = name.trim();
    if (email && email.trim()) {
      const normalized = email.toLowerCase().trim();
      if (normalized !== customer.email) {
        const existing = await Customer.findOne({
          merchantId: merchant._id,
          email: normalized,
          _id: { $ne: customer._id },
        });
        if (existing) {
          res.status(409).json({
            success: false,
            error: 'Another customer with this email already exists in your workspace',
          });
          return;
        }
        customer.email = normalized;
      }
    }
    if (phone !== undefined) customer.phone = phone ? phone.trim() : '';

    await customer.save();

    res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      data: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCustomer = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const merchant = req.merchant;
    if (!merchant) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const id = req.params.id as string;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: 'Invalid customer ID' });
      return;
    }

    const customer = await Customer.findOneAndDelete({
      _id: id,
      merchantId: merchant._id,
    });

    if (!customer) {
      res.status(404).json({ success: false, error: 'Customer not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Customer deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

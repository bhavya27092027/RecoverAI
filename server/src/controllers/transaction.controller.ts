import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { Transaction } from '../models/Transaction.model';
import { Customer } from '../models/Customer.model';
import { demoPaymentProvider } from '../services/payment/demoPaymentProvider';

export const createTransaction = async (
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

    const { customerId, amount, currency = 'INR', paymentMethod, description } = req.body;

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      res.status(400).json({ success: false, error: 'Invalid customer ID' });
      return;
    }

    // Critical security check: Ensure customer belongs to this authenticated merchant
    const customer = await Customer.findOne({
      _id: customerId,
      merchantId: merchant._id,
    });

    if (!customer) {
      res.status(404).json({
        success: false,
        error: 'Selected customer does not exist in your workspace',
      });
      return;
    }

    const transaction = await Transaction.create({
      merchantId: merchant._id,
      customerId: customer._id,
      amount: Number(amount),
      currency: currency.toUpperCase(),
      paymentMethod,
      description: description ? description.trim() : '',
      status: 'CREATED',
      failureReason: null,
    });

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: {
        id: transaction._id,
        amount: transaction.amount,
        currency: transaction.currency,
        paymentMethod: transaction.paymentMethod,
        description: transaction.description,
        status: transaction.status,
        failureReason: transaction.failureReason,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
        customer: {
          id: customer._id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getTransactions = async (
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

    const {
      q,
      status,
      paymentMethod,
      failureReason,
      customerId,
      page = '1',
      limit = '20',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter: any = { merchantId: merchant._id };

    if (status && typeof status === 'string' && status !== 'ALL') {
      filter.status = status.toUpperCase();
    }

    if (paymentMethod && typeof paymentMethod === 'string' && paymentMethod !== 'ALL') {
      filter.paymentMethod = paymentMethod;
    }

    if (failureReason && typeof failureReason === 'string' && failureReason !== 'ALL') {
      filter.failureReason = failureReason.toUpperCase();
    }

    if (customerId && typeof customerId === 'string' && mongoose.Types.ObjectId.isValid(customerId)) {
      filter.customerId = new mongoose.Types.ObjectId(customerId);
    }

    // Handle search query across transaction ID or customer fields
    if (q && typeof q === 'string' && q.trim()) {
      const searchStr = q.trim();
      const matchingCustomers = await Customer.find({
        merchantId: merchant._id,
        $or: [
          { name: new RegExp(searchStr, 'i') },
          { email: new RegExp(searchStr, 'i') },
        ],
      }).select('_id');

      const matchedCustIds = matchingCustomers.map((c) => c._id);

      const isObjectId = mongoose.Types.ObjectId.isValid(searchStr);

      const orConditions: any[] = [];
      if (matchedCustIds.length > 0) {
        orConditions.push({ customerId: { $in: matchedCustIds } });
      }
      if (isObjectId) {
        orConditions.push({ _id: new mongoose.Types.ObjectId(searchStr) });
      }

      if (orConditions.length > 0) {
        filter.$or = orConditions;
      } else {
        // No match found
        res.status(200).json({
          success: true,
          data: [],
          pagination: {
            total: 0,
            page: pageNum,
            limit: limitNum,
            pages: 0,
          },
        });
        return;
      }
    }

    const total = await Transaction.countDocuments(filter);
    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('customerId', 'name email phone')
      .lean();

    const formatted = transactions.map((t: any) => ({
      id: t._id,
      amount: t.amount,
      currency: t.currency,
      paymentMethod: t.paymentMethod,
      description: t.description,
      status: t.status,
      failureReason: t.failureReason,
      provider: t.provider || 'DEMO',
      razorpayOrderId: t.razorpayOrderId,
      razorpayPaymentId: t.razorpayPaymentId,
      paymentVerifiedAt: t.paymentVerifiedAt,
      recoveredAmount: t.recoveredAmount,
      recoveredAt: t.recoveredAt,
      recoveryAttemptId: t.recoveryAttemptId,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      customer: t.customerId
        ? {
            id: t.customerId._id,
            name: t.customerId.name,
            email: t.customerId.email,
            phone: t.customerId.phone,
          }
        : null,
    }));

    res.status(200).json({
      success: true,
      data: formatted,
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

export const getTransactionById = async (
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
      res.status(400).json({ success: false, error: 'Invalid transaction ID' });
      return;
    }

    const transaction: any = await Transaction.findOne({
      _id: id,
      merchantId: merchant._id,
    })
      .populate('customerId', 'name email phone createdAt')
      .lean();

    if (!transaction) {
      res.status(404).json({ success: false, error: 'Transaction not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        id: transaction._id,
        amount: transaction.amount,
        currency: transaction.currency,
        paymentMethod: transaction.paymentMethod,
        description: transaction.description,
        status: transaction.status,
        failureReason: transaction.failureReason,
        provider: transaction.provider || 'DEMO',
        razorpayOrderId: transaction.razorpayOrderId,
        razorpayPaymentId: transaction.razorpayPaymentId,
        paymentVerifiedAt: transaction.paymentVerifiedAt,
        recoveredAmount: transaction.recoveredAmount,
        recoveredAt: transaction.recoveredAt,
        recoveryAttemptId: transaction.recoveryAttemptId,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
        customer: transaction.customerId
          ? {
              id: transaction.customerId._id,
              name: transaction.customerId.name,
              email: transaction.customerId.email,
              phone: transaction.customerId.phone,
              createdAt: transaction.customerId.createdAt,
            }
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const processTransactionPayment = async (
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
    const { simulateStatus, failureReason } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: 'Invalid transaction ID' });
      return;
    }

    const transaction = await Transaction.findOne({
      _id: id,
      merchantId: merchant._id,
    });

    if (!transaction) {
      res.status(404).json({ success: false, error: 'Transaction not found' });
      return;
    }

    // Process payment using provider abstraction
    const result = await demoPaymentProvider.processPayment(transaction, {
      simulateStatus,
      failureReason,
    });

    // Populate customer info for response
    const customer = await Customer.findById(transaction.customerId);

    res.status(200).json({
      success: true,
      message:
        simulateStatus === 'SUCCESS'
          ? 'Payment processed successfully'
          : 'Payment failed as simulated',
      result,
      data: {
        id: transaction._id,
        amount: transaction.amount,
        currency: transaction.currency,
        paymentMethod: transaction.paymentMethod,
        description: transaction.description,
        status: transaction.status,
        failureReason: transaction.failureReason,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
        customer: customer
          ? {
              id: customer._id,
              name: customer.name,
              email: customer.email,
              phone: customer.phone,
            }
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

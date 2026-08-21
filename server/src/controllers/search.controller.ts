import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Customer } from '../models/Customer.model';
import { Transaction } from '../models/Transaction.model';

export class SearchController {
  public async globalSearch(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = (req as any).merchant._id;
      const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';

      if (!query || query.length < 2) {
        res.status(200).json({
          success: true,
          data: {
            customers: [],
            transactions: [],
          },
        });
        return;
      }

      const regex = new RegExp(query, 'i');

      // Check if query looks like an ObjectId or amount
      const isObjectId = mongoose.Types.ObjectId.isValid(query);
      const isNumber = !isNaN(Number(query));

      const customerConditions: any[] = [
        { name: regex },
        { email: regex },
        { phone: regex },
      ];
      if (isObjectId) {
        customerConditions.push({ _id: new mongoose.Types.ObjectId(query) });
      }

      const transactionConditions: any[] = [
        { description: regex },
        { paymentMethod: regex },
        { failureReason: regex },
      ];
      if (isObjectId) {
        transactionConditions.push({ _id: new mongoose.Types.ObjectId(query) });
      }
      if (isNumber) {
        transactionConditions.push({ amount: Number(query) });
      }

      const [customers, transactions] = await Promise.all([
        Customer.find({
          merchantId,
          $or: customerConditions,
        })
          .limit(6)
          .lean(),
        Transaction.find({
          merchantId,
          $or: transactionConditions,
        })
          .populate('customerId', 'name email')
          .limit(6)
          .lean(),
      ]);

      const formattedCustomers = customers.map((c: any) => ({
        id: c._id,
        title: c.name,
        subtitle: c.email,
        type: 'CUSTOMER',
        url: `/customers/${c._id}`,
      }));

      const formattedTransactions = transactions.map((t: any) => ({
        id: t._id,
        title: `₹${t.amount.toLocaleString()} - ${t.paymentMethod}`,
        subtitle: `${(t.customerId as any)?.name || 'Customer'} • ${t.status}`,
        status: t.status,
        type: 'TRANSACTION',
        url: `/transactions/${t._id}`,
      }));

      res.status(200).json({
        success: true,
        data: {
          customers: formattedCustomers,
          transactions: formattedTransactions,
          totalResults: formattedCustomers.length + formattedTransactions.length,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export const searchController = new SearchController();

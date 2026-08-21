import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User.model';
import { Merchant } from '../models/Merchant.model';
import { Customer } from '../models/Customer.model';
import { Transaction } from '../models/Transaction.model';
import { RecoveryAnalysis } from '../models/RecoveryAnalysis.model';
import { RecoveryAttempt } from '../models/RecoveryAttempt.model';
import { RecoveryEvent } from '../models/RecoveryEvent.model';
import bcrypt from 'bcryptjs';

export async function seedDemoDataForMerchant(merchantId: mongoose.Types.ObjectId) {
  console.log(`[Seed] Generating rich demo dataset for merchant ${merchantId}...`);

  const customerData = [
    { name: 'Aditya Birla', email: 'aditya.birla@acme-enterprises.com', phone: '+91 98200 12345' },
    { name: 'Priya Sharma', email: 'priya.sharma@techflow.io', phone: '+91 98201 23456' },
    { name: 'Rohan Deshmukh', email: 'rohan.d@fintechinnovate.com', phone: '+91 98202 34567' },
    { name: 'Ananya Gupta', email: 'ananya.gupta@cloudscale.co', phone: '+91 98203 45678' },
    { name: 'Vikramaditya Roy', email: 'vikram.roy@retailwave.in', phone: '+91 98204 56789' },
    { name: 'Sneha Kulkarni', email: 'sneha.k@saasmetrics.io', phone: '+91 98205 67890' },
  ];

  const createdCustomers = [];
  for (const c of customerData) {
    let cust = await Customer.findOne({ merchantId, email: c.email });
    if (!cust) {
      cust = await Customer.create({ merchantId, ...c });
    }
    createdCustomers.push(cust);
  }

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  // Realistic mix of 18 transactions over 30 days
  const transactionTemplates = [
    // Successful transactions
    { custIdx: 0, amount: 15000, method: 'UPI', desc: 'Annual Enterprise Subscription', status: 'SUCCESS', daysAgo: 28 },
    { custIdx: 1, amount: 8500, method: 'Credit Card', desc: 'Pro Team Plan', status: 'SUCCESS', daysAgo: 25 },
    { custIdx: 2, amount: 12000, method: 'UPI', desc: 'Custom Add-on Package', status: 'SUCCESS', daysAgo: 22 },
    { custIdx: 3, amount: 4500, method: 'Net Banking', desc: 'Starter Monthly Tier', status: 'SUCCESS', daysAgo: 20 },
    { custIdx: 4, amount: 24000, method: 'Credit Card', desc: 'Infrastructure Fleet License', status: 'SUCCESS', daysAgo: 18 },
    { custIdx: 5, amount: 9500, method: 'UPI', desc: 'Security Audit Module', status: 'SUCCESS', daysAgo: 15 },
    { custIdx: 0, amount: 15000, method: 'UPI', desc: 'Support SLA Renewal', status: 'SUCCESS', daysAgo: 12 },
    { custIdx: 1, amount: 8500, method: 'Credit Card', desc: 'Pro Team Expansion', status: 'SUCCESS', daysAgo: 8 },

    // Recovered transactions (Salvaged by RecoverAI)
    { custIdx: 0, amount: 18500, method: 'UPI', desc: 'Annual Renewal', status: 'RECOVERED', failReason: 'BANK_TIMEOUT', daysAgo: 14, recoveredAmt: 18500, action: 'WAIT_AND_RETRY' },
    { custIdx: 2, amount: 12000, method: 'Credit Card', desc: 'Enterprise Workspace', status: 'RECOVERED', failReason: 'CARD_DECLINED', daysAgo: 10, recoveredAmt: 12000, action: 'SUGGEST_ALTERNATE_METHOD' },
    { custIdx: 3, amount: 7500, method: 'UPI', desc: 'API Quota Upgrade', status: 'RECOVERED', failReason: 'INSUFFICIENT_BALANCE', daysAgo: 6, recoveredAmt: 7500, action: 'SEND_PAYMENT_LINK' },
    { custIdx: 5, amount: 9500, method: 'UPI', desc: 'Monthly Retention Pack', status: 'RECOVERED', failReason: 'BANK_TIMEOUT', daysAgo: 3, recoveredAmt: 9500, action: 'RETRY_NOW' },

    // Active unrecovered failed transactions (Open in Recovery Center)
    { custIdx: 1, amount: 14500, method: 'UPI', desc: 'Dedicated Server Tier', status: 'FAILED', failReason: 'BANK_TIMEOUT', daysAgo: 4, action: 'WAIT_AND_RETRY', prob: 88, conf: 'HIGH' },
    { custIdx: 4, amount: 28000, method: 'Credit Card', desc: 'Enterprise Annual Seat Pack', status: 'FAILED', failReason: 'INSUFFICIENT_BALANCE', daysAgo: 2, action: 'SEND_PAYMENT_LINK', prob: 76, conf: 'HIGH' },
    { custIdx: 2, amount: 6200, method: 'Credit Card', desc: 'Developer Seat Extension', status: 'FAILED', failReason: 'CARD_DECLINED', daysAgo: 1, action: 'SUGGEST_ALTERNATE_METHOD', prob: 45, conf: 'MEDIUM' },
    { custIdx: 3, amount: 5000, method: 'Debit Card', desc: 'Plugin License Package', status: 'FAILED', failReason: 'CUSTOMER_ABANDONMENT', daysAgo: 1, action: 'SEND_PAYMENT_LINK', prob: 72, conf: 'MEDIUM' },
  ];

  for (const t of transactionTemplates) {
    const customer = createdCustomers[t.custIdx];
    const createdAt = new Date(now - t.daysAgo * day);

    const tx = await Transaction.create({
      merchantId,
      customerId: customer._id,
      amount: t.amount,
      currency: 'INR',
      paymentMethod: t.method,
      description: t.desc,
      status: t.status,
      failureReason: t.failReason || null,
      recoveredAmount: t.recoveredAmt || null,
      recoveredAt: t.status === 'RECOVERED' ? new Date(createdAt.getTime() + 2 * 60 * 60 * 1000) : null,
      createdAt,
      updatedAt: createdAt,
    });

    if (t.status === 'FAILED' || t.status === 'RECOVERED') {
      const prob = t.prob || (t.failReason === 'BANK_TIMEOUT' ? 88 : t.failReason === 'INSUFFICIENT_BALANCE' ? 74 : 48);
      const conf = t.conf || (prob >= 80 ? 'HIGH' : 'MEDIUM');
      const action = t.action || 'WAIT_AND_RETRY';

      const analysis = await RecoveryAnalysis.create({
        merchantId,
        transactionId: tx._id,
        customerId: customer._id,
        recoveryProbability: prob,
        confidence: conf,
        recommendedAction: action,
        expectedRecoveryAmount: Math.round((t.amount * prob) / 100),
        reasoning: `RecoverAI analyzed failure ${t.failReason || 'DROP'} on ${t.method}: ${customer.name} exhibits positive payment history with high salvage probability.`,
        factors: {
          failureReasonScore: prob >= 70 ? 70 : 40,
          customerHistoryScore: 12,
          paymentMethodScore: 5,
          merchantRecoveryScore: 6,
          repeatFailurePenalty: 0,
          customerSuccessRate: 85,
          customerTotalSpend: 25000,
          historicalAttemptsCount: 2,
        },
        createdAt,
        updatedAt: createdAt,
      });

      // If recovered or historical attempt
      if (t.status === 'RECOVERED') {
        const attempt = await RecoveryAttempt.create({
          merchantId,
          transactionId: tx._id,
          customerId: customer._id,
          analysisId: analysis._id,
          action,
          status: 'SUCCESS',
          attemptNumber: 1,
          paymentMethod: action === 'SUGGEST_ALTERNATE_METHOD' ? 'UPI' : t.method,
          amount: t.amount,
          resultMessage: 'Simulated payment completed and settled.',
          startedAt: createdAt,
          completedAt: new Date(createdAt.getTime() + 15 * 60 * 1000),
          metadata: { isAutonomous: prob >= 80 },
          createdAt,
          updatedAt: createdAt,
        });

        await Transaction.findByIdAndUpdate(tx._id, { recoveryAttemptId: attempt._id });

        await RecoveryEvent.create([
          {
            merchantId,
            transactionId: tx._id,
            recoveryAttemptId: attempt._id,
            eventType: 'RECOVERY_STARTED',
            message: `Initiated automated recovery strategy (${action}) for ₹${t.amount.toLocaleString()}.`,
            timestamp: createdAt,
          },
          {
            merchantId,
            transactionId: tx._id,
            recoveryAttemptId: attempt._id,
            eventType: 'ACTION_SELECTED',
            message: `Selected recovery action: ${action}.`,
            timestamp: new Date(createdAt.getTime() + 2 * 1000),
          },
          {
            merchantId,
            transactionId: tx._id,
            recoveryAttemptId: attempt._id,
            eventType: 'PAYMENT_RECOVERED',
            message: `Payment successfully salvaged! ₹${t.amount.toLocaleString()} settled to merchant account.`,
            timestamp: new Date(createdAt.getTime() + 15 * 60 * 1000),
          },
        ]);
      }
    }
  }

  console.log('✅ [Seed] Successfully populated realistic demo dataset.');
}

async function standaloneSeed() {
  try {
    await connectDB();
    const demoUser = await User.findOne({ email: 'demo@recoverai.io' });
    if (demoUser) {
      const merchant = await Merchant.findOne({ userId: demoUser._id });
      if (merchant) {
        await seedDemoDataForMerchant(merchant._id);
      }
    }
    await disconnectDB();
  } catch (e) {
    console.error('Standalone seed error:', e);
  }
}

if (require.main === module) {
  standaloneSeed();
}

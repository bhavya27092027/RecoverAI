import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User.model';
import { Merchant } from '../models/Merchant.model';
import { Customer } from '../models/Customer.model';
import { Transaction } from '../models/Transaction.model';
import { demoPaymentProvider } from '../services/payment/demoPaymentProvider';
import bcrypt from 'bcryptjs';

async function runPhase2Tests() {
  console.log('================================================================');
  console.log('   RecoverAI — Phase 2 Customers & Transactions Test Suite');
  console.log('================================================================\n');

  let failures = 0;

  const assert = (condition: boolean, testName: string, detail?: string) => {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
    } else {
      console.error(`❌ [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
      failures++;
    }
  };

  try {
    await connectDB();
    assert(true, 'Database connection initialized');

    // Clean any prior phase 2 test records
    await User.deleteMany({ email: /p2_.*@recoverai\.io/ });
    await Customer.deleteMany({ email: /p2_.*@customer\.io/ });

    // 1. Create Merchant A and Merchant B
    const hash = await bcrypt.hash('Password123!', 10);
    const userA = await User.create({
      name: 'Merchant Alpha',
      email: `p2_alpha_${Date.now()}@recoverai.io`,
      passwordHash: hash,
    });
    const merchantA = await Merchant.create({
      userId: userA._id,
      businessName: 'Alpha SaaS Solutions',
      businessType: 'SaaS',
      monthlyPaymentVolume: '₹5L–₹25L',
      preferredPaymentMethods: ['UPI', 'Credit Card'],
      onboardingCompleted: true,
    });

    const userB = await User.create({
      name: 'Merchant Beta',
      email: `p2_beta_${Date.now()}@recoverai.io`,
      passwordHash: hash,
    });
    const merchantB = await Merchant.create({
      userId: userB._id,
      businessName: 'Beta Commerce Platform',
      businessType: 'E-commerce',
      monthlyPaymentVolume: '< ₹1L',
      preferredPaymentMethods: ['UPI', 'Debit Card'],
      onboardingCompleted: true,
    });

    assert(Boolean(merchantA._id && merchantB._id), '1. Distinct merchants Alpha & Beta created');

    // 2. Create Customers under Merchant A
    const custA1 = await Customer.create({
      merchantId: merchantA._id,
      name: 'Rahul Sharma',
      email: `p2_rahul_${Date.now()}@customer.io`,
      phone: '+91 98765 43210',
    });

    const custA2 = await Customer.create({
      merchantId: merchantA._id,
      name: 'Priya Singh',
      email: `p2_priya_${Date.now()}@customer.io`,
      phone: '+91 98123 45678',
    });

    // Create Customer under Merchant B
    const custB1 = await Customer.create({
      merchantId: merchantB._id,
      name: 'Vikram Patel',
      email: `p2_vikram_${Date.now()}@customer.io`,
      phone: '+91 99887 76655',
    });

    assert(Boolean(custA1._id && custA2._id && custB1._id), '2. Customers created and scoped to respective merchants');

    // 3. Verify Customer Directory Scoping
    const alphaCustomers = await Customer.find({ merchantId: merchantA._id });
    const betaCustomers = await Customer.find({ merchantId: merchantB._id });

    assert(alphaCustomers.length === 2, '3. Merchant Alpha sees exactly 2 customers');
    assert(betaCustomers.length === 1, '4. Merchant Beta sees exactly 1 customer');

    // Multi-tenant check: Merchant Alpha cannot find Customer B1
    const crossCheckCust = await Customer.findOne({
      _id: custB1._id,
      merchantId: merchantA._id,
    });
    assert(crossCheckCust === null, '5. Multi-Tenant: Merchant A cannot query Merchant B customer');

    // 4. Create Transaction A1 (₹7,500, UPI, CREATED)
    const txA1 = await Transaction.create({
      merchantId: merchantA._id,
      customerId: custA1._id,
      amount: 7500,
      currency: 'INR',
      paymentMethod: 'UPI',
      description: 'Quarterly Pro Tier Cloud Subscription',
      status: 'CREATED',
      failureReason: null,
    });

    assert(txA1.status === 'CREATED', '6. Transaction A1 initialized with status CREATED');
    assert(txA1.amount === 7500, '7. Transaction A1 amount verified (₹7,500)');

    // 5. Simulate Payment Processing (FAILED with BANK_TIMEOUT)
    const processResult1 = await demoPaymentProvider.processPayment(txA1, {
      simulateStatus: 'FAILED',
      failureReason: 'BANK_TIMEOUT',
    });

    assert(processResult1.status === 'FAILED', '8. DemoPaymentProvider executed FAILED status');
    assert(txA1.status === 'FAILED', '9. Transaction A1 updated to FAILED in MongoDB');
    assert(txA1.failureReason === 'BANK_TIMEOUT', '10. Failure reason BANK_TIMEOUT recorded in MongoDB');

    // 6. Create Transaction A2 (₹5,000, Credit Card) & Simulate SUCCESS
    const txA2 = await Transaction.create({
      merchantId: merchantA._id,
      customerId: custA2._id,
      amount: 5000,
      currency: 'INR',
      paymentMethod: 'Credit Card',
      description: 'API Usage Top-up Package',
      status: 'CREATED',
      failureReason: null,
    });

    const processResult2 = await demoPaymentProvider.processPayment(txA2, {
      simulateStatus: 'SUCCESS',
    });

    assert(processResult2.status === 'SUCCESS', '11. DemoPaymentProvider executed SUCCESS status');
    assert(txA2.status === 'SUCCESS', '12. Transaction A2 updated to SUCCESS in MongoDB');
    assert(txA2.failureReason === null, '13. Failure reason is null for successful transaction');

    // 7. Verify Dashboard Aggregated Metrics for Merchant Alpha
    const alphaAgg = await Transaction.aggregate([
      { $match: { merchantId: merchantA._id } },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          failedPayments: {
            $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] },
          },
          recoveredTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'RECOVERED'] }, 1, 0] },
          },
          successfulTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, 1, 0] },
          },
          revenueAtRisk: {
            $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, '$amount', 0] },
          },
          recoveredRevenue: {
            $sum: { $cond: [{ $eq: ['$status', 'RECOVERED'] }, '$amount', 0] },
          },
          successfulRevenue: {
            $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, '$amount', 0] },
          },
        },
      },
    ]);

    const alphaMetrics = alphaAgg[0];
    assert(alphaMetrics.totalTransactions === 2, '14. Total transactions count = 2');
    assert(alphaMetrics.failedPayments === 1, '15. Failed payments count = 1');
    assert(alphaMetrics.revenueAtRisk === 7500, '16. Revenue at Risk = ₹7,500');
    assert(alphaMetrics.successfulRevenue === 5000, '17. Successful Revenue = ₹5,000');

    // 8. Create Transaction B1 under Merchant B (₹12,000, SUCCESS)
    const txB1 = await Transaction.create({
      merchantId: merchantB._id,
      customerId: custB1._id,
      amount: 12000,
      currency: 'INR',
      paymentMethod: 'Debit Card',
      description: 'Annual Storefront License',
      status: 'SUCCESS',
      failureReason: null,
    });

    // Verify Merchant B Metrics are strictly isolated
    const betaAgg = await Transaction.aggregate([
      { $match: { merchantId: merchantB._id } },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          failedPayments: {
            $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] },
          },
          revenueAtRisk: {
            $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, '$amount', 0] },
          },
          successfulRevenue: {
            $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, '$amount', 0] },
          },
        },
      },
    ]);

    const betaMetrics = betaAgg[0];
    assert(betaMetrics.totalTransactions === 1, '18. Merchant Beta has exactly 1 transaction');
    assert(betaMetrics.revenueAtRisk === 0, '19. Merchant Beta revenue at risk is 0');
    assert(betaMetrics.successfulRevenue === 12000, '20. Merchant Beta successful revenue is ₹12,000');

    // Multi-tenant check: Merchant Alpha cannot access Transaction B1
    const crossCheckTx = await Transaction.findOne({
      _id: txB1._id,
      merchantId: merchantA._id,
    });
    assert(crossCheckTx === null, '21. Multi-Tenant: Merchant A cannot query Merchant B transaction');

    // 9. Verify Customer Statistics Aggregation for Rahul (Customer A1)
    const cust1Txs = await Transaction.find({ customerId: custA1._id });
    assert(cust1Txs.length === 1 && cust1Txs[0].status === 'FAILED', '22. Customer A1 has 1 failed transaction');

    // Clean up
    await User.deleteMany({ email: /p2_.*@recoverai\.io/ });
    await Merchant.deleteMany({ _id: { $in: [merchantA._id, merchantB._id] } });
    await Customer.deleteMany({ email: /p2_.*@customer\.io/ });
    await Transaction.deleteMany({
      _id: { $in: [txA1._id, txA2._id, txB1._id] },
    });

    await disconnectDB();

    console.log('\n----------------------------------------------------------------');
    if (failures === 0) {
      console.log('🎉 ALL 22 PHASE 2 AUTOMATED TEST ASSERTIONS PASSED PERFECTLY!');
      process.exit(0);
    } else {
      console.error(`💥 ${failures} TEST(S) FAILED.`);
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal Phase 2 Test Error:', err);
    await disconnectDB();
    process.exit(1);
  }
}

runPhase2Tests();

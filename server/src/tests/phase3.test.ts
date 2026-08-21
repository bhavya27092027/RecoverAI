import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User.model';
import { Merchant } from '../models/Merchant.model';
import { Customer } from '../models/Customer.model';
import { Transaction } from '../models/Transaction.model';
import { RecoveryAnalysis } from '../models/RecoveryAnalysis.model';
import { recoveryEngine } from '../ai/recoveryEngine';
import { insightsService } from '../ai/insightsService';
import bcrypt from 'bcryptjs';

async function runPhase3Tests() {
  console.log('================================================================');
  console.log('   RecoverAI — Phase 3 AI Recovery Intelligence Test Suite');
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

    // Clean prior phase 3 test records
    await User.deleteMany({ email: /p3_.*@recoverai\.io/ });
    await Customer.deleteMany({ email: /p3_.*@customer\.io/ });

    // 1. Create Merchant A and Merchant B
    const hash = await bcrypt.hash('Password123!', 10);
    const userA = await User.create({
      name: 'Dr. Evelyn Reed',
      email: `p3_alpha_${Date.now()}@recoverai.io`,
      passwordHash: hash,
    });
    const merchantA = await Merchant.create({
      userId: userA._id,
      businessName: 'Quantum AI SaaS',
      businessType: 'SaaS',
      monthlyPaymentVolume: '₹5L–₹25L',
      preferredPaymentMethods: ['UPI', 'Credit Card'],
      onboardingCompleted: true,
    });

    const userB = await User.create({
      name: 'Marcus Vance',
      email: `p3_beta_${Date.now()}@recoverai.io`,
      passwordHash: hash,
    });
    const merchantB = await Merchant.create({
      userId: userB._id,
      businessName: 'Vance Logistics',
      businessType: 'Services',
      monthlyPaymentVolume: '< ₹1L',
      preferredPaymentMethods: ['UPI', 'Debit Card'],
      onboardingCompleted: true,
    });

    assert(Boolean(merchantA._id && merchantB._id), '1. Distinct merchants Alpha & Beta created');

    // TEST 1: Create failed transaction (₹7,500, UPI, BANK_TIMEOUT) & Analyze
    const cust1 = await Customer.create({
      merchantId: merchantA._id,
      name: 'Rahul Sharma',
      email: `p3_rahul_${Date.now()}@customer.io`,
      phone: '+91 98765 43210',
    });

    const tx1 = await Transaction.create({
      merchantId: merchantA._id,
      customerId: cust1._id,
      amount: 7500,
      currency: 'INR',
      paymentMethod: 'UPI',
      description: 'Quarterly Pro Cloud Subscription',
      status: 'FAILED',
      failureReason: 'BANK_TIMEOUT',
    });

    const analysis1 = await recoveryEngine.analyzePayment(tx1._id, merchantA._id);

    assert(analysis1.recoveryProbability >= 75, '2. Test 1: Bank Timeout generated high recovery probability (>=75%)');
    assert(
      analysis1.recommendedAction === 'RETRY_NOW' || analysis1.recommendedAction === 'WAIT_AND_RETRY',
      '3. Test 1: Recommendation is RETRY_NOW or WAIT_AND_RETRY'
    );
    assert(
      analysis1.expectedRecoveryAmount === Math.round((7500 * analysis1.recoveryProbability) / 100),
      '4. Test 1: Expected recovery amount formula matches (amount * prob / 100)'
    );
    assert(analysis1.reasoning.length > 50, '5. Test 1: Human-readable reasoning generated with context');

    const savedAnalysis1 = await RecoveryAnalysis.findOne({ transactionId: tx1._id });
    assert(savedAnalysis1 !== null, '6. Test 1: Analysis persisted in MongoDB');

    // TEST 2: Create failed transaction (₹5,000, Credit Card, CARD_DECLINED)
    const cust2 = await Customer.create({
      merchantId: merchantA._id,
      name: 'Amit Verma',
      email: `p3_amit_${Date.now()}@customer.io`,
      phone: '+91 98123 45678',
    });

    const tx2 = await Transaction.create({
      merchantId: merchantA._id,
      customerId: cust2._id,
      amount: 5000,
      currency: 'INR',
      paymentMethod: 'Credit Card',
      description: 'API Growth Top-up',
      status: 'FAILED',
      failureReason: 'CARD_DECLINED',
    });

    const analysis2 = await recoveryEngine.analyzePayment(tx2._id, merchantA._id);

    assert(
      analysis2.recoveryProbability < analysis1.recoveryProbability,
      '7. Test 2: Card Declined has lower recovery probability than Bank Timeout'
    );
    assert(
      analysis2.recommendedAction === 'SUGGEST_ALTERNATE_METHOD' ||
        analysis2.recommendedAction === 'STOP_RECOVERY',
      '8. Test 2: Card Declined recommends alternate payment rail or stop recovery'
    );

    // TEST 3: Customer with strong transaction history
    const cust3 = await Customer.create({
      merchantId: merchantA._id,
      name: 'Priya Patel',
      email: `p3_priya_${Date.now()}@customer.io`,
      phone: '+91 99887 76655',
    });

    // Create 5 previous successful transactions for Priya (Total spend: ₹35,000)
    for (let i = 0; i < 5; i++) {
      await Transaction.create({
        merchantId: merchantA._id,
        customerId: cust3._id,
        amount: 7000,
        currency: 'INR',
        paymentMethod: 'UPI',
        status: 'SUCCESS',
        failureReason: null,
      });
    }

    // Now Priya has a failed transaction (INSUFFICIENT_BALANCE)
    const tx3 = await Transaction.create({
      merchantId: merchantA._id,
      customerId: cust3._id,
      amount: 8000,
      currency: 'INR',
      paymentMethod: 'UPI',
      status: 'FAILED',
      failureReason: 'INSUFFICIENT_BALANCE',
    });

    const analysis3 = await recoveryEngine.analyzePayment(tx3._id, merchantA._id);

    assert(
      analysis3.factors.customerHistoryScore > 0,
      '9. Test 3: Strong customer history receives positive customerHistoryScore'
    );
    assert(
      analysis3.factors.customerSuccessRate === 100,
      '10. Test 3: Historical success rate correctly calculated as 100%'
    );
    assert(
      analysis3.confidence === 'HIGH',
      '11. Test 3: Customer with 5+ transactions achieves HIGH confidence'
    );
    assert(
      analysis3.recommendedAction === 'SEND_PAYMENT_LINK',
      '12. Test 3: Insufficient balance recommends SEND_PAYMENT_LINK'
    );

    // TEST 4: Brand-new customer with 0 prior history
    const cust4 = await Customer.create({
      merchantId: merchantA._id,
      name: 'Newbie User',
      email: `p3_newbie_${Date.now()}@customer.io`,
    });

    const tx4 = await Transaction.create({
      merchantId: merchantA._id,
      customerId: cust4._id,
      amount: 4000,
      currency: 'INR',
      paymentMethod: 'UPI',
      status: 'FAILED',
      failureReason: 'AUTHENTICATION_FAILURE',
    });

    const analysis4 = await recoveryEngine.analyzePayment(tx4._id, merchantA._id);

    assert(
      analysis4.confidence === 'LOW' || analysis4.confidence === 'MEDIUM',
      '13. Test 4: Brand-new customer evaluated with LOW/MEDIUM confidence'
    );
    assert(
      analysis4.factors.historicalAttemptsCount === 0,
      '14. Test 4: Historical attempts count recorded as 0'
    );

    // TEST 5: Multi-Tenant Isolation: Merchant B cannot analyze Merchant A transaction
    let crossTenantErrorCaught = false;
    try {
      await recoveryEngine.analyzePayment(tx1._id, merchantB._id);
    } catch (e: any) {
      crossTenantErrorCaught = true;
    }
    assert(
      crossTenantErrorCaught,
      '15. Test 5: Merchant B cannot analyze Merchant A transaction (Multi-tenant secured)'
    );

    // TEST 6: Re-analysis updates without creating duplicate records
    const reAnalysis1 = await recoveryEngine.analyzePayment(tx1._id, merchantA._id);
    const countAnalysesForTx1 = await RecoveryAnalysis.countDocuments({
      transactionId: tx1._id,
    });
    assert(
      countAnalysesForTx1 === 1,
      '16. Test 6: Re-analysis updates existing document (no duplicate analyses)'
    );
    assert(
      reAnalysis1._id.toString() === analysis1._id.toString(),
      '17. Test 6: Same document ID preserved on re-analysis'
    );

    // TEST 7: AI Insights service generates dynamic data-driven insights
    const insights = await insightsService.getMerchantInsights(merchantA._id);
    assert(insights.length >= 2, '18. Test 7: AI insights service returned multiple dynamic insights');
    assert(
      insights.some((i) => i.category === 'FAILURE_PATTERNS'),
      '19. Test 7: Failure pattern insight generated'
    );
    assert(
      insights.some((i) => i.category === 'RECOVERY_POTENTIAL'),
      '20. Test 7: Recovery potential pipeline insight generated'
    );

    // Clean up
    await User.deleteMany({ email: /p3_.*@recoverai\.io/ });
    await Merchant.deleteMany({ _id: { $in: [merchantA._id, merchantB._id] } });
    await Customer.deleteMany({ email: /p3_.*@customer\.io/ });
    await Transaction.deleteMany({
      _id: { $in: [tx1._id, tx2._id, tx3._id, tx4._id] },
    });
    await RecoveryAnalysis.deleteMany({
      _id: {
        $in: [analysis1._id, analysis2._id, analysis3._id, analysis4._id],
      },
    });

    await disconnectDB();

    console.log('\n----------------------------------------------------------------');
    if (failures === 0) {
      console.log('🎉 ALL 20 PHASE 3 AUTOMATED TEST ASSERTIONS PASSED PERFECTLY!');
      process.exit(0);
    } else {
      console.error(`💥 ${failures} TEST(S) FAILED.`);
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal Phase 3 Test Error:', err);
    await disconnectDB();
    process.exit(1);
  }
}

runPhase3Tests();

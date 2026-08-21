import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User.model';
import { Merchant } from '../models/Merchant.model';
import { Customer } from '../models/Customer.model';
import { Transaction } from '../models/Transaction.model';
import { RecoveryAnalysis } from '../models/RecoveryAnalysis.model';
import { RecoveryAttempt } from '../models/RecoveryAttempt.model';
import { Notification } from '../models/Notification.model';
import { analyticsService } from '../services/analytics.service';
import { insightsService } from '../ai/insightsService';
import bcrypt from 'bcryptjs';

async function runPhase5Tests() {
  console.log('================================================================');
  console.log('   RecoverAI — Phase 5 Analytics & AI Intelligence Test Suite');
  console.log('================================================================\n');

  let failures = 0;
  const assert = (condition: boolean, title: string, detail?: string) => {
    if (condition) {
      console.log(`✅ [PASS] ${title}`);
    } else {
      console.error(`❌ [FAIL] ${title}${detail ? ` -> ${detail}` : ''}`);
      failures++;
    }
  };

  try {
    await connectDB();
    assert(true, 'Database connection initialized');

    // Clean prior test records
    await User.deleteMany({ email: /p5_.*@recoverai\.io/ });
    await Customer.deleteMany({ email: /p5_.*@customer\.io/ });

    // 1. Create Distinct Merchants A and B
    const hash = await bcrypt.hash('Password123!', 10);
    const userA = await User.create({
      name: 'Analytics Lead Alpha',
      email: `p5_alpha_${Date.now()}@recoverai.io`,
      passwordHash: hash,
    });
    const merchantA = await Merchant.create({
      userId: userA._id,
      businessName: 'Alpha Analytics SaaS',
      businessType: 'SaaS',
      monthlyPaymentVolume: '₹5L–₹25L',
      preferredPaymentMethods: ['UPI', 'Credit Card'],
      onboardingCompleted: true,
    });

    const userB = await User.create({
      name: 'Analytics Lead Beta',
      email: `p5_beta_${Date.now()}@recoverai.io`,
      passwordHash: hash,
    });
    const merchantB = await Merchant.create({
      userId: userB._id,
      businessName: 'Beta Analytics Corp',
      businessType: 'Services',
      monthlyPaymentVolume: '< ₹1L',
      preferredPaymentMethods: ['UPI'],
      onboardingCompleted: true,
    });

    assert(Boolean(merchantA._id && merchantB._id), '1. Distinct merchants Alpha & Beta created');

    // TEST 1: Empty Analytics State for Merchant B (0 transactions)
    const emptyOverview = await analyticsService.getOverview(merchantB._id);
    assert(emptyOverview.totalTransactions === 0, '2. Test 1: Empty state totalTransactions = 0');
    assert(emptyOverview.totalVolume === 0, '3. Test 1: Empty state totalVolume = 0');
    assert(emptyOverview.recoveryRate === 0, '4. Test 1: Empty state recoveryRate = 0%');
    assert(emptyOverview.recoverySuccessRate === 0, '5. Test 1: Empty state recoverySuccessRate = 0%');

    const emptyInsights = await insightsService.getMerchantInsights(merchantB._id);
    assert(emptyInsights.length === 1, '6. Test 1: Empty state returns exactly 1 initial setup insight');
    assert(
      emptyInsights[0].title.includes('Start Processing Transactions'),
      '7. Test 1: Empty state displays start processing recommendation'
    );

    // TEST 2: Populate Merchant A with realistic data
    const cust1 = await Customer.create({
      merchantId: merchantA._id,
      name: 'Vikram Joshi',
      email: `p5_vikram_${Date.now()}@customer.io`,
    });
    const cust2 = await Customer.create({
      merchantId: merchantA._id,
      name: 'Pooja Hegde',
      email: `p5_pooja_${Date.now()}@customer.io`,
    });

    // 2 Successful transactions (₹10,000 + ₹15,000 = ₹25,000)
    await Transaction.create({
      merchantId: merchantA._id,
      customerId: cust1._id,
      amount: 10000,
      paymentMethod: 'UPI',
      status: 'SUCCESS',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    });
    await Transaction.create({
      merchantId: merchantA._id,
      customerId: cust2._id,
      amount: 15000,
      paymentMethod: 'Credit Card',
      status: 'SUCCESS',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    });

    // 1 Recovered transaction (₹12,000 Bank Timeout)
    const recTx = await Transaction.create({
      merchantId: merchantA._id,
      customerId: cust1._id,
      amount: 12000,
      paymentMethod: 'UPI',
      status: 'RECOVERED',
      failureReason: 'BANK_TIMEOUT',
      recoveredAmount: 12000,
      recoveredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    });

    const recAnalysis = await RecoveryAnalysis.create({
      merchantId: merchantA._id,
      transactionId: recTx._id,
      customerId: cust1._id,
      recoveryProbability: 85,
      confidence: 'HIGH',
      recommendedAction: 'WAIT_AND_RETRY',
      expectedRecoveryAmount: 10200,
      reasoning: 'Transient timeout',
      factors: {
        failureReasonScore: 80,
        customerHistoryScore: 10,
        paymentMethodScore: 5,
        merchantRecoveryScore: 5,
        repeatFailurePenalty: 0,
        customerSuccessRate: 100,
        customerTotalSpend: 22000,
        historicalAttemptsCount: 1,
      },
    });

    await RecoveryAttempt.create({
      merchantId: merchantA._id,
      transactionId: recTx._id,
      customerId: cust1._id,
      analysisId: recAnalysis._id,
      action: 'WAIT_AND_RETRY',
      status: 'SUCCESS',
      attemptNumber: 1,
      paymentMethod: 'UPI',
      amount: 12000,
      resultMessage: 'Recovered',
      metadata: { isAutonomous: true },
      startedAt: recTx.createdAt,
      completedAt: recTx.recoveredAt,
    });

    // 1 Active unrecovered failed transaction (₹8,000 Card Declined)
    const failTx = await Transaction.create({
      merchantId: merchantA._id,
      customerId: cust2._id,
      amount: 8000,
      paymentMethod: 'Credit Card',
      status: 'FAILED',
      failureReason: 'CARD_DECLINED',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    });

    await RecoveryAnalysis.create({
      merchantId: merchantA._id,
      transactionId: failTx._id,
      customerId: cust2._id,
      recoveryProbability: 45,
      confidence: 'MEDIUM',
      recommendedAction: 'SUGGEST_ALTERNATE_METHOD',
      expectedRecoveryAmount: 3600,
      reasoning: 'Card declined requires alternate rail',
      factors: {
        failureReasonScore: 35,
        customerHistoryScore: 10,
        paymentMethodScore: 0,
        merchantRecoveryScore: 0,
        repeatFailurePenalty: 0,
        customerSuccessRate: 50,
        customerTotalSpend: 15000,
        historicalAttemptsCount: 1,
      },
    });

    // TEST 3: Overview Calculations with Data
    const overview = await analyticsService.getOverview(merchantA._id);
    assert(overview.totalTransactions === 4, '8. Test 3: Total transactions = 4');
    assert(overview.totalVolume === 45000, '9. Test 3: Total volume = ₹45,000');
    assert(overview.successfulRevenue === 25000, '10. Test 3: Successful revenue = ₹25,000');
    assert(overview.recoveredRevenue === 12000, '11. Test 3: Recovered revenue = ₹12,000');
    assert(overview.revenueAtRisk === 8000, '12. Test 3: Revenue at risk = ₹8,000');
    assert(overview.potentialRecoverableRevenue === 3600, '13. Test 3: Potential recoverable revenue = ₹3,600');
    assert(overview.recoveryRate === 60, '14. Test 3: Recovery rate = 60% (12,000 / 20,000)');
    assert(overview.recoverySuccessRate === 100, '15. Test 3: Recovery success rate = 100% (1/1)');

    // TEST 4: Recovery Funnel
    const funnel = await analyticsService.getRecoveryFunnel(merchantA._id);
    assert(funnel.funnel.length === 6, '16. Test 4: Funnel has 6 stages');
    assert(funnel.funnel[0].count === 4, '17. Test 4: Stage 1 Total Transactions count = 4');
    assert(funnel.funnel[1].count === 2, '18. Test 4: Stage 2 Failed Payments count = 2');
    assert(funnel.funnel[5].amount === 12000, '19. Test 4: Stage 6 Recovered Revenue = ₹12,000');

    // TEST 5: Revenue Trends
    const trends = await analyticsService.getRevenueTrends(merchantA._id, '30D');
    assert(trends.points.length >= 3, '20. Test 5: Revenue trends returned points for distinct dates');

    // TEST 6: Failure Breakdown
    const failureBreakdown = await analyticsService.getFailureBreakdown(merchantA._id);
    assert(failureBreakdown.totalFailures === 2, '21. Test 6: Total failures = 2');
    const bankTimeoutReason = failureBreakdown.breakdown.find((b) => b.failureReason === 'BANK_TIMEOUT');
    assert(bankTimeoutReason?.count === 1, '22. Test 6: Bank Timeout count = 1');
    assert(bankTimeoutReason?.recoveredCount === 1, '23. Test 6: Bank Timeout recoveredCount = 1');

    // TEST 7: Payment Method Performance
    const railPerf = await analyticsService.getPaymentMethodPerformance(merchantA._id);
    assert(railPerf.breakdown.length === 4, '24. Test 7: 4 payment rails analyzed');
    assert(railPerf.bestPerformingMethod === 'UPI', '25. Test 7: Best performing method identified as UPI');

    // TEST 8: Recovery Strategy Performance
    const stratPerf = await analyticsService.getRecoveryStrategyPerformance(merchantA._id);
    const waitRetryStrat = stratPerf.breakdown.find((s) => s.action === 'WAIT_AND_RETRY');
    assert(waitRetryStrat?.attempts === 1, '26. Test 8: WAIT_AND_RETRY attempts = 1');
    assert(waitRetryStrat?.successfulRecoveries === 1, '27. Test 8: WAIT_AND_RETRY successfulRecoveries = 1');
    assert(waitRetryStrat?.revenueRecovered === 12000, '28. Test 8: WAIT_AND_RETRY revenueRecovered = ₹12,000');

    // TEST 9: Autonomous vs Human Comparison
    const autoComp = await analyticsService.getAutonomousVsHumanComparison(merchantA._id);
    assert(autoComp.autonomous.attempts === 1, '29. Test 9: Autonomous attempts = 1');
    assert(autoComp.autonomous.revenueRecovered === 12000, '30. Test 9: Autonomous revenueRecovered = ₹12,000');

    // TEST 10: Customer Segments
    const segments = await analyticsService.getCustomerSegments(merchantA._id);
    assert(
      segments.segments.HIGH_VALUE_HIGH_RECOVERY.count >= 1 ||
      segments.segments.LOW_VALUE_HIGH_RECOVERY.count >= 1,
      '31. Test 10: Customer segmented dynamically into recovery quadrant'
    );

    // TEST 11: AI Insights Generation
    const insights = await insightsService.getMerchantInsights(merchantA._id);
    assert(insights.length >= 3, '32. Test 11: Dynamic data generated >= 3 prioritized insights');
    assert(
      insights.some((i) => i.category === 'REVENUE' || i.category === 'RECOVERY_PERFORMANCE'),
      '33. Test 11: Revenue or performance insight generated with real data'
    );

    // Clean up
    await User.deleteMany({ email: /p5_.*@recoverai\.io/ });
    await Merchant.deleteMany({ _id: { $in: [merchantA._id, merchantB._id] } });
    await Customer.deleteMany({ email: /p5_.*@customer\.io/ });
    await Transaction.deleteMany({ merchantId: { $in: [merchantA._id, merchantB._id] } });
    await RecoveryAnalysis.deleteMany({ merchantId: { $in: [merchantA._id, merchantB._id] } });
    await RecoveryAttempt.deleteMany({ merchantId: { $in: [merchantA._id, merchantB._id] } });

    await disconnectDB();

    console.log('\n----------------------------------------------------------------');
    if (failures === 0) {
      console.log('🎉 ALL 33 PHASE 5 AUTOMATED TEST ASSERTIONS PASSED PERFECTLY!');
      process.exit(0);
    } else {
      console.error(`💥 ${failures} TEST(S) FAILED.`);
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal Phase 5 Test Error:', err);
    await disconnectDB();
    process.exit(1);
  }
}

runPhase5Tests();

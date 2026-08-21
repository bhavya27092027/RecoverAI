import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User.model';
import { Merchant } from '../models/Merchant.model';
import { Customer } from '../models/Customer.model';
import { Transaction } from '../models/Transaction.model';
import { RecoveryAnalysis } from '../models/RecoveryAnalysis.model';
import { RecoveryAttempt } from '../models/RecoveryAttempt.model';
import { RecoveryEvent } from '../models/RecoveryEvent.model';
import { PaymentLink } from '../models/PaymentLink.model';
import { recoveryEngine } from '../ai/recoveryEngine';
import { recoveryAgent } from '../recovery/recoveryAgent';
import { isEligibleForAutonomousExecution } from '../recovery/recoveryConfig';
import bcrypt from 'bcryptjs';

async function runPhase4Tests() {
  console.log('================================================================');
  console.log('   RecoverAI — Phase 4 Autonomous Recovery Agent Test Suite');
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

    // Clean prior test records
    await User.deleteMany({ email: /p4_.*@recoverai\.io/ });
    await Customer.deleteMany({ email: /p4_.*@customer\.io/ });

    // 1. Create Distinct Merchants A and B
    const hash = await bcrypt.hash('Password123!', 10);
    const userA = await User.create({
      name: 'Agent Lead Alpha',
      email: `p4_alpha_${Date.now()}@recoverai.io`,
      passwordHash: hash,
    });
    const merchantA = await Merchant.create({
      userId: userA._id,
      businessName: 'Alpha Fintech Labs',
      businessType: 'SaaS',
      monthlyPaymentVolume: '₹5L–₹25L',
      preferredPaymentMethods: ['UPI', 'Credit Card'],
      onboardingCompleted: true,
    });

    const userB = await User.create({
      name: 'Agent Lead Beta',
      email: `p4_beta_${Date.now()}@recoverai.io`,
      passwordHash: hash,
    });
    const merchantB = await Merchant.create({
      userId: userB._id,
      businessName: 'Beta Cloud Services',
      businessType: 'Services',
      monthlyPaymentVolume: '< ₹1L',
      preferredPaymentMethods: ['UPI'],
      onboardingCompleted: true,
    });

    assert(Boolean(merchantA._id && merchantB._id), '1. Distinct merchants Alpha & Beta created');

    // TEST 1: End-to-End Successful Recovery (Bank Timeout -> WAIT_AND_RETRY -> RECOVERED)
    const cust1 = await Customer.create({
      merchantId: merchantA._id,
      name: 'Rahul Sharma',
      email: `p4_rahul_${Date.now()}@customer.io`,
      phone: '+91 98765 43210',
    });

    // Create 3 successful transactions for Rahul to give HIGH confidence
    for (let i = 0; i < 3; i++) {
      await Transaction.create({
        merchantId: merchantA._id,
        customerId: cust1._id,
        amount: 5000,
        currency: 'INR',
        paymentMethod: 'UPI',
        status: 'SUCCESS',
      });
    }

    const tx1 = await Transaction.create({
      merchantId: merchantA._id,
      customerId: cust1._id,
      amount: 7500,
      currency: 'INR',
      paymentMethod: 'UPI',
      description: 'Annual Enterprise Plan',
      status: 'FAILED',
      failureReason: 'BANK_TIMEOUT',
    });

    const analysis1 = await recoveryEngine.analyzePayment(tx1._id, merchantA._id);
    assert(analysis1 !== null, '2. Test 1: AI Recovery Analysis generated for Rahul Sharma');

    const recoveryResult1 = await recoveryAgent.executeRecovery(tx1._id, merchantA._id);
    assert(recoveryResult1.success === true, '3. Test 1: Recovery Agent execution returned success');

    const updatedTx1 = await Transaction.findById(tx1._id);
    assert(updatedTx1?.status === 'RECOVERED', '4. Test 1: Transaction status transitioned to RECOVERED');
    assert(updatedTx1?.recoveredAmount === 7500, '5. Test 1: Transaction recoveredAmount recorded as ₹7,500');
    assert(updatedTx1?.failureReason === 'BANK_TIMEOUT', '6. Test 1: Original failure reason preserved');
    assert(updatedTx1?.recoveredAt !== null, '7. Test 1: recoveredAt timestamp recorded');

    const savedAttempt1 = await RecoveryAttempt.findOne({ transactionId: tx1._id });
    assert(savedAttempt1?.status === 'SUCCESS', '8. Test 1: RecoveryAttempt persisted with status SUCCESS');
    assert(savedAttempt1?.attemptNumber === 1, '9. Test 1: Attempt number recorded as 1');

    const events1 = await RecoveryEvent.find({ transactionId: tx1._id });
    assert(events1.length >= 4, '10. Test 1: Immutable RecoveryEvent audit trail recorded >= 4 events');
    assert(
      events1.some((e) => e.eventType === 'PAYMENT_RECOVERED'),
      '11. Test 1: PAYMENT_RECOVERED event found in audit log'
    );

    // TEST 2: Strict Idempotency Check
    let idempotencyCaught = false;
    try {
      await recoveryAgent.executeRecovery(tx1._id, merchantA._id);
    } catch (e: any) {
      if (e.message.includes('already been recovered')) {
        idempotencyCaught = true;
      }
    }
    assert(idempotencyCaught, '12. Test 2: Cannot re-execute recovery on already RECOVERED transaction');

    // TEST 3: Cannot execute recovery without analysis
    const txUnanalyzed = await Transaction.create({
      merchantId: merchantA._id,
      customerId: cust1._id,
      amount: 3000,
      currency: 'INR',
      paymentMethod: 'UPI',
      status: 'FAILED',
      failureReason: 'BANK_TIMEOUT',
    });

    let noAnalysisCaught = false;
    try {
      await recoveryAgent.executeRecovery(txUnanalyzed._id, merchantA._id);
    } catch (e: any) {
      if (e.message.includes('No AI recovery analysis found')) {
        noAnalysisCaught = true;
      }
    }
    assert(noAnalysisCaught, '13. Test 3: Recovery execution rejected when no analysis exists');

    // TEST 4: Failed recovery scenario (Card Declined direct retry fails)
    const cust2 = await Customer.create({
      merchantId: merchantA._id,
      name: 'Vikram Singh',
      email: `p4_vikram_${Date.now()}@customer.io`,
    });

    const tx2 = await Transaction.create({
      merchantId: merchantA._id,
      customerId: cust2._id,
      amount: 6000,
      currency: 'INR',
      paymentMethod: 'Credit Card',
      status: 'FAILED',
      failureReason: 'CARD_DECLINED',
    });

    // Artificially create a RETRY_NOW analysis to test failed execution handling
    const analysis2 = await RecoveryAnalysis.create({
      merchantId: merchantA._id,
      transactionId: tx2._id,
      customerId: cust2._id,
      recoveryProbability: 35,
      confidence: 'MEDIUM',
      recommendedAction: 'RETRY_NOW',
      expectedRecoveryAmount: 2100,
      reasoning: 'Testing decline retry',
      factors: {
        failureReasonScore: 35,
        customerHistoryScore: 0,
        paymentMethodScore: 0,
        merchantRecoveryScore: 0,
        repeatFailurePenalty: 0,
        customerSuccessRate: 0,
        customerTotalSpend: 0,
        historicalAttemptsCount: 0,
      },
    });

    const recoveryResult2 = await recoveryAgent.executeRecovery(tx2._id, merchantA._id);
    const updatedTx2 = await Transaction.findById(tx2._id);
    assert(updatedTx2?.status === 'FAILED', '14. Test 4: Failed recovery leaves transaction in FAILED status');
    assert(recoveryResult2.attempt.status === 'FAILED', '15. Test 4: RecoveryAttempt recorded status FAILED');

    // TEST 5: Alternate Payment recovery scenario (Card Declined -> Alternate payment with UPI -> SUCCESS)
    const altResult = await recoveryAgent.simulateAlternatePayment(tx2._id, merchantA._id, 'UPI');
    const updatedTx2AfterAlt = await Transaction.findById(tx2._id);
    assert(
      updatedTx2AfterAlt?.status === 'RECOVERED',
      '16. Test 5: Alternate payment simulation successfully transitions to RECOVERED'
    );
    assert(altResult.attempt.paymentMethod === 'UPI', '17. Test 5: RecoveryAttempt paymentMethod updated to UPI');

    // TEST 6: Payment Link recovery scenario (Insufficient Balance -> Payment Link -> Simulate Payment)
    const tx3 = await Transaction.create({
      merchantId: merchantA._id,
      customerId: cust2._id,
      amount: 4500,
      currency: 'INR',
      paymentMethod: 'UPI',
      status: 'FAILED',
      failureReason: 'INSUFFICIENT_BALANCE',
    });

    await RecoveryAnalysis.create({
      merchantId: merchantA._id,
      transactionId: tx3._id,
      customerId: cust2._id,
      recoveryProbability: 65,
      confidence: 'HIGH',
      recommendedAction: 'SEND_PAYMENT_LINK',
      expectedRecoveryAmount: 2925,
      reasoning: 'Send dynamic payment link',
      factors: {
        failureReasonScore: 65,
        customerHistoryScore: 0,
        paymentMethodScore: 0,
        merchantRecoveryScore: 0,
        repeatFailurePenalty: 0,
        customerSuccessRate: 0,
        customerTotalSpend: 0,
        historicalAttemptsCount: 0,
      },
    });

    const linkExecResult = await recoveryAgent.executeRecovery(tx3._id, merchantA._id);
    assert(linkExecResult.attempt.status === 'PENDING', '18. Test 6: Payment link execution creates PENDING attempt');
    assert(linkExecResult.paymentLink !== null, '19. Test 6: PaymentLink document created in MongoDB');

    // Simulate customer settling the link
    const custPayResult = await recoveryAgent.simulateCustomerPayment(tx3._id, merchantA._id);
    const updatedTx3 = await Transaction.findById(tx3._id);
    assert(updatedTx3?.status === 'RECOVERED', '20. Test 6: Transaction marked RECOVERED after customer payment');
    const updatedLink = await PaymentLink.findOne({ transactionId: tx3._id });
    assert(updatedLink?.status === 'PAID', '21. Test 6: PaymentLink status updated to PAID');

    // TEST 7: Autonomous eligibility policy helper check
    assert(
      isEligibleForAutonomousExecution(85, 'HIGH') === true,
      '22. Test 7: Score 85% with HIGH confidence is eligible for autonomous execution'
    );
    assert(
      isEligibleForAutonomousExecution(75, 'HIGH') === false,
      '23. Test 7: Score 75% requires merchant approval'
    );
    assert(
      isEligibleForAutonomousExecution(90, 'MEDIUM') === false,
      '24. Test 7: Score 90% with MEDIUM confidence requires merchant approval'
    );

    // TEST 8: Multi-Tenant Isolation
    let crossTenantExecutionCaught = false;
    try {
      await recoveryAgent.executeRecovery(tx3._id, merchantB._id);
    } catch (e: any) {
      crossTenantExecutionCaught = true;
    }
    assert(
      crossTenantExecutionCaught,
      '25. Test 8: Multi-Tenant: Merchant B cannot execute recovery on Merchant A transaction'
    );

    // Clean up
    await User.deleteMany({ email: /p4_.*@recoverai\.io/ });
    await Merchant.deleteMany({ _id: { $in: [merchantA._id, merchantB._id] } });
    await Customer.deleteMany({ email: /p4_.*@customer\.io/ });
    await Transaction.deleteMany({
      _id: { $in: [tx1._id, tx2._id, tx3._id, txUnanalyzed._id] },
    });
    await RecoveryAnalysis.deleteMany({
      _id: { $in: [analysis1._id, analysis2._id] },
    });
    await RecoveryAttempt.deleteMany({
      merchantId: { $in: [merchantA._id, merchantB._id] },
    });
    await RecoveryEvent.deleteMany({
      merchantId: { $in: [merchantA._id, merchantB._id] },
    });
    await PaymentLink.deleteMany({
      merchantId: { $in: [merchantA._id, merchantB._id] },
    });

    await disconnectDB();

    console.log('\n----------------------------------------------------------------');
    if (failures === 0) {
      console.log('🎉 ALL 25 PHASE 4 AUTOMATED TEST ASSERTIONS PASSED PERFECTLY!');
      process.exit(0);
    } else {
      console.error(`💥 ${failures} TEST(S) FAILED.`);
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal Phase 4 Test Error:', err);
    await disconnectDB();
    process.exit(1);
  }
}

runPhase4Tests();

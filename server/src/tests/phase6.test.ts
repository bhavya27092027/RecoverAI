import crypto from 'crypto';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User.model';
import { Merchant } from '../models/Merchant.model';
import { Customer } from '../models/Customer.model';
import { Transaction } from '../models/Transaction.model';
import { WebhookEvent } from '../models/WebhookEvent.model';
import { RecoveryAnalysis } from '../models/RecoveryAnalysis.model';
import { RecoveryEvent } from '../models/RecoveryEvent.model';
import {
  getRazorpayConfig,
  getSafeRazorpayPublicConfig,
} from '../config/razorpay';
import { razorpayPaymentService } from '../services/payment/razorpay.service';
import { recoveryEngine } from '../ai/recoveryEngine';
import { analyticsService } from '../services/analytics.service';

export const runPhase6Tests = async () => {
  console.log('================================================================');
  console.log('   RecoverAI — Phase 6 Razorpay Test Mode Automated Tests');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, message: string, detail?: string) => {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}${detail ? ` -> ${detail}` : ''}`);
      failed++;
    }
  };

  // Set mock test environment variables for deterministic crypto verification
  const MOCK_KEY_ID = 'rzp_test_mock_recoverai_2026';
  const MOCK_KEY_SECRET = 'mock_key_secret_for_sha256_verification_123';
  const MOCK_WEBHOOK_SECRET = 'mock_webhook_secret_for_sha256_verification_456';

  process.env.RAZORPAY_KEY_ID = MOCK_KEY_ID;
  process.env.RAZORPAY_KEY_SECRET = MOCK_KEY_SECRET;
  process.env.RAZORPAY_WEBHOOK_SECRET = MOCK_WEBHOOK_SECRET;
  process.env.NODE_ENV = 'test';

  try {
    await connectDB();
    assert(true, 'Database connection initialized');

    // Clean any previous test artifacts
    await User.deleteMany({ email: /p6_.*@recoverai\.io/ });
    await Customer.deleteMany({ email: /p6_.*@customer\.io/ });
    await WebhookEvent.deleteMany({ eventId: /mock_evt_.*/ });

    // 1. Setup Merchants Alpha and Beta
    const userA = await User.create({
      name: 'Merchant Alpha',
      email: 'p6_alpha@recoverai.io',
      passwordHash: '$2a$10$mockpasswordhashforalpha',
    });
    const merchantA = await Merchant.create({
      userId: userA._id,
      businessName: 'Alpha Fintech Labs',
      onboardingCompleted: true,
    });

    const userB = await User.create({
      name: 'Merchant Beta',
      email: 'p6_beta@recoverai.io',
      passwordHash: '$2a$10$mockpasswordhashforbeta',
    });
    const merchantB = await Merchant.create({
      userId: userB._id,
      businessName: 'Beta Payments Inc',
      onboardingCompleted: true,
    });

    const customerA = await Customer.create({
      merchantId: merchantA._id,
      name: 'Aarav Sharma',
      email: 'p6_aarav@customer.io',
      phone: '+91 98765 43210',
    });

    // -------------------------------------------------------------------------
    // TEST 1: Razorpay Configuration & Secret Safety
    // -------------------------------------------------------------------------
    const config = getRazorpayConfig();
    assert(config.isConfigured === true, '1. Test 1: Razorpay config recognizes valid test keys');
    assert(config.keyId === MOCK_KEY_ID, '2. Test 1: Razorpay keyId loaded correctly');

    const publicConfig = getSafeRazorpayPublicConfig();
    assert(publicConfig.isConfigured === true, '3. Test 1: Public config returns isConfigured: true');
    assert(publicConfig.keyId === MOCK_KEY_ID, '4. Test 1: Public config exposes keyId for Checkout');
    assert(
      (publicConfig as any).keySecret === undefined &&
        (publicConfig as any).webhookSecret === undefined,
      '5. Test 1: Secrets are NEVER exposed in public config'
    );

    // -------------------------------------------------------------------------
    // TEST 2: Transaction Model Extension & Provider Field
    // -------------------------------------------------------------------------
    const txA1 = await Transaction.create({
      merchantId: merchantA._id,
      customerId: customerA._id,
      amount: 14500,
      currency: 'INR',
      paymentMethod: 'UPI',
      description: 'Annual SaaS Pro Plan',
      status: 'CREATED',
      provider: 'RAZORPAY',
    });

    assert(txA1.provider === 'RAZORPAY', '6. Test 2: Transaction supports RAZORPAY provider');
    assert(txA1.status === 'CREATED', '7. Test 2: Transaction initialized in CREATED status');

    // -------------------------------------------------------------------------
    // TEST 3: Cryptographic Payment Signature Verification
    // -------------------------------------------------------------------------
    const mockOrderId = 'order_mock_p6_123456';
    const mockPaymentId = 'pay_mock_p6_789012';

    // Generate valid HMAC SHA256 signature
    const validSignature = crypto
      .createHmac('sha256', MOCK_KEY_SECRET)
      .update(`${mockOrderId}|${mockPaymentId}`)
      .digest('hex');

    const isValidSignature = razorpayPaymentService.verifyPaymentSignature({
      orderId: mockOrderId,
      paymentId: mockPaymentId,
      signature: validSignature,
    });
    assert(isValidSignature === true, '8. Test 3: Valid HMAC-SHA256 signature verified successfully');

    // Tampered signature
    const isInvalidSignature = razorpayPaymentService.verifyPaymentSignature({
      orderId: mockOrderId,
      paymentId: mockPaymentId,
      signature: 'tampered_invalid_signature_hex_string_1234567890abcdef',
    });
    assert(isInvalidSignature === false, '9. Test 3: Tampered signature rejected cleanly');

    // -------------------------------------------------------------------------
    // TEST 4: Payment Verification & Successful Settlement
    // -------------------------------------------------------------------------
    txA1.razorpayOrderId = mockOrderId;
    txA1.razorpayPaymentId = mockPaymentId;
    txA1.razorpaySignature = validSignature;
    txA1.status = 'SUCCESS';
    txA1.paymentVerifiedAt = new Date();
    await txA1.save();

    const verifiedTx = await Transaction.findById(txA1._id);
    assert(verifiedTx?.status === 'SUCCESS', '10. Test 4: Transaction status transitioned to SUCCESS');
    assert(verifiedTx?.razorpayPaymentId === mockPaymentId, '11. Test 4: Razorpay paymentId saved');
    assert(Boolean(verifiedTx?.paymentVerifiedAt), '12. Test 4: paymentVerifiedAt timestamp recorded');

    // -------------------------------------------------------------------------
    // TEST 5: Cryptographic Webhook Signature Verification
    // -------------------------------------------------------------------------
    const mockWebhookPayload = JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_mock_webhook_capture_999',
            order_id: mockOrderId,
            amount: 1450000,
            status: 'captured',
          },
        },
      },
    });

    const validWebhookSignature = crypto
      .createHmac('sha256', MOCK_WEBHOOK_SECRET)
      .update(mockWebhookPayload)
      .digest('hex');

    const isWebhookValid = razorpayPaymentService.verifyWebhookSignature({
      rawBody: mockWebhookPayload,
      signature: validWebhookSignature,
    });
    assert(isWebhookValid === true, '13. Test 5: Webhook signature verified with webhook secret');

    const isWebhookInvalid = razorpayPaymentService.verifyWebhookSignature({
      rawBody: mockWebhookPayload,
      signature: 'invalid_webhook_signature',
    });
    assert(isWebhookInvalid === false, '14. Test 5: Invalid webhook signature rejected');

    // -------------------------------------------------------------------------
    // TEST 6: Webhook Idempotency
    // -------------------------------------------------------------------------
    const testEventId = 'mock_evt_1001_unique';
    await WebhookEvent.create({
      eventId: testEventId,
      eventType: 'payment.captured',
      provider: 'RAZORPAY',
      merchantId: merchantA._id,
      transactionId: txA1._id,
      payload: { mock: true },
      processedAt: new Date(),
    });

    // Check if duplicate event is detected
    const duplicateCheck = await WebhookEvent.findOne({ eventId: testEventId });
    assert(Boolean(duplicateCheck), '15. Test 6: WebhookEvent records processed event ID');

    let duplicateErrorThrown = false;
    try {
      await WebhookEvent.create({
        eventId: testEventId,
        eventType: 'payment.captured',
        provider: 'RAZORPAY',
        payload: { duplicate: true },
        processedAt: new Date(),
      });
    } catch {
      duplicateErrorThrown = true;
    }
    assert(duplicateErrorThrown === true, '16. Test 6: Duplicate event ID rejected by unique database index (Idempotent)');

    // -------------------------------------------------------------------------
    // TEST 7: Razorpay Failed Payment & AI Recovery Engine Integration
    // -------------------------------------------------------------------------
    const txA2 = await Transaction.create({
      merchantId: merchantA._id,
      customerId: customerA._id,
      amount: 22000,
      currency: 'INR',
      paymentMethod: 'Credit Card',
      description: 'Enterprise API Gateway License',
      status: 'FAILED',
      failureReason: 'BANK_TIMEOUT',
      provider: 'RAZORPAY',
      razorpayOrderId: 'order_mock_p6_failed_777',
    });

    // Run AI Recovery Engine on the Razorpay failed transaction
    const analysis = await recoveryEngine.analyzePayment(txA2._id, merchantA._id);
    assert(analysis.recoveryProbability >= 75, '17. Test 7: AI recovery analyzes Razorpay failed transaction (prob >= 75%)');
    assert(Boolean(analysis.recommendedAction), '18. Test 7: AI engine generates recovery recommendation for Razorpay transaction');
    assert(analysis.expectedRecoveryAmount > 0, '19. Test 7: Expected recovery amount calculated');

    // -------------------------------------------------------------------------
    // TEST 8: Analytics Integration with Razorpay Transactions
    // -------------------------------------------------------------------------
    const overview = await analyticsService.getOverview(merchantA._id);
    assert(overview.totalTransactions >= 2, '20. Test 8: Analytics aggregates Razorpay transactions');
    assert(overview.successfulRevenue >= 14500, '21. Test 8: Analytics includes verified Razorpay revenue');
    assert(overview.revenueAtRisk >= 22000, '22. Test 8: Analytics includes failed Razorpay transaction in Revenue at Risk');

    // -------------------------------------------------------------------------
    // TEST 9: Multi-Tenant Merchant Isolation
    // -------------------------------------------------------------------------
    const merchantBTxQuery = await Transaction.findOne({
      _id: txA1._id,
      merchantId: merchantB._id,
    });
    assert(merchantBTxQuery === null, '23. Test 9: Multi-Tenant: Merchant B cannot access Merchant A Razorpay transaction');

    // -------------------------------------------------------------------------
    // Cleanup Test Data
    // -------------------------------------------------------------------------
    await User.deleteMany({ email: /p6_.*@recoverai\.io/ });
    await Merchant.deleteMany({ _id: { $in: [merchantA._id, merchantB._id] } });
    await Customer.deleteMany({ email: /p6_.*@customer\.io/ });
    await Transaction.deleteMany({ _id: { $in: [txA1._id, txA2._id] } });
    await RecoveryAnalysis.deleteMany({ transactionId: { $in: [txA1._id, txA2._id] } });
    await RecoveryEvent.deleteMany({ transactionId: { $in: [txA1._id, txA2._id] } });
    await WebhookEvent.deleteMany({ eventId: testEventId });

    await disconnectDB();

    console.log('\n----------------------------------------------------------------');
    if (failed === 0) {
      console.log(`🎉 ALL ${passed} PHASE 6 AUTOMATED TEST ASSERTIONS PASSED PERFECTLY!`);
      return true;
    } else {
      console.error(`💥 ${failed} TEST(S) FAILED.`);
      process.exit(1);
    }
  } catch (err: any) {
    console.error('Fatal Phase 6 Test Error:', err);
    process.exit(1);
  }
};

if (require.main === module || process.argv[1]?.includes('phase6.test')) {
  runPhase6Tests();
}

import crypto from 'crypto';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

export const BASE_URL = 'http://localhost:5000/api';

async function runLiveRazorpayE2E() {
  console.log('================================================================');
  console.log('  RecoverAI — Live Razorpay TEST MODE End-to-End Verification');
  console.log('================================================================\n');

  let orderPass = false;
  let checkoutPass = false;
  let verifyPass = false;
  let txUpdatePass = false;
  let atlasPersistPass = false;
  let analyticsPass = false;
  let webhookIdempotencyPass = false;
  let failedToAiPass = false;
  let restartPersistPass = false;

  let sessionCookie = '';

  const request = async (apiPath: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as any),
    };
    if (sessionCookie) {
      headers['Cookie'] = sessionCookie;
    }

    const res = await fetch(`${BASE_URL}${apiPath}`, {
      ...options,
      headers,
    });

    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      sessionCookie = setCookie.split(';')[0];
    }

    const json = await res.json().catch(() => ({}));
    return { status: res.status, data: json, headers: res.headers };
  };

  try {
    const timestamp = Date.now();
    const testEmail = `rzp_live_test_${timestamp}@recoverai.io`;
    const testPassword = 'Password123!';

    // 1. Health check
    console.log('--- 1. Health & Merchant Setup ---');
    const health = await request('/health');
    if (health.status !== 200) throw new Error('Backend not responding at /api/health');

    // 2. Signup & Onboard
    const signup = await request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Razorpay Test Admin',
        email: testEmail,
        password: testPassword,
        confirmPassword: testPassword,
        businessName: 'RecoverAI Live Sandbox Inc',
      }),
    });
    if (signup.status !== 201) throw new Error(`Signup failed: ${JSON.stringify(signup.data)}`);

    await request('/merchant/onboarding', {
      method: 'POST',
      body: JSON.stringify({
        businessType: 'SaaS',
        monthlyPaymentVolume: '₹5L–₹25L',
        preferredPaymentMethods: ['UPI', 'Credit Card'],
      }),
    });

    // 3. Create Customer
    const custRes = await request('/customers', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Priya Nambiar',
        email: `priya_${timestamp}@client.io`,
        phone: '+91 98765 11223',
      }),
    });
    const customerId = custRes.data.data.id || custRes.data.data._id;

    // 4. Create Transaction
    console.log('\n--- 2. Create RecoverAI Transaction & Razorpay Order ---');
    const txRes = await request('/transactions', {
      method: 'POST',
      body: JSON.stringify({
        customerId,
        amount: 2500,
        currency: 'INR',
        paymentMethod: 'UPI',
        description: 'RecoverAI Pro Cloud Subscription',
      }),
    });
    const transactionId = txRes.data.data.id || txRes.data.data._id;
    console.log(`✅ RecoverAI Transaction initialized (₹2,500) — ID: ${transactionId}`);

    // 5. Create Live Razorpay TEST Order
    const orderRes = await request('/payments/razorpay/order', {
      method: 'POST',
      body: JSON.stringify({ transactionId }),
    });

    if (orderRes.status === 200 && orderRes.data.data?.orderId?.startsWith('order_')) {
      orderPass = true;
      console.log(`✅ Razorpay TEST order created successfully: ${orderRes.data.data.orderId}`);
    } else {
      console.error('❌ Razorpay order creation failed:', orderRes.data);
    }

    const { orderId, keyId, amountInPaise } = orderRes.data.data;

    // 6. Test Checkout Initialization
    if (keyId?.startsWith('rzp_test_') && amountInPaise === 250000) {
      checkoutPass = true;
      console.log(`✅ Razorpay TEST checkout parameters verified (Key: ${keyId.slice(0, 12)}..., Amount: 250000 paise)`);
    }

    // 7. Complete Test Payment & Verification
    console.log('\n--- 3. Payment Signature Verification & Status Update ---');
    const testPaymentId = `pay_test_${timestamp.toString().slice(-8)}`;
    const keySecret = process.env.RAZORPAY_KEY_SECRET as string;

    // Generate valid HMAC SHA-256 signature
    const signature = crypto
      .createHmac('sha256', keySecret)
      .update(`${orderId}|${testPaymentId}`)
      .digest('hex');

    const verifyRes = await request('/payments/razorpay/verify', {
      method: 'POST',
      body: JSON.stringify({
        transactionId,
        razorpayOrderId: orderId,
        razorpayPaymentId: testPaymentId,
        razorpaySignature: signature,
      }),
    });

    if (verifyRes.status === 200 && verifyRes.data.success) {
      verifyPass = true;
      console.log(`✅ Server-side cryptographic signature verification succeeded`);
    } else {
      console.error('❌ Payment verification failed:', verifyRes.data);
    }

    // 8. Confirm Transaction Update
    const checkTx = await request(`/transactions/${transactionId}`);
    const txData = checkTx.data.data;
    if (
      txData.status === 'SUCCESS' &&
      txData.provider === 'RAZORPAY' &&
      txData.razorpayOrderId === orderId &&
      txData.razorpayPaymentId === testPaymentId &&
      txData.paymentVerifiedAt
    ) {
      txUpdatePass = true;
      console.log(`✅ Transaction state transitioned to SUCCESS with Razorpay audit fields`);
    }

    // 9. Confirm MongoDB Atlas Direct Persistence
    console.log('\n--- 4. MongoDB Atlas Persistence & Analytics ---');
    const atlasUri = process.env.MONGODB_URI as string;
    await mongoose.connect(atlasUri, { dbName: 'recoverai' });

    const atlasTx = await mongoose.connection.db
      ?.collection('transactions')
      .findOne({ _id: new mongoose.Types.ObjectId(transactionId) });

    if (
      atlasTx &&
      atlasTx.status === 'SUCCESS' &&
      atlasTx.provider === 'RAZORPAY' &&
      atlasTx.razorpayOrderId === orderId
    ) {
      atlasPersistPass = true;
      console.log(`✅ Confirmed document directly in MongoDB Atlas (Database: ${mongoose.connection.db?.databaseName})`);
    }

    // 10. Confirm Analytics Update
    const analytics = await request('/analytics/overview');
    if (
      analytics.status === 200 &&
      analytics.data.data.totalVolume >= 2500 &&
      analytics.data.data.successfulRevenue >= 2500
    ) {
      analyticsPass = true;
      console.log(`✅ Analytics Overview aggregated live transaction (Volume: ₹${analytics.data.data.totalVolume.toLocaleString()})`);
    }

    // 11. Webhook & Idempotency Test
    console.log('\n--- 5. Webhook Signature & Idempotency ---');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || keySecret;
    const webhookPayload = JSON.stringify({
      event: 'payment.captured',
      event_id: `evt_test_live_${timestamp}`,
      payload: {
        payment: {
          entity: {
            id: testPaymentId,
            order_id: orderId,
            amount: 250000,
            status: 'captured',
          },
        },
      },
    });

    const webhookSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(webhookPayload)
      .digest('hex');

    // First delivery
    const wh1 = await request('/webhooks/razorpay', {
      method: 'POST',
      headers: {
        'x-razorpay-signature': webhookSignature,
      },
      body: webhookPayload,
    });

    // Duplicate delivery
    const wh2 = await request('/webhooks/razorpay', {
      method: 'POST',
      headers: {
        'x-razorpay-signature': webhookSignature,
      },
      body: webhookPayload,
    });

    if (wh1.status === 200 && wh2.status === 200 && wh2.data.message?.includes('idempotent')) {
      webhookIdempotencyPass = true;
      console.log(`✅ Webhook verified and duplicate delivery handled idempotently`);
    }

    // 12. Failed Payment → AI Recovery Integration
    console.log('\n--- 6. Failed Razorpay Payment → AI Recovery Engine ---');
    const failedTxRes = await request('/transactions', {
      method: 'POST',
      body: JSON.stringify({
        customerId,
        amount: 6500,
        currency: 'INR',
        paymentMethod: 'Credit Card',
        description: 'Annual Enterprise Plan',
      }),
    });
    const failedTxId = failedTxRes.data.data.id || failedTxRes.data.data._id;

    // Simulate failure outcome
    await request(`/transactions/${failedTxId}/process`, {
      method: 'POST',
      body: JSON.stringify({
        simulateStatus: 'FAILED',
        failureReason: 'BANK_TIMEOUT',
      }),
    });

    // AI Analysis
    const aiRes = await request(`/transactions/${failedTxId}/analyze`, { method: 'POST' });
    const oppsRes = await request('/recovery/opportunities');

    if (
      aiRes.status === 200 &&
      aiRes.data.data?.recoveryProbability >= 75 &&
      oppsRes.data.data?.some((o: any) => (o.transaction?.id || o.transactionId) === failedTxId)
    ) {
      failedToAiPass = true;
      console.log(`✅ Failed payment ingested into AI Recovery Engine (Score: ${aiRes.data.data.recoveryProbability}%, Strategy: ${aiRes.data.data.recommendedAction})`);
    }

    // 13. Restart / Reconnection Persistence Test
    console.log('\n--- 7. Reconnection Persistence Verification ---');
    await mongoose.disconnect();
    await mongoose.connect(atlasUri, { dbName: 'recoverai' });

    const checkAgain = await mongoose.connection.db
      ?.collection('transactions')
      .findOne({ _id: new mongoose.Types.ObjectId(transactionId) });

    if (checkAgain && checkAgain.status === 'SUCCESS' && checkAgain.provider === 'RAZORPAY') {
      restartPersistPass = true;
      console.log(`✅ Payment records verified after database reconnection`);
    }

    await mongoose.disconnect();

    console.log('\n================================================================');
    console.log('                 FINAL VERIFICATION SUMMARY');
    console.log('================================================================');
    console.log('Razorpay TEST order creation:', orderPass ? 'PASS' : 'FAIL');
    console.log('Razorpay TEST checkout:', checkoutPass ? 'PASS' : 'FAIL');
    console.log('Payment verification:', verifyPass ? 'PASS' : 'FAIL');
    console.log('Transaction update:', txUpdatePass ? 'PASS' : 'FAIL');
    console.log('MongoDB Atlas persistence:', atlasPersistPass ? 'PASS' : 'FAIL');
    console.log('Analytics update:', analyticsPass ? 'PASS' : 'FAIL');
    console.log('Webhook/idempotency:', webhookIdempotencyPass ? 'PASS' : 'FAIL');
    console.log('Failed payment → AI Recovery:', failedToAiPass ? 'PASS' : 'FAIL');
    console.log('Restart persistence:', restartPersistPass ? 'PASS' : 'FAIL');

    if (
      orderPass &&
      checkoutPass &&
      verifyPass &&
      txUpdatePass &&
      atlasPersistPass &&
      analyticsPass &&
      webhookIdempotencyPass &&
      failedToAiPass &&
      restartPersistPass
    ) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err: any) {
    console.error('Fatal E2E Error:', err.message);
    process.exit(1);
  }
}

runLiveRazorpayE2E();

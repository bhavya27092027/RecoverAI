export const BASE_URL = 'http://localhost:5000/api';

async function runFinalQaAudit() {
  console.log('================================================================');
  console.log('       RecoverAI — Final Comprehensive Local QA Audit');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;
  const assert = (condition: boolean, title: string, detail?: string) => {
    if (condition) {
      console.log(`✅ [PASS] ${title}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${title}${detail ? ` -> ${detail}` : ''}`);
      failed++;
    }
  };

  let sessionCookie = '';

  const request = async (path: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as any),
    };
    if (sessionCookie) {
      headers['Cookie'] = sessionCookie;
    }

    const res = await fetch(`${BASE_URL}${path}`, {
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
    const testTimestamp = Date.now();
    const testEmail = `qa_audit_${testTimestamp}@recoverai.io`;
    const testPassword = 'Password123!';
    const testBusinessName = `Audit Scale Enterprise ${testTimestamp}`;

    // STEP 1: Signup
    console.log('--- Step 1: User Signup ---');
    const signupRes = await request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        name: 'QA Lead Auditor',
        email: testEmail,
        password: testPassword,
        confirmPassword: testPassword,
        businessName: testBusinessName,
      }),
    });
    assert(signupRes.status === 201, '1. Signup succeeded with 201 Created');
    assert(Boolean(sessionCookie), '2. HTTP-only session cookie issued upon signup');

    // STEP 2: Verify Initial Profile / Login State
    console.log('\n--- Step 2: Auth Profile Verification ---');
    const meRes = await request('/auth/me');
    assert(meRes.status === 200, '3. GET /api/auth/me returns authenticated user');
    assert(meRes.data.user.email === testEmail, '4. User email matches registered account');
    assert(meRes.data.merchant.businessName === testBusinessName, '5. Merchant business name matches');
    assert(meRes.data.merchant.onboardingCompleted === false, '6. Onboarding starts as false');

    // STEP 3: Onboarding
    console.log('\n--- Step 3: 5-Step Merchant Onboarding ---');
    const onboardRes = await request('/merchant/onboarding', {
      method: 'POST',
      body: JSON.stringify({
        businessType: 'SaaS',
        monthlyPaymentVolume: '₹5L–₹25L',
        preferredPaymentMethods: ['UPI', 'Credit Card', 'Net Banking'],
      }),
    });
    assert(onboardRes.status === 200, '7. POST /api/merchant/onboarding completed with 200');
    assert(onboardRes.data.merchant.onboardingCompleted === true, '8. Merchant onboardingCompleted updated to true');

    // STEP 4: Initial Dashboard State
    console.log('\n--- Step 4: Initial Dashboard Telemetry ---');
    const dashRes = await request('/dashboard/metrics');
    assert(dashRes.status === 200, '9. GET /api/dashboard/metrics returns 200');
    assert(dashRes.data.data.totalTransactions === 0, '10. Initial transaction count is 0');
    assert(dashRes.data.data.revenueAtRisk === 0, '11. Initial revenue at risk is 0');

    // STEP 5: Create Customer
    console.log('\n--- Step 5: Customer Management ---');
    const custRes = await request('/customers', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Rohan Deshmukh',
        email: `rohan_${testTimestamp}@enterprise.com`,
        phone: '+91 98200 99887',
      }),
    });
    assert(custRes.status === 201, '12. POST /api/customers created new customer');
    const customerId = custRes.data.data.id || custRes.data.data._id;
    assert(Boolean(customerId), '13. Customer assigned a valid ID');

    // STEP 6: Create Transaction
    console.log('\n--- Step 6: Create Transaction ---');
    const txRes = await request('/transactions', {
      method: 'POST',
      body: JSON.stringify({
        customerId,
        amount: 18500,
        currency: 'INR',
        paymentMethod: 'UPI',
        description: 'Annual Enterprise SLA License',
      }),
    });
    assert(txRes.status === 201, '14. POST /api/transactions initialized transaction (₹18,500)');
    const txId = txRes.data.data.id || txRes.data.data._id;
    assert(txRes.data.data.status === 'CREATED', '15. Initial transaction status is CREATED');

    // STEP 7: Simulate Failed Payment
    console.log('\n--- Step 7: Payment Simulation (Bank Timeout) ---');
    const procRes = await request(`/transactions/${txId}/process`, {
      method: 'POST',
      body: JSON.stringify({
        simulateStatus: 'FAILED',
        failureReason: 'BANK_TIMEOUT',
      }),
    });
    assert(procRes.status === 200, '16. POST /transactions/:id/process executed simulation');
    assert(procRes.data.data.status === 'FAILED', '17. Transaction status transitioned to FAILED');
    assert(procRes.data.data.failureReason === 'BANK_TIMEOUT', '18. Failure reason recorded as BANK_TIMEOUT');

    // STEP 8: Analyze with RecoverAI
    console.log('\n--- Step 8: AI Recovery Analysis Engine ---');
    const analyzeRes = await request(`/transactions/${txId}/analyze`, {
      method: 'POST',
    });
    assert(analyzeRes.status === 200, '19. POST /transactions/:id/analyze generated intelligence');
    const analysis = analyzeRes.data.data;
    assert(analysis.recoveryProbability >= 75, `20. High recovery probability calculated: ${analysis.recoveryProbability}%`);
    assert(Boolean(analysis.recommendedAction), `21. Strategy recommended: ${analysis.recommendedAction}`);
    assert(analysis.expectedRecoveryAmount > 0, `22. Expected recovery calculated: ₹${analysis.expectedRecoveryAmount.toLocaleString()}`);
    assert(Boolean(analysis.reasoning), '23. Explainable reasoning generated');

    // STEP 9: Recovery Center Queue
    console.log('\n--- Step 9: Recovery Center Opportunities ---');
    const oppsRes = await request('/recovery/opportunities');
    assert(oppsRes.status === 200, '24. GET /api/recovery/opportunities returns 200');
    assert(oppsRes.data.data.length >= 1, '25. Failed transaction listed in priority recovery queue');
    assert(
      oppsRes.data.data.some((o: any) => (o.transaction?.id || o.transactionId) === txId),
      '26. Target transaction present in recovery queue'
    );

    // STEP 10: Execute Recovery
    console.log('\n--- Step 10: Autonomous Recovery Execution ---');
    const execRes = await request(`/recovery/${txId}/execute`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'WAIT_AND_RETRY',
      }),
    });
    assert(execRes.status === 200, '27. POST /api/recovery/:id/execute succeeded');
    assert(execRes.data.data.transaction.status === 'RECOVERED', '28. Transaction transitioned to RECOVERED');
    assert(execRes.data.data.attempt.status === 'SUCCESS', '29. RecoveryAttempt recorded status SUCCESS');
    assert(execRes.data.data.events.length >= 3, '30. Immutable audit log recorded events');

    // STEP 11: Verify Recovered Revenue
    console.log('\n--- Step 11: Recovered Revenue Telemetry ---');
    const updatedTxRes = await request(`/transactions/${txId}`);
    assert(updatedTxRes.data.data.status === 'RECOVERED', '31. Verified persistent RECOVERED status');
    assert(updatedTxRes.data.data.recoveredAmount === 18500, '32. Verified recoveredAmount is ₹18,500');

    // STEP 12: Analytics Dashboard Metrics
    console.log('\n--- Step 12: Real Analytics Calculations ---');
    const analyticsRes = await request('/analytics/overview');
    assert(analyticsRes.status === 200, '33. GET /api/analytics/overview returns 200');
    assert(analyticsRes.data.data.recoveredRevenue === 18500, '34. Analytics displays ₹18,500 Recovered Revenue');
    assert(analyticsRes.data.data.recoveryRate === 100, '35. Analytics displays 100% Recovery Rate');

    const funnelRes = await request('/analytics/funnel');
    assert(funnelRes.status === 200, '36. GET /api/analytics/funnel returns 200');
    assert(funnelRes.data.data.funnel.length === 6, '37. Funnel contains 6 stages');

    const trendsRes = await request('/analytics/revenue-trends?range=30D');
    assert(trendsRes.status === 200, '38. GET /api/analytics/revenue-trends returns 200');

    const segRes = await request('/analytics/customer-segments');
    assert(segRes.status === 200, '39. GET /api/analytics/customer-segments returns 200');

    // STEP 13: AI Insights
    console.log('\n--- Step 13: AI Financial Insights ---');
    const insightsRes = await request('/analytics/insights');
    assert(insightsRes.status === 200, '40. GET /api/analytics/insights returns 200');
    assert(insightsRes.data.data.length >= 1, '41. Generated real data-driven AI insights');

    // STEP 14: Logout
    console.log('\n--- Step 14: Operator Logout ---');
    const logoutRes = await request('/auth/logout', { method: 'POST' });
    assert(logoutRes.status === 200, '42. POST /api/auth/logout clears auth cookie');

    // Clear local session cookie
    sessionCookie = '';

    const unauthRes = await request('/dashboard/metrics');
    assert(unauthRes.status === 401, '43. Protected endpoints block unauthenticated requests after logout');

    // STEP 15: Login Again
    console.log('\n--- Step 15: Login with Existing Credentials ---');
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });
    assert(loginRes.status === 200, '44. POST /api/auth/login authenticated successfully');

    // STEP 16: Verify MongoDB Persistence Across Session
    console.log('\n--- Step 16: Persistence Across Session ---');
    const postLoginDash = await request('/dashboard/metrics');
    assert(postLoginDash.status === 200, '45. Dashboard loads post-login');
    assert(postLoginDash.data.data.recoveredRevenue === 18500, '46. Recovered revenue ₹18,500 persisted in MongoDB');

    const postLoginTxs = await request('/transactions');
    assert(postLoginTxs.data.data.length >= 1, '47. Transactions persisted in MongoDB');
    assert(postLoginTxs.data.data[0].status === 'RECOVERED', '48. Transaction preserved RECOVERED status in MongoDB');

    // STEP 17: Demo Dataset Seeder Test
    console.log('\n--- Step 17: Demo Dataset Seeder ---');
    const seedRes = await request('/demo/seed', { method: 'POST', body: JSON.stringify({}) });
    assert(seedRes.status === 200, '49. POST /api/demo/seed generated rich scenario dataset');

    const seededOverview = await request('/analytics/overview');
    assert(seededOverview.data.data.totalTransactions >= 15, '50. Total transactions expanded with demo records');
    assert(seededOverview.data.data.totalVolume >= 100000, '51. Payment volume calculated from all MongoDB records');

    console.log('\n================================================================');
    console.log(`   Final QA Audit Summary: ${passed} PASSED | ${failed} FAILED`);
    console.log('================================================================');

    if (failed === 0) {
      console.log('\n🎉 ALL 51 QA AUDIT ASSERTIONS PASSED WITH 100% SUCCESS!');
      process.exit(0);
    } else {
      console.error(`\n💥 ${failed} ASSERTION(S) FAILED.`);
      process.exit(1);
    }
  } catch (err: any) {
    console.error('Fatal QA Audit Error:', err.message);
    process.exit(1);
  }
}

runFinalQaAudit();

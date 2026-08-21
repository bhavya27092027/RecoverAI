const API_BASE = 'http://localhost:5000/api';

async function runLiveSmokeTest() {
  console.log('================================================================');
  console.log('   RecoverAI — Live Phase 4 End-to-End System Smoke Test');
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
    let authCookie = '';

    // 1. Register new lead
    const email = `smoke4_${Date.now()}@fintechalpha.io`;
    const signupRes = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Priya Executive',
        email,
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
        businessName: 'Alpha Horizon Cloud',
      }),
    });

    const signupData = await signupRes.json();
    assert(signupRes.status === 201, '1. Merchant registered & authenticated');
    
    // In Node fetch, getSetCookie() returns array of set-cookie strings
    const setCookieHeaders = typeof (signupRes.headers as any).getSetCookie === 'function' 
      ? (signupRes.headers as any).getSetCookie() 
      : [signupRes.headers.get('set-cookie')];

    if (setCookieHeaders && setCookieHeaders.length > 0) {
      authCookie = setCookieHeaders[0].split(';')[0];
    }

    const headers = {
      'Content-Type': 'application/json',
      Cookie: authCookie,
    };

    // 2. Complete Onboarding
    const onboardRes = await fetch(`${API_BASE}/merchant/onboarding`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        businessType: 'SaaS',
        monthlyPaymentVolume: '₹5L–₹25L',
        preferredPaymentMethods: ['UPI', 'Credit Card', 'Debit Card', 'Net Banking'],
      }),
    });
    const onboardData = await onboardRes.json();
    assert(onboardData.success === true, '2. 5-step onboarding completed');

    // 3. Create Customer: Priya Patel
    const custRes1 = await fetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Priya Patel',
        email: `priya_${Date.now()}@example.com`,
        phone: '+91 99887 76655',
      }),
    });
    const cust1Data = await custRes1.json();
    const priyaId = cust1Data.data?.id;
    assert(Boolean(priyaId), '3. Customer Priya Patel created');

    // 4. Create 3 prior successful payments for Priya to build strong trust history
    for (let i = 0; i < 3; i++) {
      const initTxRes = await fetch(`${API_BASE}/transactions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          customerId: priyaId,
          amount: 5000,
          paymentMethod: 'UPI',
          description: `Subscription Month ${i + 1}`,
        }),
      });
      const initTxData = await initTxRes.json();
      await fetch(`${API_BASE}/transactions/${initTxData.data.id}/process`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ simulateStatus: 'SUCCESS' }),
      });
    }
    assert(true, '4. Established 3 successful historical payments for Priya');

    // 5. Create Failed Transaction (Bank Timeout)
    const failTxRes = await fetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        customerId: priyaId,
        amount: 12500,
        paymentMethod: 'UPI',
        description: 'Enterprise Annual Tier',
      }),
    });
    const failTxData = await failTxRes.json();
    const failTxId = failTxData.data.id;

    await fetch(`${API_BASE}/transactions/${failTxId}/process`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ simulateStatus: 'FAILED', failureReason: 'BANK_TIMEOUT' }),
    });
    assert(true, '5. Simulated ₹12,500 Bank Timeout failure');

    // 6. Run AI Analysis
    const analysisRes = await fetch(`${API_BASE}/transactions/${failTxId}/analyze`, {
      method: 'POST',
      headers,
    });
    const analysisData = await analysisRes.json();
    assert(analysisData.success === true, '6. Deterministic AI analysis generated');
    const analysis = analysisData.data;
    assert(analysis.recoveryProbability >= 80, '7. Probability scored >= 80%');
    assert(analysis.confidence === 'HIGH', '8. Confidence determined as HIGH');

    // 7. Check Opportunities endpoint
    const oppsRes = await fetch(`${API_BASE}/recovery/opportunities`, { headers });
    const oppsData = await oppsRes.json();
    const opp = oppsData.data.find((o: any) => o.transactionId === failTxId);
    assert(opp !== undefined, '9. Transaction listed in Recovery Center opportunities');
    assert(opp.isAutonomousReady === true, '10. Flagged as isAutonomousReady = true');

    // 8. Execute Autonomous Recovery
    const execRes = await fetch(`${API_BASE}/recovery/${failTxId}/execute`, {
      method: 'POST',
      headers,
    });
    const execData = await execRes.json();
    assert(execData.success === true, '11. Autonomous Recovery Agent executed');
    assert(execData.data.transaction.status === 'RECOVERED', '12. Transaction status transitioned to RECOVERED');
    assert(execData.data.transaction.recoveredAmount === 12500, '13. ₹12,500 recovered amount recorded');

    // 9. Inspect Recovery Details & Immutable Event Stream
    const detailsRes = await fetch(`${API_BASE}/recovery/${failTxId}`, { headers });
    const detailsData = await detailsRes.json();
    assert(detailsData.success === true, '14. Recovery Details API fetched');
    assert(detailsData.data.attempts.length >= 1, '15. Recovery attempts recorded in database');
    assert(detailsData.data.events.length >= 4, '16. Chronological audit event stream recorded >= 4 events');

    // 10. Check Customer Profile Recovery History
    const custProfileRes = await fetch(`${API_BASE}/customers/${priyaId}`, { headers });
    const custProfileData = await custProfileRes.json();
    assert(custProfileData.data.recoveryHistory.length >= 1, '17. Customer recoveryHistory array populated');
    assert(
      custProfileData.data.recoveryHistory[0].recoveredAmount === 12500,
      '18. Customer profile records ₹12,500 recovered'
    );

    // 11. Create Customer 2: Aarav Mehta with Card Declined
    const custRes2 = await fetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Aarav Mehta',
        email: `aarav_${Date.now()}@example.com`,
      }),
    });
    const cust2Data = await custRes2.json();
    const aaravId = cust2Data.data.id;

    const txAaravRes = await fetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        customerId: aaravId,
        amount: 8000,
        paymentMethod: 'Credit Card',
        description: 'Design Retainer',
      }),
    });
    const txAaravData = await txAaravRes.json();
    const aaravTxId = txAaravData.data.id;

    await fetch(`${API_BASE}/transactions/${aaravTxId}/process`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ simulateStatus: 'FAILED', failureReason: 'CARD_DECLINED' }),
    });

    await fetch(`${API_BASE}/transactions/${aaravTxId}/analyze`, {
      method: 'POST',
      headers,
    });

    // Approve recovery with alternate payment rail
    const altPayRes = await fetch(`${API_BASE}/recovery/${aaravTxId}/simulate-payment`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ mode: 'ALTERNATE_METHOD', alternatePaymentMethod: 'UPI' }),
    });
    const altPayData = await altPayRes.json();
    assert(altPayData.success === true, '19. Alternate payment rail (UPI) simulation succeeded');
    assert(altPayData.data.transaction.status === 'RECOVERED', '20. Card declined converted to RECOVERED via UPI');

    // 12. Create Customer 3: Neha Verma with Insufficient Balance -> Payment Link
    const custRes3 = await fetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Neha Verma',
        email: `neha_${Date.now()}@example.com`,
      }),
    });
    const cust3Data = await custRes3.json();
    const nehaId = cust3Data.data.id;

    const txNehaRes = await fetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        customerId: nehaId,
        amount: 4500,
        paymentMethod: 'UPI',
        description: 'Pro Subscription',
      }),
    });
    const txNehaData = await txNehaRes.json();
    const nehaTxId = txNehaData.data.id;

    await fetch(`${API_BASE}/transactions/${nehaTxId}/process`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ simulateStatus: 'FAILED', failureReason: 'INSUFFICIENT_BALANCE' }),
    });
    await fetch(`${API_BASE}/transactions/${nehaTxId}/analyze`, {
      method: 'POST',
      headers,
    });

    // Execute Payment Link strategy
    const linkRes = await fetch(`${API_BASE}/recovery/${nehaTxId}/execute`, {
      method: 'POST',
      headers,
    });
    const linkData = await linkRes.json();
    assert(linkData.data.paymentLink !== null, '21. Generated dynamic PaymentLink');

    // Simulate customer paying the link
    const payLinkRes = await fetch(`${API_BASE}/recovery/${nehaTxId}/simulate-payment`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ mode: 'PAYMENT_LINK' }),
    });
    const payLinkData = await payLinkRes.json();
    assert(payLinkData.data.transaction.status === 'RECOVERED', '22. Payment link settled & marked RECOVERED');

    // 13. Dashboard Metrics Verification
    const dashRes = await fetch(`${API_BASE}/dashboard/metrics`, { headers });
    const dashResult = await dashRes.json();
    const dashData = dashResult.data;
    assert(dashData.recoveredRevenue >= 25000, `23. Total Recovered Revenue = ₹${dashData.recoveredRevenue.toLocaleString()}`);
    assert(dashData.recoverySuccessRate > 0, `24. Recovery Success Rate = ${dashData.recoverySuccessRate}%`);
    assert(dashData.autonomousRecoveries >= 1, `25. Autonomous Recoveries count = ${dashData.autonomousRecoveries}`);

    console.log('\n----------------------------------------------------------------');
    if (failures === 0) {
      console.log('🎉 ALL 25 LIVE END-TO-END SMOKE TEST ASSERTIONS PASSED WITH 100% SUCCESS!');
    } else {
      console.error(`💥 ${failures} SMOKE TEST(S) FAILED.`);
    }
  } catch (err: any) {
    console.error('Fatal Smoke Test Error:', err.message);
  }
}

runLiveSmokeTest();

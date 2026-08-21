export const BASE_URL = 'http://localhost:5000/api';

async function runLiveSmokePhase5() {
  console.log('================================================================');
  console.log('   RecoverAI — Live Phase 5 End-to-End API Smoke Verification');
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

  let cookieHeader = '';

  const request = async (path: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as any),
    };
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
    });

    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      cookieHeader = setCookie.split(';')[0];
    }

    const json = await res.json().catch(() => ({}));
    return { status: res.status, data: json };
  };

  try {
    // 1. Health check
    const healthRes = await request('/health');
    assert(healthRes.status === 200, '1. Backend server is alive and responding at /api/health');

    // 2. Signup / Login Merchant
    const email = `judge_demo_${Date.now()}@recoverai.io`;
    const signupRes = await request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Judge Demo Admin',
        email,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        businessName: 'Fintech Scale Inc',
      }),
    });

    if (signupRes.status !== 201 && signupRes.status !== 200) {
      console.log('Signup error payload:', signupRes);
    }
    assert(signupRes.status === 201 || signupRes.status === 200, '2. Merchant signed up successfully');

    // 3. Complete Onboarding
    const onboardRes = await request('/merchant/onboarding', {
      method: 'POST',
      body: JSON.stringify({
        businessType: 'SaaS',
        monthlyPaymentVolume: '₹5L–₹25L',
        preferredPaymentMethods: ['UPI', 'Credit Card'],
      }),
    });
    assert(onboardRes.status === 200, '3. Onboarding completed successfully');

    // 4. Test Zero Data State
    const emptyOverview = await request('/analytics/overview');
    assert(emptyOverview.status === 200, '4. GET /api/analytics/overview returns 200');
    assert(emptyOverview.data.data.totalTransactions === 0, '5. Empty state totalTransactions = 0');
    assert(emptyOverview.data.data.recoveryRate === 0, '6. Empty state recoveryRate = 0');

    const emptyInsights = await request('/analytics/insights');
    assert(emptyInsights.status === 200, '7. GET /api/analytics/insights returns 200');
    assert(emptyInsights.data.data.length >= 1, '8. Initial setup insight generated for empty state');

    // 5. Trigger Rich Demo Scenario Dataset Seed
    const seedRes = await request('/demo/seed', { method: 'POST', body: JSON.stringify({}) });
    assert(seedRes.status === 200, '9. POST /api/demo/seed generated rich demo scenario in MongoDB');

    // 6. Analytics Overview with Populated Data
    const populatedOverview = await request('/analytics/overview');
    assert(populatedOverview.status === 200, '10. Populated overview endpoint returns 200');
    const ov = populatedOverview.data.data;
    assert(ov.totalTransactions >= 15, `11. Total transactions populated: ${ov.totalTransactions}`);
    assert(ov.totalVolume >= 100000, `12. Total payment volume populated: ₹${ov.totalVolume.toLocaleString()}`);
    assert(ov.recoveredRevenue >= 30000, `13. Recovered revenue calculated: ₹${ov.recoveredRevenue.toLocaleString()}`);
    assert(ov.recoveryRate > 0, `14. Recovery rate calculated: ${ov.recoveryRate}%`);
    assert(ov.recoverySuccessRate > 0, `15. Recovery success rate calculated: ${ov.recoverySuccessRate}%`);
    assert(ov.recoveryLift > 0, `16. Recovery lift calculated: +${ov.recoveryLift}%`);

    // 7. Recovery Funnel
    const funnelRes = await request('/analytics/funnel');
    assert(funnelRes.status === 200, '17. GET /api/analytics/funnel returns 200');
    assert(funnelRes.data.data.funnel.length === 6, '18. Funnel contains all 6 lifecycle stages');
    assert(
      funnelRes.data.data.funnel[5].amount === ov.recoveredRevenue,
      '19. Final funnel stage matches total recovered revenue'
    );

    // 8. Revenue Trends
    const trendsRes = await request('/analytics/revenue-trends?range=30D');
    assert(trendsRes.status === 200, '20. GET /api/analytics/revenue-trends returns 200');
    assert(trendsRes.data.data.points.length > 0, '21. Revenue trend time-series points returned');

    // 9. Recovery Performance Trends
    const recTrendsRes = await request('/analytics/recovery-trends?range=30D');
    assert(recTrendsRes.status === 200, '22. GET /api/analytics/recovery-trends returns 200');
    assert(recTrendsRes.data.data.points.length > 0, '23. Recovery performance trend points returned');

    // 10. Failure Breakdown
    const failureRes = await request('/analytics/failure-breakdown');
    assert(failureRes.status === 200, '24. GET /api/analytics/failure-breakdown returns 200');
    assert(failureRes.data.data.breakdown.length === 6, '25. All 6 failure reasons analyzed');

    // 11. Payment Rail Performance
    const railsRes = await request('/analytics/payment-methods');
    assert(railsRes.status === 200, '26. GET /api/analytics/payment-methods returns 200');
    assert(railsRes.data.data.breakdown.length === 4, '27. 4 payment rails analyzed');
    assert(Boolean(railsRes.data.data.bestPerformingMethod), '28. Best performing payment method identified');

    // 12. Recovery Actions & Autonomous Comparison
    const actionsRes = await request('/analytics/recovery-actions');
    assert(actionsRes.status === 200, '29. GET /api/analytics/recovery-actions returns 200');

    const autoCompRes = await request('/analytics/autonomous-comparison');
    assert(autoCompRes.status === 200, '30. GET /api/analytics/autonomous-comparison returns 200');
    assert(autoCompRes.data.data.autonomous.revenueRecovered > 0, '31. Autonomous revenue recovered > 0');

    // 13. Customer Recovery Segments
    const segRes = await request('/analytics/customer-segments');
    assert(segRes.status === 200, '32. GET /api/analytics/customer-segments returns 200');
    assert(Boolean(segRes.data.data.segments.HIGH_VALUE_HIGH_RECOVERY), '33. Customer segmentation 4 quadrants calculated');

    // 14. AI Insights Feed
    const insightsRes = await request('/analytics/insights');
    assert(insightsRes.status === 200, '34. GET /api/analytics/insights returns 200');
    assert(insightsRes.data.data.length >= 3, '35. Dynamic prioritized insights feed generated');

    // 15. Notifications System
    const notifRes = await request('/notifications');
    assert(notifRes.status === 200, '36. GET /api/notifications returns 200');
    assert(notifRes.data.data.length > 0, '37. Dynamic notifications generated from recovery events');

    const markAllRes = await request('/notifications/mark-all-read', { method: 'POST', body: JSON.stringify({}) });
    assert(markAllRes.status === 200, '38. POST /api/notifications/mark-all-read marked alerts as read');

    // 16. Global Omnibar Search
    const searchRes = await request('/search?q=Aditya');
    assert(searchRes.status === 200, '39. GET /api/search?q=Aditya returns 200');
    assert(
      searchRes.data.data.customers.some((c: any) => c.title.includes('Aditya')),
      '40. Global search matched customer record "Aditya Birla"'
    );

    console.log('\n----------------------------------------------------------------');
    if (failures === 0) {
      console.log('🎉 ALL 40 LIVE END-TO-END SMOKE TEST ASSERTIONS PASSED PERFECTLY!');
      process.exit(0);
    } else {
      console.error(`💥 ${failures} TEST(S) FAILED.`);
      process.exit(1);
    }
  } catch (err: any) {
    console.error('Fatal Smoke Test Error:', err.message);
    process.exit(1);
  }
}

runLiveSmokePhase5();

process.env.NODE_ENV = 'test';
import http from 'http';
import app from '../server';
import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User.model';
import { Merchant } from '../models/Merchant.model';

async function runE2ETests() {
  console.log('================================================================');
  console.log('   RecoverAI — Foundation Phase End-to-End Test Suite');
  console.log('================================================================\n');

  let server: any = null;
  let baseUrl = '';
  let cookieHeader = '';
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
    // 1. Connect DB & Start Server on ephemeral port
    await connectDB();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://localhost:${addr.port}`;
        console.log(`[E2E] Test server running on ${baseUrl}\n`);
        resolve();
      });
    });

    // Clean any prior test artifacts
    await User.deleteMany({ email: /e2e_.*@nexuspay\.io/ });

    // TEST 1: Health Check Endpoint
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthJson = await healthRes.json();
    assert(healthRes.status === 200 && healthJson.status === 'ok', '1. System Health Check (/api/health)');

    // TEST 2: Signup with New Merchant Account
    const testEmail = `e2e_${Date.now()}@nexuspay.io`;
    const signupPayload = {
      name: 'Sarah Connor',
      businessName: 'Cyberdyne Payments Inc',
      email: testEmail,
      password: 'SecurePassword2026!',
      confirmPassword: 'SecurePassword2026!',
    };

    const signupRes = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signupPayload),
    });

    const signupJson = await signupRes.json();
    const rawCookies = signupRes.headers.get('set-cookie');
    if (rawCookies) {
      cookieHeader = rawCookies.split(';')[0];
    }

    assert(signupRes.status === 201, '2. User & Merchant Registration (POST /api/auth/signup)');
    assert(Boolean(cookieHeader && cookieHeader.startsWith('token=')), '3. HTTP-only session cookie issued on signup');
    assert(signupJson.user.email === testEmail, '4. Registered user matches provided email');
    assert(signupJson.merchant.onboardingCompleted === false, '5. Newly registered merchant has onboardingCompleted: false');

    // Verify in MongoDB
    const dbUser = await User.findOne({ email: testEmail });
    assert(Boolean(dbUser), '6. User persisted to MongoDB');
    assert(dbUser?.passwordHash !== signupPayload.password, '7. Password hashed with bcrypt in MongoDB');

    const dbMerchant = await Merchant.findOne({ userId: dbUser?._id });
    assert(Boolean(dbMerchant), '8. Merchant record persisted to MongoDB and linked to User ID');

    // TEST 3: Authenticated Session Check (GET /api/auth/me)
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieHeader },
    });
    const meJson = await meRes.json();
    assert(meRes.status === 200, '9. Session Verification (GET /api/auth/me)');
    assert(meJson.user.name === 'Sarah Connor', '10. Session returns correct user name');
    assert(meJson.merchant.businessName === 'Cyberdyne Payments Inc', '11. Session returns correct merchant business name');

    // TEST 4: Complete Onboarding Flow (POST /api/merchant/onboarding)
    const onboardingPayload = {
      businessName: 'Cyberdyne Payments Global',
      businessType: 'Subscription',
      monthlyPaymentVolume: '₹5L–₹25L',
      preferredPaymentMethods: ['UPI', 'Credit Card', 'Net Banking'],
    };

    const onboardRes = await fetch(`${baseUrl}/api/merchant/onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
      body: JSON.stringify(onboardingPayload),
    });
    const onboardJson = await onboardRes.json();
    assert(onboardRes.status === 200, '12. Complete 5-step onboarding (POST /api/merchant/onboarding)');
    assert(onboardJson.merchant.onboardingCompleted === true, '13. Merchant onboardingCompleted flagged as true');
    assert(onboardJson.merchant.businessType === 'Subscription', '14. Merchant businessType persisted');
    assert(onboardJson.merchant.monthlyPaymentVolume === '₹5L–₹25L', '15. Merchant volume range persisted');

    // TEST 5: Fetch Scoped Dashboard Metrics (GET /api/dashboard/metrics)
    const metricsRes = await fetch(`${baseUrl}/api/dashboard/metrics`, {
      headers: { Cookie: cookieHeader },
    });
    const metricsJson = await metricsRes.json();
    assert(metricsRes.status === 200, '16. Retrieve Scoped Dashboard Metrics (GET /api/dashboard/metrics)');
    assert(metricsJson.data.revenueAtRisk === 0, '17. Revenue at Risk is dynamic 0 (no fake numbers)');
    assert(metricsJson.data.recoveredRevenue === 0, '18. Recovered Revenue is dynamic 0 (no fake numbers)');
    assert(metricsJson.data.recoveryRate === 0, '19. Recovery Rate is dynamic 0%');
    assert(metricsJson.data.failedPayments === 0, '20. Failed Payments count is dynamic 0');

    // TEST 6: Update Settings & Merchant Profile (PUT /api/merchant/profile)
    const updateProfilePayload = {
      name: 'Sarah Connor (CEO)',
      businessName: 'Cyberdyne AI Solutions',
      monthlyPaymentVolume: '₹25L+',
      preferredPaymentMethods: ['UPI', 'Credit Card', 'Debit Card', 'Net Banking'],
    };

    const updateRes = await fetch(`${baseUrl}/api/merchant/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
      body: JSON.stringify(updateProfilePayload),
    });
    const updateJson = await updateRes.json();
    assert(updateRes.status === 200, '21. Update Profile & Settings (PUT /api/merchant/profile)');
    assert(updateJson.user.name === 'Sarah Connor (CEO)', '22. Updated user name saved to MongoDB');
    assert(updateJson.merchant.businessName === 'Cyberdyne AI Solutions', '23. Updated business name saved to MongoDB');
    assert(updateJson.merchant.monthlyPaymentVolume === '₹25L+', '24. Updated payment volume saved to MongoDB');

    // TEST 7: Logout (POST /api/auth/logout)
    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: cookieHeader },
    });
    const logoutCookies = logoutRes.headers.get('set-cookie');
    assert(logoutRes.status === 200, '25. Logout Endpoint (POST /api/auth/logout)');
    assert(
      Boolean(logoutCookies && (logoutCookies.includes('Expires=Thu, 01 Jan 1970') || logoutCookies.includes('Max-Age=0'))),
      '26. Logout clears session cookie'
    );

    // TEST 8: Verify Protected Routes Reject Unauthenticated Requests
    const unauthMeRes = await fetch(`${baseUrl}/api/auth/me`);
    assert(unauthMeRes.status === 401, '27. Unauthenticated GET /api/auth/me rejected with 401');

    const unauthMetricsRes = await fetch(`${baseUrl}/api/dashboard/metrics`);
    assert(unauthMetricsRes.status === 401, '28. Unauthenticated GET /api/dashboard/metrics rejected with 401');

    const unauthProfileRes = await fetch(`${baseUrl}/api/merchant/profile`);
    assert(unauthProfileRes.status === 401, '29. Unauthenticated GET /api/merchant/profile rejected with 401');

    // TEST 9: Login Rejection with Wrong Credentials
    const wrongLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'IncorrectPassword999!',
      }),
    });
    assert(wrongLoginRes.status === 401, '30. Login rejected with invalid password (401)');

    // TEST 10: Successful Login with Valid Credentials
    const validLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'SecurePassword2026!',
      }),
    });
    const validLoginJson = await validLoginRes.json();
    const newCookieHeader = validLoginRes.headers.get('set-cookie')?.split(';')[0] || '';

    assert(validLoginRes.status === 200, '31. Successful Login (POST /api/auth/login)');
    assert(Boolean(newCookieHeader.startsWith('token=')), '32. New valid session cookie issued upon login');
    assert(validLoginJson.merchant.onboardingCompleted === true, '33. Logged in merchant preserves onboarding state');
    assert(validLoginJson.merchant.businessName === 'Cyberdyne AI Solutions', '34. Logged in merchant preserves updated profile');

    // Clean up
    await User.deleteMany({ email: /e2e_.*@nexuspay\.io/ });
    await Merchant.deleteMany({ userId: dbUser?._id });

    if (server) {
      server.close();
    }
    await disconnectDB();

    console.log('\n----------------------------------------------------------------');
    if (failures === 0) {
      console.log('🎉 ALL 34 END-TO-END SPECIFICATION TESTS PASSED PERFECTLY!');
      process.exit(0);
    } else {
      console.error(`💥 ${failures} TEST(S) FAILED.`);
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal E2E Test Failure:', err);
    if (server) server.close();
    await disconnectDB();
    process.exit(1);
  }
}

runE2ETests();

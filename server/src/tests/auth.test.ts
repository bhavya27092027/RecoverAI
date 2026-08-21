import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User.model';
import { Merchant } from '../models/Merchant.model';
import bcrypt from 'bcryptjs';
import { generateToken, verifyToken } from '../utils/jwt';

async function runFoundationTests() {
  console.log('--- Starting RecoverAI Foundation Automated Test Suite ---');
  let failures = 0;

  const assert = (condition: boolean, testName: string) => {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failures++;
    }
  };

  try {
    // 1. Database Connection
    await connectDB();
    assert(true, 'Database connection established');

    // Clean up test data
    await User.deleteMany({ email: /test.*@recoverai\.io/ });
    await Merchant.deleteMany({ businessName: /Test Business/ });

    // 2. User Creation & Password Hashing
    const rawPassword = 'Password123!';
    const passwordHash = await bcrypt.hash(rawPassword, 10);
    const testEmail = `test_${Date.now()}@recoverai.io`;

    const user = await User.create({
      name: 'Alex Mercer',
      email: testEmail,
      passwordHash,
    });

    assert(Boolean(user._id), 'User created with ObjectId in MongoDB');
    assert(user.email === testEmail, 'User email normalized and stored');
    assert(user.passwordHash !== rawPassword, 'Password is never stored in plain text');

    // 3. Password Verification
    const isMatch = await bcrypt.compare(rawPassword, user.passwordHash);
    const isWrongMatch = await bcrypt.compare('WrongPassword999', user.passwordHash);
    assert(isMatch === true, 'bcrypt correctly verifies valid password');
    assert(isWrongMatch === false, 'bcrypt rejects invalid password');

    // 4. Merchant Creation & Association
    const merchant = await Merchant.create({
      userId: user._id,
      businessName: 'Test Business Cloud Ltd',
      businessType: 'SaaS',
      monthlyPaymentVolume: '< ₹1L',
      preferredPaymentMethods: ['UPI', 'Credit Card'],
      onboardingCompleted: false,
    });

    assert(Boolean(merchant._id), 'Merchant profile created in MongoDB');
    assert(merchant.userId.toString() === user._id.toString(), 'Merchant correctly linked to User ID');
    assert(merchant.onboardingCompleted === false, 'New merchant starts with onboardingCompleted: false');

    // 5. Unique Email Constraint
    let duplicateFailed = false;
    try {
      await User.create({
        name: 'Duplicate Alex',
        email: testEmail,
        passwordHash,
      });
    } catch {
      duplicateFailed = true;
    }
    assert(duplicateFailed, 'MongoDB rejects duplicate email registration');

    // 6. JWT Generation & Verification
    const token = generateToken({
      userId: user._id.toString(),
      merchantId: merchant._id.toString(),
      email: user.email,
    });

    const decoded = verifyToken(token);
    assert(decoded.userId === user._id.toString(), 'JWT contains accurate userId');
    assert(decoded.merchantId === merchant._id.toString(), 'JWT contains accurate merchantId');
    assert(decoded.email === user.email, 'JWT contains accurate email');

    // 7. Onboarding Completion Flow
    merchant.businessType = 'Subscription';
    merchant.monthlyPaymentVolume = '₹5L–₹25L';
    merchant.preferredPaymentMethods = ['UPI', 'Credit Card', 'Net Banking'];
    merchant.onboardingCompleted = true;
    await merchant.save();

    const updatedMerchant = await Merchant.findById(merchant._id);
    assert(updatedMerchant?.onboardingCompleted === true, 'Merchant onboarding successfully updated to true');
    assert(updatedMerchant?.monthlyPaymentVolume === '₹5L–₹25L', 'Merchant monthly payment volume updated');
    assert(updatedMerchant?.preferredPaymentMethods.includes('Net Banking') === true, 'Preferred payment methods saved');

    // 8. Merchant Profile Editing & Persistence
    user.name = 'Alex Mercer (CTO)';
    await user.save();
    const updatedUser = await User.findById(user._id);
    assert(updatedUser?.name === 'Alex Mercer (CTO)', 'User profile name updated and persisted');

    // Clean up
    await User.deleteMany({ email: /test.*@recoverai\.io/ });
    await Merchant.deleteMany({ userId: user._id });

    await disconnectDB();

    console.log('----------------------------------------------------');
    if (failures === 0) {
      console.log('🎉 ALL BACKEND FOUNDATION TESTS PASSED SUCCESSFULLY!');
    } else {
      console.error(`💥 ${failures} TEST(S) FAILED.`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Test execution error:', error);
    process.exit(1);
  }
}

runFoundationTests();

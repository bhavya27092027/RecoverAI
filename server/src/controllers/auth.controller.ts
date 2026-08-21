import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.model';
import { Merchant } from '../models/Merchant.model';
import { generateToken, setAuthCookie, clearAuthCookie } from '../utils/jwt';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export const signup = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, businessName, email, password } = req.body;

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user with this email already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      res.status(409).json({
        success: false,
        error: 'An account with this email address already exists. Please log in.',
      });
      return;
    }

    // Hash password with bcrypt
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create User in MongoDB
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
    });

    // Create Merchant profile in MongoDB
    const merchant = await Merchant.create({
      userId: user._id,
      businessName: businessName.trim(),
      businessType: 'SaaS',
      monthlyPaymentVolume: '< ₹1L',
      preferredPaymentMethods: ['UPI', 'Credit Card'],
      onboardingCompleted: false,
    });

    // Generate JWT and set secure HTTP-only cookie
    const token = generateToken({
      userId: user._id.toString(),
      merchantId: merchant._id.toString(),
      email: user.email,
    });

    setAuthCookie(res, token);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
      merchant: {
        id: merchant._id,
        businessName: merchant.businessName,
        businessType: merchant.businessType,
        monthlyPaymentVolume: merchant.monthlyPaymentVolume,
        preferredPaymentMethods: merchant.preferredPaymentMethods,
        onboardingCompleted: merchant.onboardingCompleted,
        createdAt: merchant.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
      return;
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
      return;
    }

    // Fetch associated merchant profile
    let merchant = await Merchant.findOne({ userId: user._id });
    if (!merchant) {
      // Self-heal merchant record if missing for legacy/test edge cases
      merchant = await Merchant.create({
        userId: user._id,
        businessName: user.name + "'s Business",
        businessType: 'SaaS',
        monthlyPaymentVolume: '< ₹1L',
        preferredPaymentMethods: ['UPI', 'Credit Card'],
        onboardingCompleted: false,
      });
    }

    // Generate JWT and set secure HTTP-only cookie
    const token = generateToken({
      userId: user._id.toString(),
      merchantId: merchant._id.toString(),
      email: user.email,
    });

    setAuthCookie(res, token);

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
      merchant: {
        id: merchant._id,
        businessName: merchant.businessName,
        businessType: merchant.businessType,
        monthlyPaymentVolume: merchant.monthlyPaymentVolume,
        preferredPaymentMethods: merchant.preferredPaymentMethods,
        onboardingCompleted: merchant.onboardingCompleted,
        createdAt: merchant.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    clearAuthCookie(res);
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.merchant) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    res.status(200).json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        createdAt: req.user.createdAt,
      },
      merchant: {
        id: req.merchant._id,
        businessName: req.merchant.businessName,
        businessType: req.merchant.businessType,
        monthlyPaymentVolume: req.merchant.monthlyPaymentVolume,
        preferredPaymentMethods: req.merchant.preferredPaymentMethods,
        onboardingCompleted: req.merchant.onboardingCompleted,
        createdAt: req.merchant.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

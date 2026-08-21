import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { Merchant } from '../models/Merchant.model';
import { User } from '../models/User.model';

export const completeOnboarding = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { businessName, businessType, monthlyPaymentVolume, preferredPaymentMethods } = req.body;
    const merchant = req.merchant;

    if (!merchant) {
      res.status(404).json({
        success: false,
        error: 'Merchant profile not found',
      });
      return;
    }

    if (businessName && businessName.trim()) {
      merchant.businessName = businessName.trim();
    }
    if (businessType) {
      merchant.businessType = businessType;
    }
    if (monthlyPaymentVolume) {
      merchant.monthlyPaymentVolume = monthlyPaymentVolume;
    }
    if (preferredPaymentMethods && Array.isArray(preferredPaymentMethods)) {
      merchant.preferredPaymentMethods = preferredPaymentMethods;
    }

    merchant.onboardingCompleted = true;
    await merchant.save();

    res.status(200).json({
      success: true,
      message: 'Onboarding completed successfully',
      merchant: {
        id: merchant._id,
        businessName: merchant.businessName,
        businessType: merchant.businessType,
        monthlyPaymentVolume: merchant.monthlyPaymentVolume,
        preferredPaymentMethods: merchant.preferredPaymentMethods,
        onboardingCompleted: merchant.onboardingCompleted,
        updatedAt: merchant.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;
    const merchant = req.merchant;

    if (!user || !merchant) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    res.status(200).json({
      success: true,
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
        updatedAt: merchant.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;
    const merchant = req.merchant;
    const { name, businessName, businessType, monthlyPaymentVolume, preferredPaymentMethods } = req.body;

    if (!user || !merchant) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    // Update User model fields if provided
    if (name && name.trim()) {
      user.name = name.trim();
      await user.save();
    }

    // Update Merchant model fields if provided
    if (businessName && businessName.trim()) {
      merchant.businessName = businessName.trim();
    }
    if (businessType) {
      merchant.businessType = businessType;
    }
    if (monthlyPaymentVolume) {
      merchant.monthlyPaymentVolume = monthlyPaymentVolume;
    }
    if (preferredPaymentMethods && Array.isArray(preferredPaymentMethods)) {
      merchant.preferredPaymentMethods = preferredPaymentMethods;
    }

    await merchant.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
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
        updatedAt: merchant.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

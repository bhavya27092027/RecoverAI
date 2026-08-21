import apiClient from './client';
import { Merchant, User, BusinessType, MonthlyPaymentVolume, PaymentMethod } from '../types';

export interface OnboardingInput {
  businessName?: string;
  businessType: BusinessType;
  monthlyPaymentVolume: MonthlyPaymentVolume;
  preferredPaymentMethods: PaymentMethod[];
}

export interface UpdateProfileInput {
  name?: string;
  businessName?: string;
  businessType?: BusinessType;
  monthlyPaymentVolume?: MonthlyPaymentVolume;
  preferredPaymentMethods?: PaymentMethod[];
}

export interface ProfileResponse {
  success: boolean;
  user: User;
  merchant: Merchant;
}

export const completeOnboardingApi = async (data: OnboardingInput): Promise<{ success: boolean; merchant: Merchant }> => {
  const res = await apiClient.post<{ success: boolean; merchant: Merchant }>('/merchant/onboarding', data);
  return res.data;
};

export const getProfileApi = async (): Promise<ProfileResponse> => {
  const res = await apiClient.get<ProfileResponse>('/merchant/profile');
  return res.data;
};

export const updateProfileApi = async (data: UpdateProfileInput): Promise<ProfileResponse> => {
  const res = await apiClient.put<ProfileResponse>('/merchant/profile', data);
  return res.data;
};

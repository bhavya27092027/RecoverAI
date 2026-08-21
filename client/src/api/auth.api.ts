import apiClient from './client';
import { AuthResponse } from '../types';

export interface SignupInput {
  name: string;
  businessName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginInput {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export const signupApi = async (data: SignupInput): Promise<AuthResponse> => {
  const res = await apiClient.post<AuthResponse>('/auth/signup', data);
  return res.data;
};

export const loginApi = async (data: LoginInput): Promise<AuthResponse> => {
  const res = await apiClient.post<AuthResponse>('/auth/login', data);
  return res.data;
};

export const logoutApi = async (): Promise<{ success: boolean; message: string }> => {
  const res = await apiClient.post<{ success: boolean; message: string }>('/auth/logout');
  return res.data;
};

export const getMeApi = async (): Promise<AuthResponse> => {
  const res = await apiClient.get<AuthResponse>('/auth/me');
  return res.data;
};

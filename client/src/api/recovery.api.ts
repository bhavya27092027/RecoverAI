import apiClient from './client';
import {
  RecoveryAnalysis,
  RecoveryOpportunitiesResponse,
  RecoveryDetailsResponse,
  ExecuteRecoveryResponse,
  RecoveryEvent,
  RecoveryAttempt,
  RecoveryMetrics,
} from '../types';

export const analyzeTransactionApi = async (
  transactionId: string
): Promise<{ success: boolean; message: string; data: RecoveryAnalysis }> => {
  const response = await apiClient.post(`/transactions/${transactionId}/analyze`);
  return response.data;
};

export const getTransactionRecoveryAnalysisApi = async (
  transactionId: string
): Promise<{ success: boolean; data: RecoveryAnalysis | null }> => {
  const response = await apiClient.get(`/transactions/${transactionId}/recovery-analysis`);
  return response.data;
};

export const getRecoveryOpportunitiesApi = async (params?: {
  probabilityTier?: string;
  recommendedAction?: string;
}): Promise<RecoveryOpportunitiesResponse> => {
  const response = await apiClient.get('/recovery/opportunities', { params });
  return response.data;
};

export const executeRecoveryApi = async (
  transactionId: string
): Promise<ExecuteRecoveryResponse> => {
  const response = await apiClient.post(`/recovery/${transactionId}/execute`);
  return response.data;
};

export const approveRecoveryApi = async (
  transactionId: string
): Promise<ExecuteRecoveryResponse> => {
  const response = await apiClient.post(`/recovery/${transactionId}/approve`);
  return response.data;
};

export const simulatePaymentApi = async (
  transactionId: string,
  options?: { alternatePaymentMethod?: string; mode?: 'ALTERNATE_METHOD' | 'PAYMENT_LINK' }
): Promise<ExecuteRecoveryResponse> => {
  const response = await apiClient.post(
    `/recovery/${transactionId}/simulate-payment`,
    options || {}
  );
  return response.data;
};

export const getRecoveryDetailsApi = async (
  transactionId: string
): Promise<RecoveryDetailsResponse> => {
  const response = await apiClient.get(`/recovery/${transactionId}`);
  return response.data;
};

export const getRecoveryEventsApi = async (
  transactionId: string
): Promise<{ success: boolean; data: RecoveryEvent[] }> => {
  const response = await apiClient.get(`/recovery/${transactionId}/events`);
  return response.data;
};

export const getRecoveryAttemptsApi = async (
  transactionId: string
): Promise<{ success: boolean; data: RecoveryAttempt[] }> => {
  const response = await apiClient.get(`/recovery/${transactionId}/attempts`);
  return response.data;
};

export const getRecoveryMetricsApi = async (): Promise<{
  success: boolean;
  data: RecoveryMetrics;
}> => {
  const response = await apiClient.get('/recovery/metrics');
  return response.data;
};

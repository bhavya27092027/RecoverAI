import apiClient from './client';
import {
  AnalyticsOverview,
  RecoveryFunnelData,
  RevenueTrendsResponse,
  RecoveryPerformanceTrendsResponse,
  FailureBreakdownResponse,
  PaymentRailPerformanceResponse,
  StrategyPerformanceResponse,
  AutonomousVsHumanResponse,
  CustomerSegmentsResponse,
  AiInsight,
} from '../types';

export const getAnalyticsOverviewApi = async (): Promise<{
  success: boolean;
  data: AnalyticsOverview;
}> => {
  const response = await apiClient.get('/analytics/overview');
  return response.data;
};

export const getRecoveryFunnelApi = async (): Promise<{
  success: boolean;
  data: RecoveryFunnelData;
}> => {
  const response = await apiClient.get('/analytics/funnel');
  return response.data;
};

export const getRevenueTrendsApi = async (
  range: '7D' | '30D' | '90D' | 'ALL' = '30D'
): Promise<{ success: boolean; data: RevenueTrendsResponse }> => {
  const response = await apiClient.get('/analytics/revenue-trends', {
    params: { range },
  });
  return response.data;
};

export const getRecoveryPerformanceTrendsApi = async (
  range: '7D' | '30D' | '90D' | 'ALL' = '30D'
): Promise<{ success: boolean; data: RecoveryPerformanceTrendsResponse }> => {
  const response = await apiClient.get('/analytics/recovery-trends', {
    params: { range },
  });
  return response.data;
};

export const getFailureBreakdownApi = async (): Promise<{
  success: boolean;
  data: FailureBreakdownResponse;
}> => {
  const response = await apiClient.get('/analytics/failure-breakdown');
  return response.data;
};

export const getPaymentMethodPerformanceApi = async (): Promise<{
  success: boolean;
  data: PaymentRailPerformanceResponse;
}> => {
  const response = await apiClient.get('/analytics/payment-methods');
  return response.data;
};

export const getRecoveryStrategyPerformanceApi = async (): Promise<{
  success: boolean;
  data: StrategyPerformanceResponse;
}> => {
  const response = await apiClient.get('/analytics/recovery-actions');
  return response.data;
};

export const getAutonomousVsHumanComparisonApi = async (): Promise<{
  success: boolean;
  data: AutonomousVsHumanResponse;
}> => {
  const response = await apiClient.get('/analytics/autonomous-comparison');
  return response.data;
};

export const getCustomerSegmentsApi = async (): Promise<{
  success: boolean;
  data: CustomerSegmentsResponse;
}> => {
  const response = await apiClient.get('/analytics/customer-segments');
  return response.data;
};

export const getAiInsightsApi = async (): Promise<{
  success: boolean;
  data: AiInsight[];
}> => {
  const response = await apiClient.get('/analytics/insights');
  return response.data;
};

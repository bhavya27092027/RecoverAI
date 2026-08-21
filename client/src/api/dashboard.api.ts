import apiClient from './client';
import { DashboardMetrics, Transaction } from '../types';

export const getDashboardMetricsApi = async (): Promise<{
  success: boolean;
  data: DashboardMetrics;
}> => {
  const res = await apiClient.get<{ success: boolean; data: DashboardMetrics }>(
    '/dashboard/metrics'
  );
  return res.data;
};

export const getRecentTransactionsApi = async (
  limit = 5
): Promise<{ success: boolean; data: Transaction[] }> => {
  const res = await apiClient.get<{ success: boolean; data: Transaction[] }>(
    '/dashboard/recent-transactions',
    { params: { limit } }
  );
  return res.data;
};

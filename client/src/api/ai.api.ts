import apiClient from './client';
import { AiInsight } from '../types';

export const getMerchantInsightsApi = async (): Promise<{
  success: boolean;
  data: AiInsight[];
}> => {
  const response = await apiClient.get('/ai/insights');
  return response.data;
};

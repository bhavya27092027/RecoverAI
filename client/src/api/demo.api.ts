import apiClient from './client';

export const seedDemoScenarioApi = async (): Promise<{
  success: boolean;
  message: string;
}> => {
  const response = await apiClient.post('/demo/seed');
  return response.data;
};

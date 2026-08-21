import apiClient from './client';
import { GlobalSearchResponse } from '../types';

export const globalSearchApi = async (query: string): Promise<GlobalSearchResponse> => {
  const response = await apiClient.get('/search', { params: { q: query } });
  return response.data;
};

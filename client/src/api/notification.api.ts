import apiClient from './client';
import { NotificationItem } from '../types';

export const getNotificationsApi = async (): Promise<{
  success: boolean;
  data: NotificationItem[];
  unreadCount: number;
}> => {
  const response = await apiClient.get('/notifications');
  return response.data;
};

export const markNotificationAsReadApi = async (
  id: string
): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.patch(`/notifications/${id}/read`);
  return response.data;
};

export const markAllNotificationsAsReadApi = async (): Promise<{
  success: boolean;
  message: string;
}> => {
  const response = await apiClient.post('/notifications/mark-all-read');
  return response.data;
};

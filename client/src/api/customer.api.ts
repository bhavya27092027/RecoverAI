import apiClient from './client';
import {
  Customer,
  CustomerDetailResponse,
  CreateCustomerInput,
  UpdateCustomerInput,
  PaginationMeta,
} from '../types';

export interface CustomersListResponse {
  success: boolean;
  data: Customer[];
  pagination: PaginationMeta;
}

export const getCustomersApi = async (params?: {
  q?: string;
  page?: number;
  limit?: number;
}): Promise<CustomersListResponse> => {
  const res = await apiClient.get<CustomersListResponse>('/customers', { params });
  return res.data;
};

export const getCustomerByIdApi = async (id: string): Promise<CustomerDetailResponse> => {
  const res = await apiClient.get<CustomerDetailResponse>(`/customers/${id}`);
  return res.data;
};

export const createCustomerApi = async (
  data: CreateCustomerInput
): Promise<{ success: boolean; data: Customer; message: string }> => {
  const res = await apiClient.post<{ success: boolean; data: Customer; message: string }>(
    '/customers',
    data
  );
  return res.data;
};

export const updateCustomerApi = async (
  id: string,
  data: UpdateCustomerInput
): Promise<{ success: boolean; data: Customer; message: string }> => {
  const res = await apiClient.put<{ success: boolean; data: Customer; message: string }>(
    `/customers/${id}`,
    data
  );
  return res.data;
};

export const deleteCustomerApi = async (
  id: string
): Promise<{ success: boolean; message: string }> => {
  const res = await apiClient.delete<{ success: boolean; message: string }>(`/customers/${id}`);
  return res.data;
};

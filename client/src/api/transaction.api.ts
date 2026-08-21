import apiClient from './client';
import {
  Transaction,
  CreateTransactionInput,
  ProcessPaymentInput,
  PaginationMeta,
} from '../types';

export interface TransactionsListResponse {
  success: boolean;
  data: Transaction[];
  pagination: PaginationMeta;
}

export interface TransactionDetailResponse {
  success: boolean;
  data: Transaction;
}

export interface ProcessPaymentResponse {
  success: boolean;
  message: string;
  result: any;
  data: Transaction;
}

export const getTransactionsApi = async (params?: {
  q?: string;
  status?: string;
  paymentMethod?: string;
  failureReason?: string;
  customerId?: string;
  page?: number;
  limit?: number;
}): Promise<TransactionsListResponse> => {
  const res = await apiClient.get<TransactionsListResponse>('/transactions', { params });
  return res.data;
};

export const getTransactionByIdApi = async (id: string): Promise<TransactionDetailResponse> => {
  const res = await apiClient.get<TransactionDetailResponse>(`/transactions/${id}`);
  return res.data;
};

export const createTransactionApi = async (
  data: CreateTransactionInput
): Promise<{ success: boolean; data: Transaction; message: string }> => {
  const res = await apiClient.post<{ success: boolean; data: Transaction; message: string }>(
    '/transactions',
    data
  );
  return res.data;
};

export const processPaymentApi = async (
  id: string,
  data: ProcessPaymentInput
): Promise<ProcessPaymentResponse> => {
  const res = await apiClient.post<ProcessPaymentResponse>(`/transactions/${id}/process`, data);
  return res.data;
};

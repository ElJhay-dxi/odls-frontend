import axiosInstance from '../axiosInstance';
import type { DailySccReading } from '../../types/dailySccReading';

const BASE = '/dailysccreadings';

export const dailySccReadingApi = {
  getAll: (params?: { plantCode?: string; date?: string }) =>
    axiosInstance.get<DailySccReading[]>(BASE, { params }),

  getById: (id: string) =>
    axiosInstance.get<DailySccReading>(`${BASE}/${id}`),

  create: (data: Record<string, unknown>) =>
    axiosInstance.post<DailySccReading>(BASE, data),

  update: (id: string, data: Record<string, unknown>) =>
    axiosInstance.put<DailySccReading>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};
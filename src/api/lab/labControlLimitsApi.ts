import axiosInstance from '../axiosInstance';
import type { LabControlLimit } from '../../types/lab';

const BASE = '/labcontrollimits';

export const labControlLimitsApi = {
  getAll: (params?: { plantCode?: string; date?: string }) =>
    axiosInstance.get<LabControlLimit[]>(BASE, { params }),

  getById: (id: string) =>
    axiosInstance.get<LabControlLimit>(`${BASE}/${id}`),

  create: (data: Record<string, unknown>) =>
    axiosInstance.post<LabControlLimit>(BASE, data),

  update: (id: string, data: Record<string, unknown>) =>
    axiosInstance.put<LabControlLimit>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};

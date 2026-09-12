import axiosInstance from '../axiosInstance';
import type { LabAnalysisRecord } from '../../types/lab';

const BASE = '/labanalysis';

export const labAnalysisApi = {
  getAll: (params?: { plantCode?: string; date?: string }) =>
    axiosInstance.get<LabAnalysisRecord[]>(BASE, { params }),

  getById: (id: string) =>
    axiosInstance.get<LabAnalysisRecord>(`${BASE}/${id}`),

  create: (data: Record<string, unknown>) =>
    axiosInstance.post<LabAnalysisRecord>(BASE, data),

  update: (id: string, data: Record<string, unknown>) =>
    axiosInstance.put<LabAnalysisRecord>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};

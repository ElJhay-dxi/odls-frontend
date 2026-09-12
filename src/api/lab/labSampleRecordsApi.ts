import axiosInstance from '../axiosInstance';
import type { LabSampleRecord } from '../../types/lab';

const BASE = '/labsamplerecords';

export const labSampleRecordsApi = {
  getAll: (params?: { plantCode?: string; date?: string }) =>
    axiosInstance.get<LabSampleRecord[]>(BASE, { params }),

  getById: (id: string) =>
    axiosInstance.get<LabSampleRecord>(`${BASE}/${id}`),

  create: (data: Record<string, unknown>) =>
    axiosInstance.post<LabSampleRecord>(BASE, data),

  update: (id: string, data: Record<string, unknown>) =>
    axiosInstance.put<LabSampleRecord>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};

import axiosInstance from '../axiosInstance';
import type { LabSampleType } from '../../types/lab';

const BASE = '/labsampletypes';

export interface SaveLabSampleTypePayload {
  name: string;
  description?: string | null;
  isActive: boolean;
}

export const labSampleTypesApi = {
  getAll: (activeOnly?: boolean) =>
    axiosInstance.get<LabSampleType[]>(BASE, { params: { activeOnly } }),

  create: (data: SaveLabSampleTypePayload) =>
    axiosInstance.post<LabSampleType>(BASE, data),

  update: (id: string, data: SaveLabSampleTypePayload) =>
    axiosInstance.put<LabSampleType>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};

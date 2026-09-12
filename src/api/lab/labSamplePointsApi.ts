import axiosInstance from '../axiosInstance';
import type { LabSamplePoint, LabSamplePointParameter, LabControlLimit } from '../../types/lab';

const BASE = '/labsamplepoints';

export const labSamplePointsApi = {
  getAll: (plantCode?: string, activeOnly?: boolean) =>
    axiosInstance.get<LabSamplePoint[]>(BASE, { params: { plantCode, activeOnly } }),

  getById: (id: string) =>
    axiosInstance.get<LabSamplePoint>(`${BASE}/${id}`),

  create: (data: Record<string, unknown>) =>
    axiosInstance.post<LabSamplePoint>(BASE, data),

  update: (id: string, data: Record<string, unknown>) =>
    axiosInstance.put<LabSamplePoint>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),

  addParameter: (samplePointId: string, data: Record<string, unknown>) =>
    axiosInstance.post<LabSamplePointParameter>(`${BASE}/${samplePointId}/parameters`, data),

  updateParameter: (samplePointId: string, parameterId: string, data: Record<string, unknown>) =>
    axiosInstance.put<LabSamplePointParameter>(`${BASE}/${samplePointId}/parameters/${parameterId}`, data),

  deleteParameter: (samplePointId: string, parameterId: string) =>
    axiosInstance.delete(`${BASE}/${samplePointId}/parameters/${parameterId}`),

  setLimit: (samplePointId: string, parameterId: string, data: Record<string, unknown>) =>
    axiosInstance.post<LabControlLimit>(`${BASE}/${samplePointId}/parameters/${parameterId}/limit`, data),

  recomputeStatus: (samplePointId: string, parameterId: string) =>
    axiosInstance.post<{ updatedCount: number }>(`${BASE}/${samplePointId}/parameters/${parameterId}/recompute`),
};

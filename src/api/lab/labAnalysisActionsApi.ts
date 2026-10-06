import axiosInstance from '../axiosInstance';
import type { LabAnalysisAction } from '../../types/lab';

const BASE = '/labanalysisactions';

export interface SaveLabAnalysisActionPayload {
  name: string;
  description?: string | null;
  isActive: boolean;
}

export const labAnalysisActionsApi = {
  getAll: (activeOnly?: boolean) =>
    axiosInstance.get<LabAnalysisAction[]>(BASE, { params: { activeOnly } }),

  create: (data: SaveLabAnalysisActionPayload) =>
    axiosInstance.post<LabAnalysisAction>(BASE, data),

  update: (id: string, data: SaveLabAnalysisActionPayload) =>
    axiosInstance.put<LabAnalysisAction>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};

import axiosInstance from '../axiosInstance';
import type { LabAnalysisAction } from '../../types/lab';

const BASE = '/labanalysisactions';

export interface SaveLabAnalysisActionPayload {
  plantCode: string;
  name: string;
  description?: string | null;
  isActive: boolean;
}

export const labAnalysisActionsApi = {
  /** With plantCode: that plant's actions plus any legacy all-plants actions. */
  getAll: (plantCode?: string, activeOnly?: boolean) =>
    axiosInstance.get<LabAnalysisAction[]>(BASE, { params: { plantCode, activeOnly } }),

  create: (data: SaveLabAnalysisActionPayload) =>
    axiosInstance.post<LabAnalysisAction>(BASE, data),

  update: (id: string, data: SaveLabAnalysisActionPayload) =>
    axiosInstance.put<LabAnalysisAction>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};

import axiosInstance from '../axiosInstance';
import type { LabEnvironmentalReport } from '../../types/lab';

const BASE = '/labenvironmental';

export const labEnvironmentalApi = {
  getAll: (plantCode?: string, date?: string, period?: string) =>
    axiosInstance.get<LabEnvironmentalReport[]>(BASE, { params: { plantCode, date, period } }),

  getById: (id: string) =>
    axiosInstance.get<LabEnvironmentalReport>(`${BASE}/${id}`),

  getByDate: (plantCode: string, date: string, period?: string) =>
    axiosInstance.get<LabEnvironmentalReport>(`${BASE}/by-date`, {
      params: { plantCode, date, period: period ?? 'Daily' },
    }),

  create: (dto: Record<string, unknown>) =>
    axiosInstance.post<LabEnvironmentalReport>(BASE, dto),

  update: (id: string, dto: Record<string, unknown>) =>
    axiosInstance.put<LabEnvironmentalReport>(`${BASE}/${id}`, dto),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};

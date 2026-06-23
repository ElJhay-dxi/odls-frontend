import axiosInstance from '../axiosInstance';
import type { DailyNaturalGasChromatograph } from '../../types/dailyNaturalGasChromatograph';

const BASE = '/dailynaturalgaschromatograph';

export const dailyNaturalGasChromatographApi = {
  getAll: (params?: { plantCode?: string; unitCode?: string; date?: string }) =>
    axiosInstance.get<DailyNaturalGasChromatograph[]>(BASE, { params }),

  getById: (id: string) =>
    axiosInstance.get<DailyNaturalGasChromatograph>(`${BASE}/${id}`),

  create: (data: Record<string, unknown>) =>
    axiosInstance.post<DailyNaturalGasChromatograph>(BASE, data),

  update: (id: string, data: Record<string, unknown>) =>
    axiosInstance.put<DailyNaturalGasChromatograph>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};
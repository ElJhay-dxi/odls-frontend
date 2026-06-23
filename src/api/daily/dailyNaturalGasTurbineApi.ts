import axiosInstance from '../axiosInstance';
import type { DailyNaturalGasTurbine } from '../../types/dailyNaturalGasTurbine';

const BASE = '/dailynaturalgasturbine';

export const dailyNaturalGasTurbineApi = {
  getAll: (params?: { plantCode?: string; unitCode?: string; date?: string }) =>
    axiosInstance.get<DailyNaturalGasTurbine[]>(BASE, { params }),

  getById: (id: string) =>
    axiosInstance.get<DailyNaturalGasTurbine>(`${BASE}/${id}`),

  create: (data: Record<string, unknown>) =>
    axiosInstance.post<DailyNaturalGasTurbine>(BASE, data),

  update: (id: string, data: Record<string, unknown>) =>
    axiosInstance.put<DailyNaturalGasTurbine>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};
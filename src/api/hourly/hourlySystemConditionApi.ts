import axiosInstance from '../axiosInstance';
import type { HourlySystemCondition } from '../../types/hourlySystemCondition';

const BASE = '/hourlysystemconditions';

export const hourlySystemConditionApi = {
  getAll: (date?: string) =>
    axiosInstance.get<HourlySystemCondition[]>(BASE, { params: date ? { date } : {} }),

  getById: (id: string) =>
    axiosInstance.get<HourlySystemCondition>(`${BASE}/${id}`),

  create: (data: Record<string, unknown>) =>
    axiosInstance.post<HourlySystemCondition>(BASE, data),

  update: (id: string, data: Record<string, unknown>) =>
    axiosInstance.put<HourlySystemCondition>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};
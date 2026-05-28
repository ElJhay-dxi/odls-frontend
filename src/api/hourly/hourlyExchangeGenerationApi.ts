import axiosInstance from '../axiosInstance';
import type { HourlyExchangeGeneration } from '../../types/hourlyExchangeGeneration';

const BASE = '/hourlyexchangegenerations';

export const hourlyExchangeGenerationApi = {
  getAll: (date?: string) =>
    axiosInstance.get<HourlyExchangeGeneration[]>(BASE, { params: date ? { date } : {} }),

  getById: (id: string) =>
    axiosInstance.get<HourlyExchangeGeneration>(`${BASE}/${id}`),

  create: (data: Record<string, unknown>) =>
    axiosInstance.post<HourlyExchangeGeneration>(BASE, data),

  update: (id: string, data: Record<string, unknown>) =>
    axiosInstance.put<HourlyExchangeGeneration>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};
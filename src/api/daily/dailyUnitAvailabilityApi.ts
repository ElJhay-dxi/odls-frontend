import axiosInstance from '../axiosInstance';
import type { DailyUnitAvailability } from '../../types/dailyUnitAvailability';

const BASE = '/dailyunitavailability';

export const dailyUnitAvailabilityApi = {
  getByDate: (plantCode: string, date: string) =>
    axiosInstance.get<DailyUnitAvailability[]>(`${BASE}/by-date`, { params: { plantCode, date } }),

  getAll: (plantCode: string) =>
    axiosInstance.get<DailyUnitAvailability[]>(BASE, { params: { plantCode } }),

  upsert: (data: Record<string, unknown>) =>
    axiosInstance.post<DailyUnitAvailability>(BASE, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};

import axiosInstance from '../axiosInstance';
import type { DailyPlantTrip } from '../../types/dailyPlantTrip';

const BASE = '/dailyplanttrips';

export const dailyPlantTripApi = {
  getAll: (params?: { plantCode?: string; date?: string }) =>
    axiosInstance.get<DailyPlantTrip[]>(BASE, { params }),

  getById: (id: string) =>
    axiosInstance.get<DailyPlantTrip>(`${BASE}/${id}`),

  create: (data: Record<string, unknown>) =>
    axiosInstance.post<DailyPlantTrip>(BASE, data),

  update: (id: string, data: Record<string, unknown>) =>
    axiosInstance.put<DailyPlantTrip>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};
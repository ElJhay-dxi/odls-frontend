import axiosInstance from '../axiosInstance';
import type { DailyUnitTrip } from '../../types/dailyUnitTrips';

const BASE = '/dailyunittrips';

export const dailyUnitTripsApi = {
  getByDate: (plantCode: string, date: string) =>
    axiosInstance.get<DailyUnitTrip[]>(`${BASE}/by-date`, { params: { plantCode, date } }),

  getAll: (plantCode: string) =>
    axiosInstance.get<DailyUnitTrip[]>(BASE, { params: { plantCode } }),

  upsert: (data: Record<string, unknown>) =>
    axiosInstance.post<DailyUnitTrip>(BASE, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};

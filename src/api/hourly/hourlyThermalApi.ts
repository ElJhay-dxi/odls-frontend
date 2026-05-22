import axiosInstance from '../axiosInstance';
import type { HourlyThermalReading } from '../../types/hourlyReadings';

const BASE = '/hourlythermalreadings';

interface GetAllParams {
  plantCode?: string;
  unitCode?: string;
  date?: string;
}

export const hourlyThermalApi = {
  getAll: (params?: GetAllParams) =>
    axiosInstance.get<HourlyThermalReading[]>(BASE, { params }),

  getById: (id: string) =>
    axiosInstance.get<HourlyThermalReading>(`${BASE}/${id}`),

  create: (data: Record<string, unknown>) =>
    axiosInstance.post<HourlyThermalReading>(BASE, data),

  update: (id: string, data: Record<string, unknown>) =>
    axiosInstance.put<HourlyThermalReading>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};
import axiosInstance from '../axiosInstance';
import type {
  HourlyHydroReading,
  CreateHourlyHydroReadingPayload,
  UpdateHourlyHydroReadingPayload,
} from '../../types/hourlyReadings';

const BASE = '/hourlyhydroreadings';

interface GetAllParams {
  plantCode?: string;
  unitCode?: string;
  date?: string;
}

export const hourlyHydroApi = {
  getAll: (params?: GetAllParams) =>
    axiosInstance.get<HourlyHydroReading[]>(BASE, { params }),

  getById: (id: string) =>
    axiosInstance.get<HourlyHydroReading>(`${BASE}/${id}`),

  create: (data: CreateHourlyHydroReadingPayload) =>
    axiosInstance.post<HourlyHydroReading>(BASE, data),

  update: (id: string, data: UpdateHourlyHydroReadingPayload) =>
    axiosInstance.put<HourlyHydroReading>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};
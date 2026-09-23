import axiosInstance from '../axiosInstance';
import type { HourlyThermalReading } from '../../types/hourlyReadings';
import type { BearingMetal, BearingDrain } from '../../types/bearings';

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

export const bearingMetalApi = {
  getAll: (plantCode?: string, unitCode?: string) =>
    axiosInstance.get<BearingMetal[]>('/bearingmetals', { params: { plantCode: plantCode || undefined, unitCode: unitCode || undefined } }),

  create: (data: { plantCode: string; unitCode: string; bearingCode: number; bearingName: string; kkxCode?: string | null }) =>
    axiosInstance.post<BearingMetal>('/bearingmetals', data),

  update: (id: string, data: { bearingName: string; kkxCode?: string | null }) =>
    axiosInstance.put<BearingMetal>(`/bearingmetals/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`/bearingmetals/${id}`),
};

export const bearingDrainApi = {
  getAll: (plantCode?: string, unitCode?: string) =>
    axiosInstance.get<BearingDrain[]>('/bearingdrains', { params: { plantCode: plantCode || undefined, unitCode: unitCode || undefined } }),

  create: (data: { plantCode: string; unitCode: string; drainCode: number; drainName: string; kkxCode?: string | null }) =>
    axiosInstance.post<BearingDrain>('/bearingdrains', data),

  update: (id: string, data: { drainName: string; kkxCode?: string | null }) =>
    axiosInstance.put<BearingDrain>(`/bearingdrains/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`/bearingdrains/${id}`),
};
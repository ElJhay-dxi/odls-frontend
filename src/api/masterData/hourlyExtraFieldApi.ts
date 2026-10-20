import axiosInstance from '../axiosInstance';
import type { HourlyExtraField, SaveHourlyExtraFieldDto, LookupSourceInfo, LookupOption } from '../../types/hourlyExtraField';

const BASE = '/hourlyextrafields';

export const hourlyExtraFieldApi = {
  getAll: (params?: { plantCode?: string; logType?: string; activeOnly?: boolean }) =>
    axiosInstance.get<HourlyExtraField[]>(BASE, { params }),

  getById: (id: string) =>
    axiosInstance.get<HourlyExtraField>(`${BASE}/${id}`),

  create: (data: SaveHourlyExtraFieldDto) =>
    axiosInstance.post<HourlyExtraField>(BASE, data),

  update: (id: string, data: SaveHourlyExtraFieldDto) =>
    axiosInstance.put<HourlyExtraField>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),

  /** Master data a "Pick from master data" field can reference. */
  getLookupSources: () =>
    axiosInstance.get<LookupSourceInfo[]>(`${BASE}/lookup-sources`),

  /** Choices for a lookup field, filtered to the plant (and unit, for unit-scoped sources). */
  getLookupOptions: (params: { source: string; plantCode: string; unitCode?: string }) =>
    axiosInstance.get<LookupOption[]>(`${BASE}/lookup-options`, { params }),
};

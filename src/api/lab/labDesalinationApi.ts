import axiosInstance from '../axiosInstance';
import type { LabDesalinationLog } from '../../types/lab';

const BASE = '/labdesalination';

export type DesalSection = 'uf' | 'swro' | 'bwro' | 'clarifier' | 'px' | 'productwater';

export const labDesalinationApi = {
  getAll: (params?: { plantCode?: string; date?: string }) =>
    axiosInstance.get<LabDesalinationLog[]>(BASE, { params }),

  getByDate: (plantCode: string, date: string) =>
    axiosInstance.get<LabDesalinationLog>(`${BASE}/by-date`, { params: { plantCode, date } }),

  getById: (id: string) =>
    axiosInstance.get<LabDesalinationLog>(`${BASE}/${id}`),

  create: (data: Record<string, unknown>) =>
    axiosInstance.post<LabDesalinationLog>(BASE, data),

  update: (id: string, data: Record<string, unknown>) =>
    axiosInstance.put<LabDesalinationLog>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),

  // Timed readings: every call returns the full, refreshed log
  addReading: (logId: string, section: DesalSection, data: Record<string, unknown>) =>
    axiosInstance.post<LabDesalinationLog>(`${BASE}/${logId}/${section}`, data),

  updateReading: (logId: string, section: DesalSection, id: string, data: Record<string, unknown>) =>
    axiosInstance.put<LabDesalinationLog>(`${BASE}/${logId}/${section}/${id}`, data),

  deleteReading: (logId: string, section: DesalSection, id: string) =>
    axiosInstance.delete<LabDesalinationLog>(`${BASE}/${logId}/${section}/${id}`),

  // Timeline entries
  addEntry: (logId: string, data: { entryTime: string; shiftCode?: string; category: string; entryText: string }) =>
    axiosInstance.post<LabDesalinationLog>(`${BASE}/${logId}/entries`, data),

  updateEntry: (logId: string, entryId: string, data: { entryTime: string; shiftCode?: string; category: string; entryText: string }) =>
    axiosInstance.put<LabDesalinationLog>(`${BASE}/${logId}/entries/${entryId}`, data),

  deleteEntry: (logId: string, entryId: string) =>
    axiosInstance.delete<LabDesalinationLog>(`${BASE}/${logId}/entries/${entryId}`),

  getSuggestions: () =>
    axiosInstance.get<{ categories: string[] }>(`${BASE}/suggestions`),
};

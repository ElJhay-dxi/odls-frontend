import axiosInstance from '../axiosInstance';
import type { LabShiftLog, LabShiftLogEntry } from '../../types/lab';

const BASE = '/labshiftlogs';

export const labShiftLogApi = {
  getAll: (params?: { plantCode?: string; date?: string }) =>
    axiosInstance.get<LabShiftLog[]>(BASE, { params }),

  getByDate: (plantCode: string, date: string) =>
    axiosInstance.get<LabShiftLog>(`${BASE}/by-date`, { params: { plantCode, date } }),

  getById: (id: string) =>
    axiosInstance.get<LabShiftLog>(`${BASE}/${id}`),

  create: (data: Record<string, unknown>) =>
    axiosInstance.post<LabShiftLog>(BASE, data),

  update: (id: string, data: Record<string, unknown>) =>
    axiosInstance.put<LabShiftLog>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),

  addEntry: (logId: string, data: Record<string, unknown>) =>
    axiosInstance.post<LabShiftLogEntry>(`${BASE}/${logId}/entries`, data),

  updateEntry: (logId: string, entryId: string, data: Record<string, unknown>) =>
    axiosInstance.put<LabShiftLogEntry>(`${BASE}/${logId}/entries/${entryId}`, data),

  deleteEntry: (logId: string, entryId: string) =>
    axiosInstance.delete(`${BASE}/${logId}/entries/${entryId}`),
};

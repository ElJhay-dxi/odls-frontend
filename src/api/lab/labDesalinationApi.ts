import axiosInstance from '../axiosInstance';
import type { LabDesalinationLog } from '../../types/lab';

const BASE = '/labdesalination';

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

  saveUF: (logId: string, data: Record<string, unknown>) =>
    axiosInstance.post<LabDesalinationLog>(`${BASE}/${logId}/uf`, data),

  saveSWRO: (logId: string, data: Record<string, unknown>) =>
    axiosInstance.post<LabDesalinationLog>(`${BASE}/${logId}/swro`, data),

  saveBWRO: (logId: string, data: Record<string, unknown>) =>
    axiosInstance.post<LabDesalinationLog>(`${BASE}/${logId}/bwro`, data),

  saveClarifier: (logId: string, data: Record<string, unknown>) =>
    axiosInstance.post<LabDesalinationLog>(`${BASE}/${logId}/clarifier`, data),

  savePX: (logId: string, data: Record<string, unknown>) =>
    axiosInstance.post<LabDesalinationLog>(`${BASE}/${logId}/px`, data),

  saveProductWater: (logId: string, data: Record<string, unknown>) =>
    axiosInstance.post<LabDesalinationLog>(`${BASE}/${logId}/productwater`, data),
};

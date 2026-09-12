import axiosInstance from '../axiosInstance';
import type { LabChemicalDosingRow } from '../../types/lab';

const BASE = '/labchemicaldosing';

export const labChemicalDosingApi = {
  getAll: (params?: { plantCode?: string; date?: string }) =>
    axiosInstance.get<LabChemicalDosingRow[]>(BASE, { params }),

  getByDate: (plantCode: string, date: string) =>
    axiosInstance.get<LabChemicalDosingRow[]>(`${BASE}/by-date`, { params: { plantCode, date } }),

  getById: (id: string) =>
    axiosInstance.get<LabChemicalDosingRow>(`${BASE}/${id}`),

  create: (data: Record<string, unknown>) =>
    axiosInstance.post<LabChemicalDosingRow>(BASE, data),

  update: (id: string, data: Record<string, unknown>) =>
    axiosInstance.put<LabChemicalDosingRow>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),

  saveAll: (plantCode: string, logDate: string, rows: Record<string, unknown>[]) =>
    axiosInstance.post<LabChemicalDosingRow[]>(`${BASE}/save-all`, { plantCode, logDate, rows }),
};

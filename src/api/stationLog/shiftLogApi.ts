import axiosInstance from '../axiosInstance';
import type { ShiftLog, CreateShiftLogForm, UpdateShiftLogForm, ShiftLogOfficer } from '../../types/shiftLog';

const BASE = '/shiftlogs';

interface GetAllParams {
  plantCode?: string;
  date?: string;
}

interface PreviousOfficersParams {
  plantCode: string;
  date: string;
  shiftCode: string;
}

export const shiftLogApi = {
  getAll: (params?: GetAllParams) =>
    axiosInstance.get<ShiftLog[]>(BASE, { params }),

  getById: (id: string) =>
    axiosInstance.get<ShiftLog>(`${BASE}/${id}`),

  create: (data: CreateShiftLogForm) =>
    axiosInstance.post<ShiftLog>(BASE, data),

  update: (id: string, data: UpdateShiftLogForm) =>
    axiosInstance.put<ShiftLog>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),

  getPreviousOfficers: (params: PreviousOfficersParams) =>
    axiosInstance.get<ShiftLogOfficer[]>(`${BASE}/previous-officers`, { params }),
};
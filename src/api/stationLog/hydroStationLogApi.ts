import axiosInstance from '../axiosInstance';
import type {
  HydroStationLog,
  CreateHydroStationLogForm,
  UpdateHydroStationLogForm,
  HydroStationLogEntry,
  CreateHydroStationLogEntryForm,
  UpdateHydroStationLogEntryForm,
} from '../../types/hydroStationLog';

const BASE = '/hydrostationlogs';

export const hydroStationLogApi = {
  getAll: (params?: { plantCode?: string; date?: string }) =>
    axiosInstance.get<HydroStationLog[]>(BASE, { params }),

  getById: (id: string) =>
    axiosInstance.get<HydroStationLog>(`${BASE}/${id}`),

  getByDate: (plantCode: string, date: string) =>
    axiosInstance.get<HydroStationLog>(`${BASE}/by-date`, { params: { plantCode, date } }),

  create: (data: CreateHydroStationLogForm) =>
    axiosInstance.post<HydroStationLog>(BASE, data),

  update: (id: string, data: UpdateHydroStationLogForm) =>
    axiosInstance.put<HydroStationLog>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),

  // Entries
  addEntry: (logId: string, data: CreateHydroStationLogEntryForm) =>
    axiosInstance.post<HydroStationLogEntry>(`${BASE}/${logId}/entries`, data),

  updateEntry: (logId: string, entryId: string, data: UpdateHydroStationLogEntryForm) =>
    axiosInstance.put<HydroStationLogEntry>(`${BASE}/${logId}/entries/${entryId}`, data),

  deleteEntry: (logId: string, entryId: string) =>
    axiosInstance.delete(`${BASE}/${logId}/entries/${entryId}`),
};
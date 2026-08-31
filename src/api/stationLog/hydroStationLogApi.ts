import axiosInstance from '../axiosInstance';
import type {
  HydroStationLogPermit, HydroStationLogPermitForm,
  HydroStationLog,
  CreateHydroStationLogForm,
  UpdateHydroStationLogForm,
  HydroStationLogEntry,
  HydroStationLogCondition,
  CreateHydroStationLogEntryForm,
  UpdateHydroStationLogEntryForm,
  CreateConditionForm,
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

  // Condition snapshots
  addCondition: (logId: string, data: CreateConditionForm) =>
    axiosInstance.post<HydroStationLogCondition>(`${BASE}/${logId}/conditions`, {
      snapshotTime: data.snapshotTime,
      source: data.source || null,
      systemVoltageKv: data.systemVoltageKv !== '' ? Number(data.systemVoltageKv) : null,
      rows: data.rows.map((r, idx) => ({
        plantCode: r.plantCode,
        plantName: r.plantName,
        numberOfUnits: r.numberOfUnits !== '' ? Number(r.numberOfUnits) : null,
        totalLoadMw: r.totalLoadMw !== '' ? Number(r.totalLoadMw) : null,
        sortOrder: idx,
      })),
    }),

  updateCondition: (logId: string, conditionId: string, data: CreateConditionForm) =>
    axiosInstance.put<HydroStationLogCondition>(`${BASE}/${logId}/conditions/${conditionId}`, {
      snapshotTime: data.snapshotTime,
      source: data.source || null,
      systemVoltageKv: data.systemVoltageKv !== '' ? Number(data.systemVoltageKv) : null,
      rows: data.rows.map((r, idx) => ({
        plantCode: r.plantCode,
        plantName: r.plantName,
        numberOfUnits: r.numberOfUnits !== '' ? Number(r.numberOfUnits) : null,
        totalLoadMw: r.totalLoadMw !== '' ? Number(r.totalLoadMw) : null,
        sortOrder: idx,
      })),
    }),

  deleteCondition: (logId: string, conditionId: string) =>
  axiosInstance.delete(`${BASE}/${logId}/conditions/${conditionId}`),
  
  // Permits
  addPermit: (logId: string, data: HydroStationLogPermitForm) =>
    axiosInstance.post<HydroStationLogPermit>(`${BASE}/${logId}/permits`, {
      permitTypeCode: data.permitTypeCode || null,
      permitTypeName: data.permitTypeName || null,
      permitNumber: data.permitNumber || null,
      workOrderNumber: data.workOrderNumber || null,
      permitHolder: data.permitHolder || null,
      workDescription: data.workDescription || null,
      startDate: data.startDate || null,
      completionDate: data.completionDate || null,
      sortOrder: data.sortOrder,
    }),

  updatePermit: (logId: string, permitId: string, data: HydroStationLogPermitForm) =>
    axiosInstance.put<HydroStationLogPermit>(`${BASE}/${logId}/permits/${permitId}`, {
      permitTypeCode: data.permitTypeCode || null,
      permitTypeName: data.permitTypeName || null,
      permitNumber: data.permitNumber || null,
      workOrderNumber: data.workOrderNumber || null,
      permitHolder: data.permitHolder || null,
      workDescription: data.workDescription || null,
      startDate: data.startDate || null,
      completionDate: data.completionDate || null,
      sortOrder: data.sortOrder,
    }),

  deletePermit: (logId: string, permitId: string) =>
    axiosInstance.delete(`${BASE}/${logId}/permits/${permitId}`),
};
import axiosInstance from '../axiosInstance';
import type {
  ThermalCriticalIssue,
  ThermalOversightEntry,
  ThermalShiftInfo,
  ThermalEquipmentStatus,
} from '../../types/thermalStationLog';

const BASE = '/thermalstationlogs';

export const thermalStationLogAdditionsApi = {
  // Critical Issues
  getCriticalIssues: (logId: string) =>
    axiosInstance.get<ThermalCriticalIssue[]>(`${BASE}/${logId}/criticalissues`),

  addCriticalIssue: (logId: string, dto: Record<string, unknown>) =>
    axiosInstance.post<ThermalCriticalIssue>(`${BASE}/${logId}/criticalissues`, dto),

  updateCriticalIssue: (logId: string, issueId: string, dto: Record<string, unknown>) =>
    axiosInstance.put<ThermalCriticalIssue>(`${BASE}/${logId}/criticalissues/${issueId}`, dto),

  deleteCriticalIssue: (logId: string, issueId: string) =>
    axiosInstance.delete(`${BASE}/${logId}/criticalissues/${issueId}`),

  // Oversight Entries (TICO/CENIT)
  getOversightEntries: (logId: string, oversightPlantCode?: string) =>
    axiosInstance.get<ThermalOversightEntry[]>(`${BASE}/${logId}/oversightentries`, {
      params: { oversightPlantCode },
    }),

  addOversightEntry: (logId: string, dto: Record<string, unknown>) =>
    axiosInstance.post<ThermalOversightEntry>(`${BASE}/${logId}/oversightentries`, dto),

  updateOversightEntry: (logId: string, entryId: string, dto: Record<string, unknown>) =>
    axiosInstance.put<ThermalOversightEntry>(`${BASE}/${logId}/oversightentries/${entryId}`, dto),

  deleteOversightEntry: (logId: string, entryId: string) =>
    axiosInstance.delete(`${BASE}/${logId}/oversightentries/${entryId}`),

  // Shift Info
  getShiftInfo: (logId: string) =>
    axiosInstance.get<ThermalShiftInfo[]>(`${BASE}/${logId}/shiftinfo`),

  saveShiftInfo: (logId: string, dto: Record<string, unknown>) =>
    axiosInstance.post<ThermalShiftInfo>(`${BASE}/${logId}/shiftinfo`, dto),

  // Equipment Status
  getEquipmentStatus: (logId: string, category?: string) =>
    axiosInstance.get<ThermalEquipmentStatus[]>(`${BASE}/${logId}/equipmentstatus`, {
      params: { category },
    }),

  saveAllEquipmentStatus: (logId: string, category: string, items: Record<string, unknown>[]) =>
    axiosInstance.post<ThermalEquipmentStatus[]>(`${BASE}/${logId}/equipmentstatus/save-all`, {
      category,
      items,
    }),
};

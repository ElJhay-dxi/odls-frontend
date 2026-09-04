import axiosInstance from '../axiosInstance';
import type {
  HydroDailyPlantReportRow,
  HydroHourlySummaryRow,
  HydroAvailabilityReport,
} from '../../types/hydroReports';

const BASE = '/hydroreports';

export type HydroReportKind = 'dailyplant' | 'hourlysummary' | 'availability';

const rangeParams = (plantCode: string, dateFrom: string, dateTo: string) => ({
  plantCode, dateFrom, dateTo,
});

export const getHydroReportsApi = {
  getDailyPlant: (plantCode: string, dateFrom: string, dateTo: string) =>
    axiosInstance.get<HydroDailyPlantReportRow[]>(`${BASE}/dailyplant`, {
      params: rangeParams(plantCode, dateFrom, dateTo),
    }),

  getHourlySummary: (plantCode: string, dateFrom: string, dateTo: string) =>
    axiosInstance.get<HydroHourlySummaryRow[]>(`${BASE}/hourlysummary`, {
      params: rangeParams(plantCode, dateFrom, dateTo),
    }),

  getAvailability: (plantCode: string, dateFrom: string, dateTo: string) =>
    axiosInstance.get<HydroAvailabilityReport>(`${BASE}/availability`, {
      params: rangeParams(plantCode, dateFrom, dateTo),
    }),

  // Blob downloads go through axiosInstance (not window.open) so the MSAL bearer
  // token from the request interceptor is attached — the export endpoints require auth.
  exportExcel: (kind: HydroReportKind, plantCode: string, dateFrom: string, dateTo: string) =>
    axiosInstance.get(`${BASE}/${kind}/export/excel`, {
      params: rangeParams(plantCode, dateFrom, dateTo),
      responseType: 'blob',
    }),

  exportPdf: (kind: HydroReportKind, plantCode: string, dateFrom: string, dateTo: string) =>
    axiosInstance.get(`${BASE}/${kind}/export/pdf`, {
      params: rangeParams(plantCode, dateFrom, dateTo),
      responseType: 'blob',
    }),
};

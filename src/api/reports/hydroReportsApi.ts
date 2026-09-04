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

  // Opens the backend's generated workbook directly in a new tab/download.
  exportExcel: (report: HydroReportKind, plantCode: string, dateFrom: string, dateTo: string) => {
    const params = new URLSearchParams({ plantCode, dateFrom, dateTo });
    window.open(`${import.meta.env.VITE_API_BASE_URL}/hydroreports/${report}/export/excel?${params}`);
  },
};

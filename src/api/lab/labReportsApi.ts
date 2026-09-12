import axiosInstance from '../axiosInstance';
import type {
  LabWaterQualityRow,
  LabChemicalConsumptionRow,
  LabLubeOilRow,
  LabEnvironmentalReport,
  LabDesalinationRow,
  LabShiftSummaryReport,
} from '../../types/labReports';

const BASE = '/labreports';

export type LabReportKind =
  | 'waterquality' | 'chemicalconsumption' | 'lubeoil'
  | 'environmental' | 'desalination' | 'shiftsummary';

const rangeParams = (plantCode: string, dateFrom: string, dateTo: string) => ({
  plantCode, dateFrom, dateTo,
});

export const labReportsApi = {
  getWaterQuality: (plantCode: string, dateFrom: string, dateTo: string, samplePoint?: string, sampleType?: string) =>
    axiosInstance.get<LabWaterQualityRow[]>(`${BASE}/waterquality`, {
      params: { ...rangeParams(plantCode, dateFrom, dateTo), samplePoint: samplePoint || undefined, sampleType: sampleType || undefined },
    }),

  getChemicalConsumption: (plantCode: string, dateFrom: string, dateTo: string) =>
    axiosInstance.get<LabChemicalConsumptionRow[]>(`${BASE}/chemicalconsumption`, {
      params: rangeParams(plantCode, dateFrom, dateTo),
    }),

  getLubeOil: (plantCode: string, dateFrom: string, dateTo: string) =>
    axiosInstance.get<LabLubeOilRow[]>(`${BASE}/lubeoil`, {
      params: rangeParams(plantCode, dateFrom, dateTo),
    }),

  getEnvironmental: (plantCode: string, dateFrom: string, dateTo: string, period?: string) =>
    axiosInstance.get<LabEnvironmentalReport>(`${BASE}/environmental`, {
      params: { plantCode, dateFrom, dateTo, period: period ?? 'quarterly' },
    }),

  getDesalination: (plantCode: string, dateFrom: string, dateTo: string) =>
    axiosInstance.get<LabDesalinationRow[]>(`${BASE}/desalination`, {
      params: rangeParams(plantCode, dateFrom, dateTo),
    }),

  getShiftSummary: (plantCode: string, dateFrom: string, dateTo: string) =>
    axiosInstance.get<LabShiftSummaryReport>(`${BASE}/shiftsummary`, {
      params: rangeParams(plantCode, dateFrom, dateTo),
    }),

  // Opens the backend's generated workbook directly in a new tab/download.
  exportExcel: (report: LabReportKind, plantCode: string, dateFrom: string, dateTo: string, period?: string) => {
    const params = new URLSearchParams({ plantCode, dateFrom, dateTo });
    if (report === 'environmental') params.set('period', period ?? 'quarterly');
    window.open(`${import.meta.env.VITE_API_BASE_URL}/labreports/${report}/export/excel?${params}`);
  },
};

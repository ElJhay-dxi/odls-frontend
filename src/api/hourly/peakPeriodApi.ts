import axiosInstance from '../axiosInstance';
import type { PeakPeriodReading } from '../../types/peakPeriod';

const BASE = '/peakperiodreadings';

export const peakPeriodApi = {
  getAll: (params?: { plantCode?: string; unitCode?: string; date?: string }) =>
    axiosInstance.get<PeakPeriodReading[]>(BASE, { params }),

  getById: (id: string) =>
    axiosInstance.get<PeakPeriodReading>(`${BASE}/${id}`),

  // Create header record (auto-called before first interval if no record exists yet)
  create: (data: { plantCode: string; unitCode: string; logDate: string; remarks?: string }) =>
    axiosInstance.post<PeakPeriodReading>(BASE, data),

  // Add a single interval to an existing header
  addInterval: (id: string, data: { intervalTime: string; mW?: number; mVar?: number; voltage?: number }) =>
    axiosInstance.post<PeakPeriodReading>(`${BASE}/${id}/intervals`, data),

  // Update a single interval's values
  updateInterval: (id: string, intervalId: string, data: { intervalTime: string; mW?: number; mVar?: number; voltage?: number }) =>
    axiosInstance.put<PeakPeriodReading>(`${BASE}/${id}/intervals/${intervalId}`, data),

  // Update remarks on the header
  updateRemarks: (id: string, remarks: string | undefined) =>
    axiosInstance.put<PeakPeriodReading>(`${BASE}/${id}/remarks`, { remarks }),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),

  deleteInterval: (id: string, intervalId: string) =>
    axiosInstance.delete(`${BASE}/${id}/intervals/${intervalId}`),
};
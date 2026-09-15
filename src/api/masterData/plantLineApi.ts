import axiosInstance from '../axiosInstance';
import type { PlantLine } from '../../types/masterData';

const BASE = '/plantlines';

export const plantLineApi = {
  getAll: (plantCode?: string) =>
    axiosInstance.get<PlantLine[]>(BASE, { params: plantCode ? { plantCode } : undefined }),

  getById: (id: string) =>
    axiosInstance.get<PlantLine>(`${BASE}/${id}`),

  create: (dto: { plantCode: string; lineCode: string; lineName: string }) =>
    axiosInstance.post<PlantLine>(BASE, dto),

  update: (id: string, lineName: string) =>
    axiosInstance.put<PlantLine>(`${BASE}/${id}`, { lineName }),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};

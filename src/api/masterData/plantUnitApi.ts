import axiosInstance from '../axiosInstance';
import type { PlantUnit, PlantUnitForm } from '../../types/masterData';

const BASE = '/plantunits';

export const plantUnitApi = {
  getAll: () =>
    axiosInstance.get<PlantUnit[]>(BASE),

  getByPlant: (plantCode: string) =>
    axiosInstance.get<PlantUnit[]>(`${BASE}/plant/${plantCode}`),

  getById: (id: string) =>
    axiosInstance.get<PlantUnit>(`${BASE}/${id}`),

  create: (data: PlantUnitForm) =>
    axiosInstance.post<PlantUnit>(BASE, data),

  update: (id: string, data: PlantUnitForm) =>
    axiosInstance.put<PlantUnit>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};
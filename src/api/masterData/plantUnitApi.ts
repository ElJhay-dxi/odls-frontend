import axiosInstance from '../axiosInstance';
import type { PlantUnit, PlantUnitForm, UpdatePlantUnitForm } from '../../types/masterData';

const BASE = '/plantunits';

export const plantUnitApi = {
  getAll: () =>
    axiosInstance.get<PlantUnit[]>(BASE),

  getByPlant: (plantCode: string) =>
    axiosInstance.get<PlantUnit[]>(`${BASE}/plant/${plantCode}`),

  getById: (id: string) =>
    axiosInstance.get<PlantUnit>(`${BASE}/${id}`),

  // Backend resolves PlantName from PlantCode
  create: (data: PlantUnitForm) =>
    axiosInstance.post<PlantUnit>(BASE, data),

  // PlantCode and PlantName are immutable — only unit fields updatable
  update: (id: string, data: UpdatePlantUnitForm) =>
    axiosInstance.put<PlantUnit>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};
import axiosInstance from '../axiosInstance';
import type { PlantUnitSystem, PlantUnitSystemForm, UpdatePlantUnitSystemForm } from '../../types/masterData';

const BASE = '/plantunitsystems';

export const plantUnitSystemApi = {
  getAll: () =>
    axiosInstance.get<PlantUnitSystem[]>(BASE),

  getByUnit: (plantCode: string, unitCode: string) =>
    axiosInstance.get<PlantUnitSystem[]>(`${BASE}/unit/${plantCode}/${unitCode}`),

  getById: (id: string) =>
    axiosInstance.get<PlantUnitSystem>(`${BASE}/${id}`),

  // Backend resolves PlantName and UnitName from codes
  create: (data: PlantUnitSystemForm) =>
    axiosInstance.post<PlantUnitSystem>(BASE, data),

  // Only SystemName and SystemCode are updatable
  update: (id: string, data: UpdatePlantUnitSystemForm) =>
    axiosInstance.put<PlantUnitSystem>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};
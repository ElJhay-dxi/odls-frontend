import axiosInstance from '../axiosInstance';
import type { PlantUnitSubSystem, PlantUnitSubSystemForm, UpdatePlantUnitSubSystemForm } from '../../types/masterData';

const BASE = '/plantunitsubsystems';

export const plantUnitSubSystemApi = {
  getAll: () =>
    axiosInstance.get<PlantUnitSubSystem[]>(BASE),

  getBySystem: (plantCode: string, unitCode: string, systemCode: string) =>
    axiosInstance.get<PlantUnitSubSystem[]>(`${BASE}/system/${plantCode}/${unitCode}/${systemCode}`),

  getById: (id: string) =>
    axiosInstance.get<PlantUnitSubSystem>(`${BASE}/${id}`),

  // Backend resolves PlantName, UnitName and SystemName from codes
  create: (data: PlantUnitSubSystemForm) =>
    axiosInstance.post<PlantUnitSubSystem>(BASE, data),

  // Only SubSystemName and SubSystemCode are updatable
  update: (id: string, data: UpdatePlantUnitSubSystemForm) =>
    axiosInstance.put<PlantUnitSubSystem>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};
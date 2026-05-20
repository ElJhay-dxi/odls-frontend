import axiosInstance from '../axiosInstance';
import type { BopSubSystem, BopSubSystemForm, UpdateBopSubSystemForm } from '../../types/masterData';

const BASE = '/bopsubsystems';

export const bopSubSystemApi = {
  getAll: () =>
    axiosInstance.get<BopSubSystem[]>(BASE),

  getBySystem: (plantCode: string, bopCode: string, systemCode: string) =>
    axiosInstance.get<BopSubSystem[]>(`${BASE}/system/${plantCode}/${bopCode}/${systemCode}`),

  getById: (id: string) =>
    axiosInstance.get<BopSubSystem>(`${BASE}/${id}`),

  // Backend resolves PlantName, BOPName and SystemName from codes
  create: (data: BopSubSystemForm) =>
    axiosInstance.post<BopSubSystem>(BASE, data),

  // Only SubSystemName and SubSystemCode are updatable
  update: (id: string, data: UpdateBopSubSystemForm) =>
    axiosInstance.put<BopSubSystem>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};
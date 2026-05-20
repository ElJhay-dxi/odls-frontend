import axiosInstance from '../axiosInstance';
import type { BopSystem, BopSystemForm, UpdateBopSystemForm } from '../../types/masterData';

const BASE = '/bopsystems';

export const bopSystemApi = {
  getAll: () =>
    axiosInstance.get<BopSystem[]>(BASE),

  getByBop: (plantCode: string, bopCode: string) =>
    axiosInstance.get<BopSystem[]>(`${BASE}/bop/${plantCode}/${bopCode}`),

  getById: (id: string) =>
    axiosInstance.get<BopSystem>(`${BASE}/${id}`),

  // Backend resolves PlantName and BOPName from codes
  create: (data: BopSystemForm) =>
    axiosInstance.post<BopSystem>(BASE, data),

  // Only SystemName and SystemCode are updatable
  update: (id: string, data: UpdateBopSystemForm) =>
    axiosInstance.put<BopSystem>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};
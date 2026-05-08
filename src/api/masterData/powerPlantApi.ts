import axiosInstance from '../axiosInstance';
import type { PowerPlant, PowerPlantForm } from '../../types/masterData';

const BASE = '/powerplants';

export const powerPlantApi = {
  getAll: () =>
    axiosInstance.get<PowerPlant[]>(BASE),

  getById: (id: string) =>
    axiosInstance.get<PowerPlant>(`${BASE}/${id}`),

  getByCode: (plantCode: string) =>
    axiosInstance.get<PowerPlant>(`${BASE}/code/${plantCode}`),

  create: (data: PowerPlantForm) =>
    axiosInstance.post<PowerPlant>(BASE, data),

  update: (id: string, data: PowerPlantForm) =>
    axiosInstance.put<PowerPlant>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};
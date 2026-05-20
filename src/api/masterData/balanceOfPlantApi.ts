import axiosInstance from '../axiosInstance';
import type { BalanceOfPlant, BalanceOfPlantForm, UpdateBalanceOfPlantForm } from '../../types/masterData';

const BASE = '/balanceofplant';

export const balanceOfPlantApi = {
  getAll: () =>
    axiosInstance.get<BalanceOfPlant[]>(BASE),

  getByPlant: (plantCode: string) =>
    axiosInstance.get<BalanceOfPlant[]>(`${BASE}/plant/${plantCode}`),

  getById: (id: string) =>
    axiosInstance.get<BalanceOfPlant>(`${BASE}/${id}`),

  // Backend resolves PlantName from PlantCode
  create: (data: BalanceOfPlantForm) =>
    axiosInstance.post<BalanceOfPlant>(BASE, data),

  // Only BOPName and BOPCode are updatable
  update: (id: string, data: UpdateBalanceOfPlantForm) =>
    axiosInstance.put<BalanceOfPlant>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};
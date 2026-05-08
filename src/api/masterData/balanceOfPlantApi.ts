import axiosInstance from '../axiosInstance';
import type {
    BalanceOfPlant, BalanceOfPlantForm,
} from '../../types/masterData';

// ─── Balance of Plant ──────────────────────────────────────────────────────────
export const balanceOfPlantApi = {
  getAll: () => axiosInstance.get<BalanceOfPlant[]>('/balanceofplant'),
  getByPlant: (plantCode: string) => axiosInstance.get<BalanceOfPlant[]>(`/balanceofplant/plant/${plantCode}`),
  getById: (id: string) => axiosInstance.get<BalanceOfPlant>(`/balanceofplant/${id}`),
  create: (data: BalanceOfPlantForm) => axiosInstance.post<BalanceOfPlant>('/balanceofplant', data),
  update: (id: string, data: BalanceOfPlantForm) => axiosInstance.put<BalanceOfPlant>(`/balanceofplant/${id}`, data),
  delete: (id: string) => axiosInstance.delete(`/balanceofplant/${id}`),
};


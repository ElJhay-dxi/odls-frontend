import axiosInstance from '../axiosInstance';
import type {
    BopSystem, BopSystemForm,
} from '../../types/masterData';

// ─── BOP System ────────────────────────────────────────────────────────────────
export const bopSystemApi = {
  getAll: () => axiosInstance.get<BopSystem[]>('/bopsystems'),
  getByBop: (plantCode: string, bopCode: string) =>
    axiosInstance.get<BopSystem[]>(`/bopsystems/bop/${plantCode}/${bopCode}`),
  getById: (id: string) => axiosInstance.get<BopSystem>(`/bopsystems/${id}`),
  create: (data: BopSystemForm) => axiosInstance.post<BopSystem>('/bopsystems', data),
  update: (id: string, data: BopSystemForm) => axiosInstance.put<BopSystem>(`/bopsystems/${id}`, data),
  delete: (id: string) => axiosInstance.delete(`/bopsystems/${id}`),
};
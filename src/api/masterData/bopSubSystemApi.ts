import axiosInstance from '../axiosInstance';
import type {
    BopSubSystem, BopSubSystemForm,
} from '../../types/masterData';

// ─── BOP SubSystem ─────────────────────────────────────────────────────────────
export const bopSubSystemApi = {
  getAll: () => axiosInstance.get<BopSubSystem[]>('/bopsubsystems'),
  getBySystem: (plantCode: string, bopCode: string, systemCode: string) =>
    axiosInstance.get<BopSubSystem[]>(`/bopsubsystems/system/${plantCode}/${bopCode}/${systemCode}`),
  getById: (id: string) => axiosInstance.get<BopSubSystem>(`/bopsubsystems/${id}`),
  create: (data: BopSubSystemForm) => axiosInstance.post<BopSubSystem>('/bopsubsystems', data),
  update: (id: string, data: BopSubSystemForm) => axiosInstance.put<BopSubSystem>(`/bopsubsystems/${id}`, data),
  delete: (id: string) => axiosInstance.delete(`/bopsubsystems/${id}`),
};
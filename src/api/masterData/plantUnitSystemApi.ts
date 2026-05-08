import axiosInstance from '../axiosInstance';
import type {
    PlantUnitSystem, PlantUnitSystemForm,
} from '../../types/masterData';

// ─── Plant Unit System ─────────────────────────────────────────────────────────
export const plantUnitSystemApi = {
  getAll: () => axiosInstance.get<PlantUnitSystem[]>('/plantunitsystems'),
  getByUnit: (plantCode: string, unitCode: string) =>
    axiosInstance.get<PlantUnitSystem[]>(`/plantunitsystems/unit/${plantCode}/${unitCode}`),
  getById: (id: string) => axiosInstance.get<PlantUnitSystem>(`/plantunitsystems/${id}`),
  create: (data: PlantUnitSystemForm) => axiosInstance.post<PlantUnitSystem>('/plantunitsystems', data),
  update: (id: string, data: PlantUnitSystemForm) => axiosInstance.put<PlantUnitSystem>(`/plantunitsystems/${id}`, data),
  delete: (id: string) => axiosInstance.delete(`/plantunitsystems/${id}`),
};
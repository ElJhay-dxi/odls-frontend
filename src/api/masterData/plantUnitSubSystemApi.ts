import axiosInstance from '../axiosInstance';
import type {
    PlantUnitSubSystem, PlantUnitSubSystemForm,
} from '../../types/masterData';


// ─── Plant Unit SubSystem ──────────────────────────────────────────────────────
export const plantUnitSubSystemApi = {
  getAll: () => axiosInstance.get<PlantUnitSubSystem[]>('/plantunitsubsystems'),
  getBySystem: (plantCode: string, unitCode: string, systemCode: string) =>
    axiosInstance.get<PlantUnitSubSystem[]>(`/plantunitsubsystems/system/${plantCode}/${unitCode}/${systemCode}`),
  getById: (id: string) => axiosInstance.get<PlantUnitSubSystem>(`/plantunitsubsystems/${id}`),
  create: (data: PlantUnitSubSystemForm) => axiosInstance.post<PlantUnitSubSystem>('/plantunitsubsystems', data),
  update: (id: string, data: PlantUnitSubSystemForm) => axiosInstance.put<PlantUnitSubSystem>(`/plantunitsubsystems/${id}`, data),
  delete: (id: string) => axiosInstance.delete(`/plantunitsubsystems/${id}`),
};
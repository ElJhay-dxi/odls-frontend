import axiosInstance from '../axiosInstance';
import type {
    PlantUnitEquipment, PlantUnitEquipmentForm,
} from '../../types/masterData';


// ─── Plant Unit Equipment ──────────────────────────────────────────────────────
export const plantUnitEquipmentApi = {
  getAll: () => axiosInstance.get<PlantUnitEquipment[]>('/plantunitequipments'),
  getBySubSystem: (plantCode: string, unitCode: string, systemCode: string, subSystemCode: string) =>
    axiosInstance.get<PlantUnitEquipment[]>(`/plantunitequipments/subsystem/${plantCode}/${unitCode}/${systemCode}/${subSystemCode}`),
  getById: (id: string) => axiosInstance.get<PlantUnitEquipment>(`/plantunitequipments/${id}`),
  create: (data: PlantUnitEquipmentForm) => axiosInstance.post<PlantUnitEquipment>('/plantunitequipments', data),
  update: (id: string, data: PlantUnitEquipmentForm) => axiosInstance.put<PlantUnitEquipment>(`/plantunitequipments/${id}`, data),
  delete: (id: string) => axiosInstance.delete(`/plantunitequipments/${id}`),
};
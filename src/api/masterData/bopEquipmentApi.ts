import axiosInstance from '../axiosInstance';
import type {
    BopEquipment, BopEquipmentForm,
} from '../../types/masterData';

// ─── BOP Equipment ─────────────────────────────────────────────────────────────
export const bopEquipmentApi = {
  getAll: () => axiosInstance.get<BopEquipment[]>('/bopsubsystemequipments'),
  getBySubSystem: (plantCode: string, bopCode: string, systemCode: string, subSystemCode: string) =>
    axiosInstance.get<BopEquipment[]>(`/bopsubsystemequipments/subsystem/${plantCode}/${bopCode}/${systemCode}/${subSystemCode}`),
  getById: (id: string) => axiosInstance.get<BopEquipment>(`/bopsubsystemequipments/${id}`),
  create: (data: BopEquipmentForm) => axiosInstance.post<BopEquipment>('/bopsubsystemequipments', data),
  update: (id: string, data: BopEquipmentForm) => axiosInstance.put<BopEquipment>(`/bopsubsystemequipments/${id}`, data),
  delete: (id: string) => axiosInstance.delete(`/bopsubsystemequipments/${id}`),
};
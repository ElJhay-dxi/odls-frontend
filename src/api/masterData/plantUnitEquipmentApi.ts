import axiosInstance from '../axiosInstance';
import type { PlantUnitEquipment, PlantUnitEquipmentForm, UpdatePlantUnitEquipmentForm } from '../../types/masterData';

const BASE = '/plantunitequipments';

export const plantUnitEquipmentApi = {
  getAll: () =>
    axiosInstance.get<PlantUnitEquipment[]>(BASE),

  getBySubSystem: (plantCode: string, unitCode: string, systemCode: string, subSystemCode: string) =>
    axiosInstance.get<PlantUnitEquipment[]>(`${BASE}/subsystem/${plantCode}/${unitCode}/${systemCode}/${subSystemCode}`),

  getById: (id: string) =>
    axiosInstance.get<PlantUnitEquipment>(`${BASE}/${id}`),

  // Backend resolves all parent names from codes
  create: (data: PlantUnitEquipmentForm) =>
    axiosInstance.post<PlantUnitEquipment>(BASE, data),

  // Only EquipmentName, EquipmentCode and Multiplier are updatable
  update: (id: string, data: UpdatePlantUnitEquipmentForm) =>
    axiosInstance.put<PlantUnitEquipment>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};
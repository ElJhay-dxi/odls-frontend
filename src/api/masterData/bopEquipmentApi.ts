import axiosInstance from '../axiosInstance';
import type { BopEquipment, BopEquipmentForm, UpdateBopEquipmentForm, BopEquipmentSearchResult } from '../../types/masterData';

const BASE = '/bopsubsystemequipments';

export const bopEquipmentApi = {
  getAll: () =>
    axiosInstance.get<BopEquipment[]>(BASE),

  getByPlant: (plantCode: string) =>
    axiosInstance.get<BopEquipment[]>(`${BASE}/plant/${plantCode}`),

  search: (plantCode: string, keyword: string) =>
    axiosInstance.get<BopEquipmentSearchResult[]>(
      `${BASE}/search`, { params: { plantCode, keyword } }
    ),

  getBySubSystem: (plantCode: string, bopCode: string, systemCode: string, subSystemCode: string) =>
    axiosInstance.get<BopEquipment[]>(`${BASE}/subsystem/${plantCode}/${bopCode}/${systemCode}/${subSystemCode}`),

  getById: (id: string) =>
    axiosInstance.get<BopEquipment>(`${BASE}/${id}`),

  // Backend resolves all parent names from codes
  create: (data: BopEquipmentForm) =>
    axiosInstance.post<BopEquipment>(BASE, data),

  // Only EquipmentName, EquipmentCode and Multiplier are updatable
  update: (id: string, data: UpdateBopEquipmentForm) =>
    axiosInstance.put<BopEquipment>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};
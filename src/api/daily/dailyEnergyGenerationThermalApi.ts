import axiosInstance from '../axiosInstance';
import type {
  DailyEnergyGenerationThermal,
  CreateDailyEnergyGenerationThermalDto,
  UpdateDailyEnergyGenerationThermalDto,
} from '../../types/dailyEnergyGenerationThermal';

const BASE = '/dailyenergygenerationthermal';

export const dailyEnergyGenerationThermalApi = {
  getAll: (params?: {
    plantCode?: string;
    logDate?: string;
    unitCode?: string;
    fuelType?: string;
  }) =>
    axiosInstance.get<DailyEnergyGenerationThermal[]>(BASE, { params }),

  getById: (id: string) =>
    axiosInstance.get<DailyEnergyGenerationThermal>(`${BASE}/${id}`),

  create: (dto: CreateDailyEnergyGenerationThermalDto) =>
    axiosInstance.post<DailyEnergyGenerationThermal>(BASE, dto),

  update: (id: string, dto: UpdateDailyEnergyGenerationThermalDto) =>
    axiosInstance.put<DailyEnergyGenerationThermal>(`${BASE}/${id}`, dto),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};

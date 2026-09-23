import axiosInstance from '../axiosInstance';
import type {
  WaterMeterReading, FreshwaterTankLevel, DeminWaterTankLevel,
  GtCo2Level, HydroWaterLevel, HydroWaterDischarge,
} from '../../types/waterSystem';

const mk = <T>(base: string) => ({
  getAll: (params?: { plantCode?: string; date?: string }) =>
    axiosInstance.get<T[]>(base, { params }),
  getById: (id: string) => axiosInstance.get<T>(`${base}/${id}`),
  create: (data: Record<string, unknown>) => axiosInstance.post<T>(base, data),
  update: (id: string, data: Record<string, unknown>) => axiosInstance.put<T>(`${base}/${id}`, data),
  delete: (id: string) => axiosInstance.delete(`${base}/${id}`),
});

export const freshwaterInflowApi    = mk<WaterMeterReading>('/dailyfreshwaterinflow');
export const freshwaterTotalizerApi = mk<WaterMeterReading>('/dailyfreshwatertotalizer');
export const freshwaterTankLevelApi = mk<FreshwaterTankLevel>('/dailyfreshwatertanklevel');
export const deminWaterTankLevelApi = mk<DeminWaterTankLevel>('/dailydeminwatertanklevel');
export const gtCo2LevelApi          = mk<GtCo2Level>('/dailygtco2levels');
export const desalinatedWaterApi    = mk<WaterMeterReading>('/dailydesalinatedwaterlevel');
export const wasteWaterApi          = mk<WaterMeterReading>('/dailywastewater');
export const hydroWaterLevelApi     = mk<HydroWaterLevel>('/dailyhydrowaterlevel');
export const hydroWaterDischargeApi = mk<HydroWaterDischarge>('/dailyhydrowaterdischarge');
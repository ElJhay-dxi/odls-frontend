export interface DailyNaturalGasTurbine {
  id: string;
  plantName: string;
  plantCode: string;
  unitName: string;
  unitCode: string;
  logDate: string;
  logTime?: string;
  previousReading: number;
  currentReading: number;
  heatingValue: number;
  difference: number;
  progressiveTotal: number;
  consumptionMMscf: number;
  consumptionMMBtu: number;
  averageLoadMW?: number;
  heatRateLhvKjKwh?: number;
  heatRateLhvBtuKwh?: number;
  heatRateHhvKjKwh?: number;
  heatRateHhvBtuKwh?: number;
  createdOn: string;
  createdByName: string;
  createdByEmail: string;
}

export interface DailyNaturalGasTurbineForm {
  plantCode: string;
  unitCode: string;
  logDate: string;
  logTime: string;
  currentReading: number | string;
  heatingValue: number | string;
}
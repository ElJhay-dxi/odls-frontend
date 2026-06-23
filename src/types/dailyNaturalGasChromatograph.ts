export interface DailyNaturalGasChromatograph {
  id: string;
  plantName: string;
  plantCode: string;
  unitName: string;
  unitCode: string;
  logDate: string;
  logTime?: string;
  readingMMscf: number;
  heatingValue: number;
  progressiveTotal: number;
  consumptionMMBtu: number;
  heatRateLhvKjKwh?: number;
  heatRateLhvBtuKwh?: number;
  heatRateHhvKjKwh?: number;
  heatRateHhvBtuKwh?: number;
  createdOn: string;
  createdByName: string;
  createdByEmail: string;
}

export interface DailyNaturalGasChromatographForm {
  plantCode: string;
  unitCode: string;
  logDate: string;
  logTime: string;
  readingMMscf: number | string;
  heatingValue: number | string;
}
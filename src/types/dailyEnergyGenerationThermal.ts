export type ThermalFuelType = 'NaturalGas' | 'DFO';

export const FUEL_TYPE_LABELS: Record<ThermalFuelType, string> = {
  NaturalGas: 'Natural Gas',
  DFO: 'DFO',
};

export interface DailyEnergyGenerationThermal {
  id: string;
  plantName: string;
  plantCode: string;
  fuelType: ThermalFuelType;
  logDate: string;
  previousReading: number;
  currentReading: number;
  difference: number;
  progressiveTotal: number;
  averageLoad?: number;
  createdOn: string;
  createdByName: string;
  createdByEmail: string;
}

export interface DailyEnergyGenThermalForm {
  plantCode: string;
  fuelType: ThermalFuelType | '';
  logDate: string;
  currentReading: number | string;
}
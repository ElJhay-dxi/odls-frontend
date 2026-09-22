export interface DailyEnergyGenerationThermal {
  id: string;
  plantName: string;
  plantCode: string;
  unitCode: string;
  unitName: string;
  fuelType: string;
  logDate: string;
  // Active energy (MWh)
  previousActiveReading: number;
  currentActiveReading: number;
  activeDifference: number;
  activeProgressiveTotal: number;
  averageActiveLoad?: number;
  // Reactive energy (MVArh)
  previousReactiveReading: number;
  currentReactiveReading: number;
  reactiveDifference: number;
  reactiveProgressiveTotal: number;
  averageReactiveLoad?: number;
  createdOn: string;
  createdByName: string;
  createdByEmail: string;
  updatedByName?: string;
  updatedOn?: string;
}

export interface CreateDailyEnergyGenerationThermalDto {
  plantCode: string;
  unitCode: string;
  unitName: string;
  fuelType: string;
  logDate: string;
  previousActiveReading?: number;
  currentActiveReading: number;
  previousReactiveReading?: number;
  currentReactiveReading: number;
}

export interface UpdateDailyEnergyGenerationThermalDto {
  currentActiveReading: number;
  currentReactiveReading: number;
}

// Fuel options derived from PlantUnit.fuelType
// "Gas" → ['Gas']
// "DFO" → ['DFO']
// "Gas/DFO" → ['Gas', 'DFO']
export const parseFuelOptions = (fuelType: string): string[] => {
  if (!fuelType) return [];
  return fuelType.split('/').map(f => f.trim()).filter(Boolean);
};

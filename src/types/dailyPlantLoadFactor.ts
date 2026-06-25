export interface DailyPlantLoadFactor {
  id: string;
  plantName: string;
  plantCode: string;
  classificationType: string;
  logDate: string;
  energyGeneratedMWh: number;
  plantPeakLoadMW: number;
  associatedTime?: string;
  loadFactorPct?: number;
  createdOn: string;
  createdByName: string;
  createdByEmail: string;
}

export interface EnergyGeneratedPreview {
  energyGeneratedMWh: number;
  source: string;
}

export interface DailyPlantLoadFactorForm {
  plantCode: string;
  logDate: string;
  plantPeakLoadMW: number | string;
  associatedTime: string;
}
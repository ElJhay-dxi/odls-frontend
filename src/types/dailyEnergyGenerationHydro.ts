export interface DailyEnergyGenerationHydro {
  id: string;
  plantName: string;
  plantCode: string;
  logDate: string;
  previousReading: number;
  currentReading: number;
  averagePowerFactor?: number;
  akosomboPeakLoadMW?: number;
  akosomboPeakLoadTime?: string; // "HH:mm:ss"
  difference: number;
  progressiveTotal: number;
  averageLoad?: number;
  createdOn: string;
  createdByName: string;
  createdByEmail: string;
}

export interface DailyEnergyGenHydroForm {
  plantCode: string;
  logDate: string;
  currentReading: number | string;
  averagePowerFactor: number | string;
  akosomboPeakLoadMW: number | string;
  akosomboPeakLoadTime: string;
}
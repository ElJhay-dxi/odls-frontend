export interface DailyPlantReliability {
  id: string;
  plantName: string;
  plantCode: string;
  classificationType: string;
  logDate: string;
  mtbf: number;
  successfulStarts: number;
  unsuccessfulStarts: number;
  startAttempts: number;
  startingReliabilityPct?: number;
  createdOn: string;
  createdByName: string;
  createdByEmail: string;
}

export interface DailyPlantReliabilityForm {
  plantCode: string;
  logDate: string;
  mtbf: number | string;
  successfulStarts: number | string;
  unsuccessfulStarts: number | string;
}
export interface DailySccReading {
  id: string;
  plantName: string;
  plantCode: string;
  logDate: string;
  totalGenerationKwh: number;
  stationServiceKwh: number;
  netGenerationKwh: number;
  createdOn: string;
  createdByName: string;
  createdByEmail: string;
}

export interface DailySccReadingForm {
  plantCode: string;
  logDate: string;
  totalGenerationKwh: number | string;
  stationServiceKwh: number | string;
}
export interface DailyStationEnergyConsumption {
  id: string;
  plantName: string;
  plantCode: string;
  classificationType: string;
  logDate: string;
  previousReading: number;
  currentReading: number;
  difference: number;
  progressiveTotal: number;
  createdOn: string;
  createdByName: string;
  createdByEmail: string;
}

export interface DailyStationEnergyConsumptionForm {
  plantCode: string;
  logDate: string;
  currentReading: number | string;
}
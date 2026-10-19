export interface DailyStationEnergyConsumption {
  id: string;
  plantName: string;
  plantCode: string;
  classificationType: string;
  /** Station service transformer (SST/TSS); empty for legacy plant-level readings */
  transformerCode: string;
  transformerName: string;
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
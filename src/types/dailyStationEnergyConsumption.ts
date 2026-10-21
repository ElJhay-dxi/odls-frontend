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
  /** Reactive energy (MVArh) from the same meter — empty on older rows or where it isn't read. */
  mvarhPreviousReading?: number | null;
  mvarhCurrentReading?: number | null;
  mvarhDifference?: number | null;
  mvarhProgressiveTotal?: number | null;
  createdOn: string;
  createdByName: string;
  createdByEmail: string;
}

export interface DailyStationEnergyConsumptionForm {
  plantCode: string;
  logDate: string;
  currentReading: number | string;
}
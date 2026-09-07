export interface DailyUnitAvailability {
  id: string;
  plantCode: string;
  plantName: string;
  unitCode: string;
  unitName: string;
  logDate: string;
  serviceHours?: number;
  runHours?: number;
  reserveShutdownHours?: number;
  forcedOutageHours?: number;
  plannedOutageHours?: number;
  maintenanceOutageHours?: number;
  extendedPlannedOutageHours?: number;
  extendedMaintenanceOutageHours?: number;
  remarks?: string;
  createdByName: string;
  createdOn: string;
  updatedByName?: string;
  updatedOn?: string;
}

export interface DailyUnitAvailabilitySummary {
  logDate: string;
  totalServiceHours: number;
  totalRunHours: number;
  totalReserveShutdownHours: number;
  totalForcedOutageHours: number;
  totalPlannedOutageHours: number;
  totalMaintenanceOutageHours: number;
  totalExtendedPlannedOutageHours: number;
  totalExtendedMaintenanceOutageHours: number;
  unitCount: number;
}

export interface SaveDailyUnitAvailabilityForm {
  serviceHours: string;
  runHours: string;
  reserveShutdownHours: string;
  forcedOutageHours: string;
  plannedOutageHours: string;
  maintenanceOutageHours: string;
  extendedPlannedOutageHours: string;
  extendedMaintenanceOutageHours: string;
  remarks: string;
}

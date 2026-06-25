export interface DailyPlantAvailability {
  id: string;
  plantName: string;
  plantCode: string;
  classificationType: string;
  logDate: string;
  reserveShutdownHours: number;
  serviceHours: number;
  runHours: number;
  forcedOutageU1: number;
  forcedOutageU2: number;
  forcedOutageU3: number;
  startingFailure: number;
  forcedOutageOutsideMgmt: number;
  maintenanceOutage: number;
  extendedMaintenanceOutage: number;
  maintenanceOutageOutsideMgmt: number;
  plannedOutage: number;
  extendedPlannedOutage: number;
  plannedOutageOutsideMgmt: number;
  periodHours: number;
  availableHours: number;
  unavailableHours: number;
  availabilityFactor: number;
  forcedOutageFactor: number;
  utilizationFactor?: number;
  capacityFactor: number;
  plannedOutageFactor: number;
  maintenanceOutageFactor?: number;
  scheduledOutageFactor: number;
  createdOn: string;
  createdByName: string;
  createdByEmail: string;
}

export interface DailyPlantAvailabilityForm {
  plantCode: string;
  logDate: string;
  reserveShutdownHours: number | string;
  serviceHours: number | string;
  runHours: number | string;
  forcedOutageU1: number | string;
  forcedOutageU2: number | string;
  forcedOutageU3: number | string;
  startingFailure: number | string;
  forcedOutageOutsideMgmt: number | string;
  maintenanceOutage: number | string;
  extendedMaintenanceOutage: number | string;
  maintenanceOutageOutsideMgmt: number | string;
  plannedOutage: number | string;
  extendedPlannedOutage: number | string;
  plannedOutageOutsideMgmt: number | string;
}
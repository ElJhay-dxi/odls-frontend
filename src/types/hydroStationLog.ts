export interface HydroStationLogEntry {
  id: string;
  entryTime: string;
  entryText: string;
  createdByName: string;
  createdByEmail: string;
  createdOn: string;
}

export interface HydroStationLogConditionRow {
  id: string;
  plantCode: string;
  plantName: string;
  numberOfUnits?: number | null;
  totalLoadMw?: number | null;
  sortOrder: number;
}

export interface HydroStationLogCondition {
  id: string;
  snapshotTime: string;
  source?: string;
  systemVoltageKv?: number | null;
  createdByName: string;
  createdOn: string;
  rows: HydroStationLogConditionRow[];
}

export interface HydroStationLog {
  id: string;
  plantCode: string;
  plantName: string;
  logDate: string;
  unitsInService?: string;
  linesInService?: string;
  stationService?: string;
  permitsInEffect?: string;
  applicationsForOutage?: string;
  miscNotes?: string;
  energyGeneratedKwh?: number | null;
  shiftLeaderName?: string;
  createdByName: string;
  createdByEmail: string;
  createdOn: string;
  updatedByName?: string;
  updatedOn?: string;
  entries: HydroStationLogEntry[];
  conditions: HydroStationLogCondition[];
}

export interface CreateHydroStationLogForm {
  plantCode: string;
  logDate: string;
  unitsInService: string;
  linesInService: string;
  stationService: string;
  permitsInEffect: string;
  applicationsForOutage: string;
  miscNotes: string;
}

export interface UpdateHydroStationLogForm {
  unitsInService: string;
  linesInService: string;
  stationService: string;
  permitsInEffect: string;
  applicationsForOutage: string;
  miscNotes: string;
  energyGeneratedKwh: string | null;
  shiftLeaderName: string;
}

export interface CreateHydroStationLogEntryForm {
  entryTime: string;
  entryText: string;
}

export interface UpdateHydroStationLogEntryForm {
  entryTime: string;
  entryText: string;
}

export interface ConditionRowForm {
  plantCode: string;
  plantName: string;
  numberOfUnits: string;
  totalLoadMw: string;
  sortOrder: number;
}

export interface CreateConditionForm {
  snapshotTime: string;
  source: string;
  systemVoltageKv: string;
  rows: ConditionRowForm[];
}
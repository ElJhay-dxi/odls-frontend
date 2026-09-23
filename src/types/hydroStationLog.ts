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

export interface HydroStationLogGenerationRow {
  id: string;
  description: string;
  value?: number | null;
  unit?: string;
  sortOrder: number;
}

export interface HydroGenerationRowForm {
  description: string;
  value: string;
  unit: string;
  sortOrder: number;
}

export interface HydroStationLogPermit {
  id: string;
  permitTypeCode?: string;
  permitTypeName?: string;
  permitNumber?: string;
  workOrderNumber?: string;
  eamNumber?: string | null;
  permitHolder?: string;
  workDescription?: string;
  startDate?: string;
  completionDate?: string;
  sortOrder: number;
}

export interface HydroStationLogPermitForm {
  permitTypeCode: string;
  permitTypeName: string;
  permitNumber: string;
  workOrderNumber: string;
  eamNumber: string;
  permitHolder: string;
  workDescription: string;
  startDate: string;
  completionDate: string;
  sortOrder: number;
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
  // End of day summary
  totalGenerationMwh?: number | null;
  totalStationServiceMwh?: number | null;
  netGenerationMwh?: number | null;
  forebayLevelM?: number | null;
  tailraceLevelM?: number | null;
  netHeadM?: number | null;
  generationNotes?: string;
  permits: HydroStationLogPermit[];
  conditions: HydroStationLogCondition[];
  generationRows: HydroStationLogGenerationRow[];
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
  totalGenerationMwh: string | null;
  totalStationServiceMwh: string | null;
  netGenerationMwh: string | null;
  forebayLevelM: string | null;
  tailraceLevelM: string | null;
  netHeadM: string | null;
  generationNotes: string;
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

// ─── Per-Unit Output ─────────────────────────────────────────────────────────────
export interface StationLogUnitOutput {
  id: string;
  stationLogId: string;
  unitCode: string;
  unitName: string;
  unitStatus: string;
  outputMW?: number;
  outputMVAr?: number;
  sortOrder: number;
}

export interface SaveStationLogUnitOutputItem {
  unitCode: string;
  unitName: string;
  unitStatus: string;
  outputMW?: number | null;
  outputMVAr?: number | null;
}
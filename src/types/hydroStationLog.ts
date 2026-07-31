export interface HydroStationLogEntry {
  id: string;
  entryTime: string;
  entryText: string;
  createdByName: string;
  createdByEmail: string;
  createdOn: string;
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
  energyGeneratedKwh?: number;
  shiftLeaderName?: string;
  createdByName: string;
  createdByEmail: string;
  createdOn: string;
  updatedByName?: string;
  updatedOn?: string;
  entries: HydroStationLogEntry[];
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
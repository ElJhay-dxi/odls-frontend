// ─── Daily Plant Report ─────────────────────────────────────────────────────
export interface HydroDailyPlantReportRow {
  date: string;
  energyGeneratedKwh?: number;
  totalGenerationMwh?: number;
  stationServiceMwh?: number;
  netGenerationMwh?: number;
  forebayLevelM?: number;
  tailraceLevelM?: number;
  netHeadM?: number;
  shiftLeader?: string;
  generationNotes?: string;
  energyMeterReading?: number;
  energyDifference?: number;
  progressiveTotal?: number;
  averagePowerFactor?: number;
  peakLoadMw?: number;
}

// ─── Hourly Summary ─────────────────────────────────────────────────────────
export interface HydroHourlySummaryRow {
  date: string;
  hour: number;
  unitCode: string;
  unitName: string;
  activePowerMW?: number;
  reactivePowerMVar?: number;
  voltageKV?: number;
  frequency?: number;
  powerFactor?: number;
  gatePosition?: number;
  turbineDischarge?: number;
  remarks?: string;
}

// ─── Availability & Outage ──────────────────────────────────────────────────
export interface HydroAvailabilityRow {
  date: string;
  serviceHours?: number;
  runHours?: number;
  reserveShutdownHours?: number;
  forcedOutageHours?: number;
  maintenanceOutageHours?: number;
  plannedOutageHours?: number;
}

export interface HydroTripRow {
  date: string;
  pls?: number;
  shutdown?: number;
  lowLoad?: number;
  highLoad?: number;
  preIgnition?: number;
  preSynchronization?: number;
  partial?: number;
  full?: number;
  total?: number;
}

export interface HydroReliabilityRow {
  date: string;
  mtbf?: number;
  successfulStarts?: number;
  unsuccessfulStarts?: number;
  startAttempts?: number;
  startingReliabilityPct?: number;
}

export interface HydroLoadFactorRow {
  date: string;
  averageLoadMw?: number;
  peakLoadMw?: number;
  loadFactorPct?: number;
}

export interface HydroAvailabilitySummary {
  totalServiceHours: number;
  totalRunHours: number;
  totalForcedOutageHours: number;
  totalMaintenanceOutageHours: number;
  totalPlannedOutageHours: number;
  totalTrips: number;
  averageStartingReliabilityPct?: number;
  averageLoadFactorPct?: number;
}

export interface HydroAvailabilityReport {
  plantCode: string;
  dateFrom: string;
  dateTo: string;
  summary: HydroAvailabilitySummary;
  availability: HydroAvailabilityRow[];
  trips: HydroTripRow[];
  reliability: HydroReliabilityRow[];
  loadFactor: HydroLoadFactorRow[];
}

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
  peakLoadMw?: number;
  averagePowerFactor?: number;
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
}

// ─── Availability & Outage ──────────────────────────────────────────────────
export interface HydroAvailabilityDayRow {
  date: string;
  serviceHours: number;
  runHours: number;
  reserveShutdownHours: number;
  forcedOutageHours: number;
  maintenanceOutageHours: number;
  plannedOutageHours: number;
}

export interface HydroTripRow {
  date: string;
  pls: number;
  shutdown: number;
  lowLoadTrip: number;
  highLoadTrip: number;
  preIgnition: number;
  preSync: number;
  partialLoadTrip: number;
  fullLoadTrip: number;
  totalTrips: number;
}

export interface HydroReliabilityRow {
  date: string;
  mtbf: number;
  successfulStarts: number;
  unsuccessfulStarts: number;
  startAttempts: number;
  startingReliabilityPct?: number;
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
  availability: HydroAvailabilityDayRow[];
  trips: HydroTripRow[];
  reliability: HydroReliabilityRow[];
}

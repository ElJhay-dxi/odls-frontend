import axiosInstance from '../axiosInstance';

const BASE = '/thermalreports';

// ─── 1. Daily Generation ─────────────────────────────────────────────────────
export interface ThermalGenerationRow {
  date: string;
  unitCode: string;
  unitName: string;
  fuelType: string;
  activeDifference: number;
  activeProgressiveTotal: number;
  averageActiveLoad?: number;
  reactiveDifference: number;
  reactiveProgressiveTotal: number;
  averageReactiveLoad?: number;
}

export interface ThermalGenerationReport {
  plantCode: string;
  plantName: string;
  dateFrom: string;
  dateTo: string;
  totalActiveMwh: number;
  totalReactiveMvarh: number;
  rows: ThermalGenerationRow[];
}

// ─── 2. Availability & Reliability ───────────────────────────────────────────
export interface ThermalAvailabilityRow {
  date: string;
  serviceHours?: number;
  runHours?: number;
  reserveShutdownHours?: number;
  forcedOutageHours?: number;
  maintenanceOutageHours?: number;
  plannedOutageHours?: number;
  availableHours?: number;
  unavailableHours?: number;
  availabilityFactor?: number;
  forcedOutageFactor?: number;
  capacityFactor?: number;
  plannedOutageFactor?: number;
  maintenanceOutageFactor?: number;
  scheduledOutageFactor?: number;
}

export interface ThermalReliabilityRow {
  date: string;
  mtbf?: number;
  successfulStarts?: number;
  unsuccessfulStarts?: number;
  startAttempts?: number;
  startingReliabilityPct?: number;
}

export interface ThermalTripRow {
  date: string;
  unitCode: string;
  unitName: string;
  pls?: number;
  shutdown?: number;
  lowLoadTrip?: number;
  highLoadTrip?: number;
  preIgnition?: number;
  preSync?: number;
  partialLoadTrip?: number;
  fullLoadTrip?: number;
  totalTrips?: number;
  remarks?: string;
}

export interface ThermalAvailabilityReport {
  plantCode: string;
  plantName: string;
  dateFrom: string;
  dateTo: string;
  availabilityRows: ThermalAvailabilityRow[];
  reliabilityRows: ThermalReliabilityRow[];
  tripRows: ThermalTripRow[];
}

// ─── 3. Unit Trips ────────────────────────────────────────────────────────────
export interface ThermalTripsReport {
  plantCode: string;
  plantName: string;
  dateFrom: string;
  dateTo: string;
  totalPls: number;
  totalShutdown: number;
  totalForcedTrips: number;
  grandTotal: number;
  rows: ThermalTripRow[];
}

// ─── 4. Fuel Consumption ──────────────────────────────────────────────────────
export interface ThermalFuelConsumptionRow {
  date: string;
  totalGasConsumed?: number;
  totalGasConsumedUnit?: string;
  totalLiquidFuelConsumedMt?: number;
  totalGenerationMwh?: number;
  netGenerationMwh?: number;
  totalStationServiceMwh?: number;
}

export interface ThermalFuelConsumptionReport {
  plantCode: string;
  plantName: string;
  dateFrom: string;
  dateTo: string;
  totalGas: number;
  totalLiquidFuel: number;
  totalGenerationMwh: number;
  totalNetGenerationMwh: number;
  rows: ThermalFuelConsumptionRow[];
}

// ─── 5. Plant Load Factor ─────────────────────────────────────────────────────
export interface ThermalLoadFactorRow {
  date: string;
  energyGeneratedMwh?: number;
  plantPeakLoadMw?: number;
  associatedTime?: string;
  loadFactorPct?: number;
}

export interface ThermalLoadFactorReport {
  plantCode: string;
  plantName: string;
  dateFrom: string;
  dateTo: string;
  totalEnergyMwh: number;
  averageLoadFactorPct?: number;
  rows: ThermalLoadFactorRow[];
}

// ─── 6. Critical Issues Register ─────────────────────────────────────────────
export interface ThermalCriticalIssueRow {
  logDate: string;
  dateObserved?: string;
  equipmentCode?: string;
  equipmentName?: string;
  descriptionOfFault?: string;
  riskInvolved?: string;
  impact?: string;
  status: string;
  resolvedOn?: string;
  resolvedBy?: string;
  createdByName?: string;
}

export interface ThermalCriticalIssuesReport {
  plantCode: string;
  plantName: string;
  dateFrom: string;
  dateTo: string;
  totalOpen: number;
  totalResolved: number;
  rows: ThermalCriticalIssueRow[];
}

export const thermalReportsApi = {

  // 1. Daily Generation Summary
  getGeneration: (plantCode: string, dateFrom: string, dateTo: string) =>
    axiosInstance.get<ThermalGenerationReport>(`${BASE}/generation`, { params: { plantCode, dateFrom, dateTo } }),

  exportGenerationExcel: (plantCode: string, dateFrom: string, dateTo: string) =>
    axiosInstance.get<Blob>(`${BASE}/generation/export/excel`,
      { params: { plantCode, dateFrom, dateTo }, responseType: 'blob' }),

  // 2. Availability & Reliability
  getAvailability: (plantCode: string, dateFrom: string, dateTo: string) =>
    axiosInstance.get<ThermalAvailabilityReport>(`${BASE}/availability`, { params: { plantCode, dateFrom, dateTo } }),

  exportAvailabilityExcel: (plantCode: string, dateFrom: string, dateTo: string) =>
    axiosInstance.get<Blob>(`${BASE}/availability/export/excel`,
      { params: { plantCode, dateFrom, dateTo }, responseType: 'blob' }),

  // 3. Unit Trips
  getTrips: (plantCode: string, dateFrom: string, dateTo: string) =>
    axiosInstance.get<ThermalTripsReport>(`${BASE}/trips`, { params: { plantCode, dateFrom, dateTo } }),

  exportTripsExcel: (plantCode: string, dateFrom: string, dateTo: string) =>
    axiosInstance.get<Blob>(`${BASE}/trips/export/excel`,
      { params: { plantCode, dateFrom, dateTo }, responseType: 'blob' }),

  // 4. Fuel Consumption
  getFuelConsumption: (plantCode: string, dateFrom: string, dateTo: string) =>
    axiosInstance.get<ThermalFuelConsumptionReport>(`${BASE}/fuelconsumption`, { params: { plantCode, dateFrom, dateTo } }),

  exportFuelConsumptionExcel: (plantCode: string, dateFrom: string, dateTo: string) =>
    axiosInstance.get<Blob>(`${BASE}/fuelconsumption/export/excel`,
      { params: { plantCode, dateFrom, dateTo }, responseType: 'blob' }),

  // 5. Plant Load Factor
  getLoadFactor: (plantCode: string, dateFrom: string, dateTo: string) =>
    axiosInstance.get<ThermalLoadFactorReport>(`${BASE}/loadfactor`, { params: { plantCode, dateFrom, dateTo } }),

  exportLoadFactorExcel: (plantCode: string, dateFrom: string, dateTo: string) =>
    axiosInstance.get<Blob>(`${BASE}/loadfactor/export/excel`,
      { params: { plantCode, dateFrom, dateTo }, responseType: 'blob' }),

  // 6. Critical Issues Register
  getCriticalIssues: (plantCode: string, dateFrom: string, dateTo: string) =>
    axiosInstance.get<ThermalCriticalIssuesReport>(`${BASE}/criticalissues`, { params: { plantCode, dateFrom, dateTo } }),

  exportCriticalIssuesExcel: (plantCode: string, dateFrom: string, dateTo: string) =>
    axiosInstance.get<Blob>(`${BASE}/criticalissues/export/excel`,
      { params: { plantCode, dateFrom, dateTo }, responseType: 'blob' }),
};

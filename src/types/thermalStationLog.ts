export interface ThermalStationLogEntry {
  id: string;
  entryTime: string;
  entryText: string;
  createdByName: string;
  createdByEmail: string;
  createdOn: string;
}

export interface ThermalStationLogSafetyDoc {
  id: string;
  safetyDocTypeCode?: string;
  safetyDocTypeName?: string;
  docNumber?: string;
  workOrderNumber?: string;
  permitHolder?: string;
  workDescription?: string;
  startDate?: string;
  completionDate?: string;
  sortOrder: number;
}

export interface ThermalStationLogConditionRow {
  id: string;
  plantCode?: string;
  plantName: string;
  numberOfUnits?: number | null;
  totalLoadMw?: number | null;
  sortOrder: number;
}

export interface ThermalStationLogCondition {
  id: string;
  snapshotTime: string;
  source?: string;
  systemVoltageKv?: number | null;
  remarks?: string;
  createdByName: string;
  createdOn: string;
  rows: ThermalStationLogConditionRow[];
}

export interface ThermalStationLogGasReadingRow {
  id: string;
  terminal: string;
  inletPressureBar?: number | null;
  outletPressureBar?: number | null;
  flowRateMmscf?: number | null;
  sortOrder: number;
}

export interface ThermalStationLogGasReading {
  id: string;
  readingTime: string;
  source?: string;
  createdByName: string;
  createdOn: string;
  rows: ThermalStationLogGasReadingRow[];
}

export interface ThermalStationLogHseEntry {
  id: string;
  entryDate?: string;
  entryTime?: string;
  description: string;
  workOrderRaised?: string;
  createdByName: string;
  createdOn: string;
}

export interface ThermalStationLogFuelOilTank {
  id: string;
  tankName: string;
  dcsReadingM?: number | null;
  actualDipM?: number | null;
  daysOfStock?: number | null;
  sortOrder: number;
}

export interface ThermalStationLogGasConditioningRow {
  id: string;
  componentName: string;
  status?: string;
  inletTempC?: number | null;
  onBaseTempC?: number | null;
  inletPressureBar?: number | null;
  onBasePressureBar?: number | null;
  sortOrder: number;
}

export interface ThermalStationLogWaterTreatmentRow {
  id: string;
  tankOrSystem: string;
  level?: number | null;
  unit?: string;
  status?: string;
  sortOrder: number;
}

export interface ThermalStationLogGenerationRow {
  id: string;
  description: string;
  value?: number | null;
  unit?: string;
  sortOrder: number;
}

export interface ThermalStationLog {
  id: string;
  plantCode: string;
  plantName: string;
  logDate: string;
  unitsInService?: string;
  currentOutputMw?: number | null;
  stationService?: string;
  linesInService?: string;
  fireProtectionStatus?: string;
  emergencyDieselGenStatus?: string;
  applicationForOutage?: string;
  miscNotes?: string;
  // Optional section toggles
  showAmbientConditions: boolean;
  showHseEntries: boolean;
  showFuelOilTanks: boolean;
  showGasConditioning: boolean;
  showWaterTreatment: boolean;
  // Ambient conditions
  ambientTempC?: number | null;
  ambientPressureMbar?: number | null;
  relativeHumidityPct?: number | null;
  createdByName: string;
  createdByEmail: string;
  createdOn: string;
  updatedByName?: string;
  updatedOn?: string;
  entries: ThermalStationLogEntry[];
  safetyDocs: ThermalStationLogSafetyDoc[];
  conditions: ThermalStationLogCondition[];
  gasReadings: ThermalStationLogGasReading[];
  fuelOilReadingTime?: string;
  gasCondReadingTime?: string;
  waterReadingTime?: string;
  // End of day summary
  totalGenerationMwh?: number | null;
  totalStationServiceMwh?: number | null;
  netGenerationMwh?: number | null;
  totalGasConsumed?: number | null;
  totalGasConsumedUnit?: string;
  totalLiquidFuelConsumedMt?: number | null;
  reactiveEnergyGeneratedVarh?: number | null;
  generationNotes?: string;
  hseEntries: ThermalStationLogHseEntry[];
  fuelOilTanks: ThermalStationLogFuelOilTank[];
  gasConditioningRows: ThermalStationLogGasConditioningRow[];
  waterTreatmentRows: ThermalStationLogWaterTreatmentRow[];
  generationRows: ThermalStationLogGenerationRow[];
}

export interface CreateThermalStationLogForm {
  plantCode: string;
  logDate: string;
}

export interface UpdateThermalStationLogForm {
  unitsInService: string;
  currentOutputMw: string | null;
  stationService: string;
  linesInService: string;
  fireProtectionStatus: string;
  emergencyDieselGenStatus: string;
  applicationForOutage: string;
  miscNotes: string;
  totalGenerationMwh: string | null;
  totalStationServiceMwh: string | null;
  netGenerationMwh: string | null;
  totalGasConsumed: string | null;
  totalGasConsumedUnit: string;
  totalLiquidFuelConsumedMt: string | null;
  reactiveEnergyGeneratedVarh: string | null;
  generationNotes: string;
  showAmbientConditions: boolean;
  showHseEntries: boolean;
  showFuelOilTanks: boolean;
  showGasConditioning: boolean;
  showWaterTreatment: boolean;
  ambientTempC: string | null;
  ambientPressureMbar: string | null;
  relativeHumidityPct: string | null;
}

export interface SafetyDocForm {
  safetyDocTypeCode: string;
  safetyDocTypeName: string;
  docNumber: string;
  workOrderNumber: string;
  permitHolder: string;
  workDescription: string;
  startDate: string;
  completionDate: string;
  sortOrder: number;
}

export interface ConditionRowForm {
  plantCode: string;
  plantName: string;
  numberOfUnits: string;
  totalLoadMw: string;
  sortOrder: number;
}

export interface ConditionForm {
  snapshotTime: string;
  source: string;
  systemVoltageKv: string;
  remarks: string;
  rows: ConditionRowForm[];
}

export interface GasReadingRowForm {
  terminal: string;
  inletPressureBar: string;
  outletPressureBar: string;
  flowRateMmscf: string;
  sortOrder: number;
}

export interface GasReadingForm {
  readingTime: string;
  source: string;
  rows: GasReadingRowForm[];
}

export interface GenerationRowForm {
  description: string;
  value: string;
  unit: string;
  sortOrder: number;
}

export interface HseEntryForm {
  entryDate: string;
  entryTime: string;
  description: string;
  workOrderRaised: string;
}

export interface FuelOilTankForm {
  readingTime: string;
  tankName: string;
  dcsReadingM: string;
  actualDipM: string;
  daysOfStock: string;
  sortOrder: number;
}

export interface GasConditioningRowForm {
  readingTime: string;
  componentName: string;
  status: string;
  inletTempC: string;
  onBaseTempC: string;
  inletPressureBar: string;
  onBasePressureBar: string;
  sortOrder: number;
}

export interface WaterTreatmentRowForm {
  readingTime: string;
  tankOrSystem: string;
  level: string;
  unit: string;
  status: string;
  sortOrder: number;
}

// ─── Critical Issues ────────────────────────────────────────────────────────────
export interface ThermalCriticalIssue {
  id: string;
  stationLogId: string;
  equipmentCode: string;
  equipmentName: string;
  dateObserved?: string;
  descriptionOfFault: string;
  riskInvolved?: string;
  impact?: string;
  status: string; // Open, Resolved
  resolvedOn?: string;
  resolvedBy?: string;
  createdByName: string;
  createdOn: string;
  updatedByName?: string;
  updatedOn?: string;
}

// ─── Oversight Entries (TICO/CENIT) ─────────────────────────────────────────────
export interface ThermalOversightEntry {
  id: string;
  stationLogId: string;
  oversightPlantCode: string;
  oversightPlantName: string;
  entryDate: string;
  entryTime: string;
  entryText: string;
  createdByName: string;
  createdOn: string;
}

// ─── Shift Information ──────────────────────────────────────────────────────────
export interface ThermalShiftInfo {
  id: string;
  stationLogId: string;
  shiftType: string; // DAY or NIGHT
  teamLeader?: string;
  controlRoomOperators?: string; // JSON string
  fieldOperators?: string; // JSON string
  shiftStrength?: number;
  onLeave?: string; // JSON string
  comments?: string;
  createdByName: string;
  createdOn: string;
  updatedByName?: string;
  updatedOn?: string;
}

// ─── Equipment Status (Pumps / Transformers) ────────────────────────────────────
export interface ThermalEquipmentStatus {
  id: string;
  stationLogId: string;
  category: string;
  equipmentCode: string;
  equipmentName: string;
  location?: string;
  status: string;
  remarks?: string;
  sortOrder: number;
  updatedByName?: string;
  updatedOn?: string;
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

// ─── Station Auxiliary Supply ───────────────────────────────────────────────────
export interface ThermalAuxSupplyRow {
  id: string;
  stationLogId: string;
  sourceCode: string;
  sourceName: string;
  sourceType: string; // Bus, Transformer, Equipment
  suppliesTo?: string;
  status: string;
  notes?: string;
  sortOrder: number;
}

export interface SaveThermalAuxSupplyRowItem {
  sourceCode: string;
  sourceName: string;
  sourceType: string;
  suppliesTo?: string;
  status: string;
  notes?: string;
}
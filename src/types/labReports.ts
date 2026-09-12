// ─── Water Quality ───────────────────────────────────────────────────────────
export interface LabWaterQualityParameter {
  parameterName: string;
  value?: number;
  unit?: string;
  status?: string;
}

export interface LabWaterQualityRow {
  date: string;
  analysisTime?: string;
  samplePoint: string;
  sampleType: string;
  analysedBy?: string;
  parameters: LabWaterQualityParameter[];
}

// ─── Chemical Consumption ───────────────────────────────────────────────────
export interface LabChemicalConsumptionRow {
  date: string;
  chemicalName: string;
  dosingPoint?: string;
  openingStock?: number;
  consumption?: number;
  closingStock?: number;
  unit?: string;
}

// ─── Lube Oil ────────────────────────────────────────────────────────────────
export interface LabLubeOilRow {
  date: string;
  equipment: string;
  oilType?: string;
  viscosity?: number;
  acidNumber?: number;
  waterContent?: number;
  flashPoint?: number;
  particleCount?: number;
  condition?: string;
  remarks?: string;
}

// ─── Environmental ───────────────────────────────────────────────────────────
export interface LabEnvSeaWaterRow {
  date: string;
  readingTime?: string;
  ph?: number;
  conductivity?: number;
  turbidity?: number;
  chlorineResidual?: number;
  intakeFlow?: number;
  temperature?: number;
}

export interface LabEnvChemicalSummary {
  chemicalName: string;
  totalConsumption: number;
  unit: string;
  dosingPoint: string;
}

export interface LabEnvSludgeRow {
  date: string;
  sludgeLevel?: number;
}

export interface LabEnvironmentalReport {
  plantCode: string;
  dateFrom: string;
  dateTo: string;
  period: string;
  totalSeaWaterAbstractedM3: number;
  totalProductWaterGeneratedM3: number;
  totalAnalysisRecords: number;
  outOfRangeCount: number;
  compliancePct: number;
  seaWaterTrend: LabEnvSeaWaterRow[];
  chemicalSummary: LabEnvChemicalSummary[];
  sludgeTrend: LabEnvSludgeRow[];
}

// ─── Desalination ────────────────────────────────────────────────────────────
export interface LabDesalinationRow {
  date: string;
  swroRecoveryRate?: number;
  swroSaltRejection?: number;
  swroConductivity?: number;
  bwroRecoveryRate?: number;
  bwroConductivity?: number;
  ufSdi?: number;
  ufTmp?: number;
  productWaterFlowRate?: number;
  productWaterPh?: number;
  productWaterConductivity?: number;
  productWaterTds?: number;
}

// ─── Shift Summary ───────────────────────────────────────────────────────────
export interface LabShiftSummaryDay {
  date: string;
  shiftCount: number;
  shiftLeaders: string[];
  totalEntries: number;
  observations: number;
  actions: number;
  samplesTaken: number;
  incidents: number;
}

export interface LabShiftSummaryReport {
  plantCode: string;
  dateFrom: string;
  dateTo: string;
  totalShifts: number;
  totalEntries: number;
  totalObservations: number;
  totalActions: number;
  totalSamplesTaken: number;
  totalIncidents: number;
  dailyBreakdown: LabShiftSummaryDay[];
}

// ─── Lab Shift Log ──────────────────────────────────────────────────────────
export interface LabShiftLogEntry {
  id: string;
  entryTime: string;
  shiftCode: string;
  category: string;
  entryText: string;
  createdByName: string;
  createdOn: string;
}

export interface LabShiftLog {
  id: string;
  plantCode: string;
  plantName: string;
  logDate: string;
  shiftLeaderName?: string;
  shiftLeaderDesignation?: string;
  remarks?: string;
  createdByName: string;
  createdByEmail: string;
  createdOn: string;
  updatedByName?: string;
  updatedOn?: string;
  entries: LabShiftLogEntry[];
}

// ─── Lab Analysis ───────────────────────────────────────────────────────────
export interface LabAnalysisParameter {
  id: string;
  samplePointParameterId?: string;
  parameterName: string;
  value?: number;
  unit?: string;
  status?: string;
  sortOrder: number;
}

export interface LabAnalysisRecord {
  id: string;
  plantCode: string;
  plantName: string;
  logDate: string;
  analysisTime?: string;
  labReferenceNumber?: string;
  samplePointId?: string;
  samplePoint: string;
  sampleType: string;
  analysedBy?: string;
  remarks?: string;
  createdByName: string;
  createdOn: string;
  updatedByName?: string;
  updatedOn?: string;
  parameters: LabAnalysisParameter[];
}

export interface SaveLabAnalysisParameterForm {
  samplePointParameterId?: string;
  parameterName: string;
  unit?: string;
  value: string;
}

// ─── Sample Records ─────────────────────────────────────────────────────────
export interface LabSampleRecord {
  id: string;
  sampleId: string;
  plantCode: string;
  plantName: string;
  logDate: string;
  samplePoint: string;
  sampleType: string;
  collectedBy?: string;
  collectedAt?: string;
  sentToLabAt?: string;
  receivedAt?: string;
  analysisStatus: string;
  analysisRecordId?: string;
  remarks?: string;
  createdByName: string;
  createdOn: string;
  updatedByName?: string;
  updatedOn?: string;
}

// ─── Sea Water ──────────────────────────────────────────────────────────────
export interface LabSeaWaterReading {
  id: string;
  plantCode: string;
  plantName: string;
  logDate: string;
  readingTime?: string;
  location?: string;
  temperature?: number;
  ph?: number;
  salinity?: number;
  tds?: number;
  turbidity?: number;
  chlorineResidual?: number;
  dissolvedOxygen?: number;
  intakeFlow?: number;
  remarks?: string;
  createdByName: string;
  createdOn: string;
  updatedByName?: string;
  updatedOn?: string;
}

// ─── Desalination ───────────────────────────────────────────────────────────
export interface LabDesalinationUF {
  id: string;
  feedFlow?: number;
  permeateFlow?: number;
  backwashFrequency?: number;
  tmp?: number;
  sdi?: number;
  feedPressure?: number;
  outletPressure?: number;
  differentialPressure?: number;
  feedTurbidity?: number;
  filtrateTurbidity?: number;
  remarks?: string;
}

export interface LabDesalinationSWRO {
  id: string;
  feedPressure?: number;
  permeatePressure?: number;
  recoveryRate?: number;
  saltRejection?: number;
  conductivity?: number;
  feedFlow?: number;
  rejectFlow?: number;
  feedConductivity?: number;
  remarks?: string;
}

export interface LabDesalinationBWRO {
  id: string;
  feedPressure?: number;
  permeatePressure?: number;
  recoveryRate?: number;
  conductivity?: number;
  feedFlow?: number;
  rejectFlow?: number;
  remarks?: string;
}

export interface LabDesalinationClarifier {
  id: string;
  influentFlow?: number;
  effluentTurbidity?: number;
  sludgeLevel?: number;
  chemicalDosingRate?: number;
  remarks?: string;
}

export interface LabDesalinationPX {
  id: string;
  efficiency?: number;
  flowRate?: number;
  pressure?: number;
  remarks?: string;
}

export interface LabDesalinationProductWater {
  id: string;
  flowRate?: number;
  ph?: number;
  conductivity?: number;
  tds?: number;
  chlorineResidual?: number;
  hardness?: number;
  remarks?: string;
}

export interface LabDesalinationLog {
  id: string;
  plantCode: string;
  plantName: string;
  logDate: string;
  operator?: string;
  remarks?: string;
  createdByName: string;
  createdOn: string;
  updatedByName?: string;
  updatedOn?: string;
  uf?: LabDesalinationUF;
  swro?: LabDesalinationSWRO;
  bwro?: LabDesalinationBWRO;
  clarifier?: LabDesalinationClarifier;
  px?: LabDesalinationPX;
  productWater?: LabDesalinationProductWater;
}

// ─── Chemical Dosing ────────────────────────────────────────────────────────
export interface LabChemicalDosingRow {
  id: string;
  plantCode: string;
  plantName: string;
  logDate: string;
  chemicalName: string;
  dosingPoint?: string;
  openingStock?: number;
  consumption?: number;
  closingStock?: number;
  unit?: string;
  remarks?: string;
  sortOrder: number;
  createdByName: string;
  createdOn: string;
}

// ─── Lube Oil ───────────────────────────────────────────────────────────────
export interface LabLubeOilAnalysis {
  id: string;
  plantCode: string;
  plantName: string;
  logDate: string;
  equipment: string;
  oilType?: string;
  model?: string;
  runtime?: number;
  density?: number;
  bsAndW?: number;
  tan?: number;
  viscosity?: number;
  acidNumber?: number;
  waterContent?: number;
  flashPoint?: number;
  particleCount?: number;
  condition?: string;
  remarks?: string;
  createdByName: string;
  createdOn: string;
  updatedByName?: string;
  updatedOn?: string;
}

// ─── Cooling Water ──────────────────────────────────────────────────────────
export interface LabCoolingWaterReading {
  id: string;
  plantCode: string;
  plantName: string;
  logDate: string;
  readingTime?: string;
  circuitId?: string;
  temperature?: number;
  ph?: number;
  conductivity?: number;
  hardness?: number;
  chlorideContent?: number;
  chlorineResidual?: number;
  nitrite?: number;
  remarks?: string;
  createdByName: string;
  createdOn: string;
  updatedByName?: string;
  updatedOn?: string;
}

// ─── Environmental ──────────────────────────────────────────────────────────
export interface LabEnvironmentalReport {
  id: string;
  plantCode: string;
  plantName: string;
  logDate: string;
  reportingPeriod: string;
  effluentFlow?: number;
  effluentPh?: number;
  effluentTss?: number;
  effluentCod?: number;
  effluentBod?: number;
  noiseLevel?: number;
  airQualityIndex?: number;
  remarks?: string;
  createdByName: string;
  createdOn: string;
  updatedByName?: string;
  updatedOn?: string;
}

// ─── Sample Points, Parameters & Control Limits (master data) ──────────────
export interface LabControlLimit {
  id: string;
  samplePointParameterId: string;
  minValue?: number;
  maxValue?: number;
  isActive: boolean;
  createdByName: string;
  createdOn: string;
  updatedByName?: string;
  updatedOn?: string;
}

export interface LabSamplePointParameter {
  id: string;
  parameterName: string;
  unit?: string;
  sortOrder: number;
  isActive: boolean;
  controlLimit?: LabControlLimit;
}

export interface LabSamplePoint {
  id: string;
  plantCode: string;
  plantName: string;
  samplePointName: string;
  sampleType: string;
  description?: string;
  isActive: boolean;
  createdByName: string;
  createdByEmail: string;
  createdOn: string;
  updatedByName?: string;
  updatedOn?: string;
  parameters: LabSamplePointParameter[];
}
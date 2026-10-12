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
  sampleRecordId?: string;
  followUpOfAnalysisId?: string | null;
  actionToTake?: string | null;
  createdByName: string;
  createdOn: string;
  updatedByName?: string;
  updatedOn?: string;
  parameters: LabAnalysisParameter[];
}

export interface LabAnalysisAction {
  id: string;
  /** null = legacy action available to every plant until assigned. */
  plantCode?: string | null;
  plantName?: string | null;
  name: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  usageCount: number;
  createdByName: string;
  createdOn: string;
  updatedByName?: string;
  updatedOn?: string;
}

export interface SaveLabAnalysisParameterForm {
  samplePointParameterId?: string;
  parameterName: string;
  unit?: string;
  value: string;
}

export interface SaveLabAnalysisForm {
  plantCode: string;
  logDate: string;
  samplePointId: string;
  samplePoint: string;
  sampleType: string;
  analysisTime?: string;
  analysedBy?: string;
  remarks?: string;
  sampleRecordId?: string;
  parameters: SaveLabAnalysisParameterForm[];
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
  sampleFrom?: string | null;
  appearance?: string | null;
  container?: string | null;
  quantityOfSample?: number | null;
  quantityUnit?: string | null;
  labToAnalyze?: string | null;
  collectedBy?: string;
  collectedAt?: string;
  sentToLabAt?: string;
  receivedAt?: string;
  analysisStatus: string;
  linkedAnalysisCount: number;
  linkedLabRefNumbers: string[];
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
  weatherCondition?: string | null;
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
  readingTime?: string | null;
  strainerFeedPressure?: number | null;
  strainerOutletPressure?: number | null;
  strainerDp?: number | null;
  clarifier1OutletTurbidity?: number | null;
  clarifier2OutletTurbidity?: number | null;
  feedTurbidity?: number | null;
  temperature?: number | null;
  uf1FeedPressure?: number | null;
  uf1FiltratePressure?: number | null;
  uf1Dp?: number | null;
  uf1FeedFlow?: number | null;
  uf1FiltrateTurbidity?: number | null;
  uf2FeedPressure?: number | null;
  uf2FiltratePressure?: number | null;
  uf2Dp?: number | null;
  uf2FeedFlow?: number | null;
  uf2FiltrateTurbidity?: number | null;
  uf3FeedPressure?: number | null;
  uf3FiltratePressure?: number | null;
  uf3Dp?: number | null;
  uf3FeedFlow?: number | null;
  uf3FiltrateTurbidity?: number | null;
  uf4FeedPressure?: number | null;
  uf4FiltratePressure?: number | null;
  uf4Dp?: number | null;
  uf4FeedFlow?: number | null;
  uf4FiltrateTurbidity?: number | null;
  ufPumpTag?: string | null;
  ufPumpSpeed?: number | null;
  ufPumpCurrent?: number | null;
  feedFlow?: number | null;
  permeateFlow?: number | null;
  backwashFrequency?: number | null;
  tmp?: number | null;
  sdi?: number | null;
  feedPressure?: number | null;
  outletPressure?: number | null;
  differentialPressure?: number | null;
  filtrateTurbidity?: number | null;
  remarks?: string | null;
}

export interface LabDesalinationSWRO {
  id: string;
  readingTime?: string | null;
  cfFeedPressure?: number | null;
  cfOutletPressure?: number | null;
  cfDp?: number | null;
  feedPressure?: number | null;
  roBrinePressurePxFeed?: number | null;
  roDp?: number | null;
  pxOutletPressureHp?: number | null;
  roBrinePressurePxLp?: number | null;
  boosterPumpDp?: number | null;
  pxDp?: number | null;
  permeatePressure?: number | null;
  roFeedFlowHp?: number | null;
  roFeedFlowLpPx?: number | null;
  feedFlow?: number | null;
  roBoosterFlow?: number | null;
  brineFlowLp?: number | null;
  brineFlowHp?: number | null;
  brineLeakage?: number | null;
  roPermeateFlow?: number | null;
  recoveryRate?: number | null;
  roFeedPh?: number | null;
  roFeedOrp?: number | null;
  roFeedTemperature?: number | null;
  feedCondPostPxHand?: number | null;
  feedCondRawHand?: number | null;
  condIncreasePx?: number | null;
  feedCondRaw?: number | null;
  assumedSalinityIncrease?: number | null;
  feedCondPostPx?: number | null;
  conductivity?: number | null;
  saltRejection?: number | null;
  saltRejectionPostPx?: number | null;
  antiscalantDosing?: number | null;
  smbsDosing?: number | null;
  lpPumpTag?: string | null;
  lpPumpSpeed?: number | null;
  lpPumpCasingTemp?: number | null;
  lpPumpDischargePressure?: number | null;
  filtrateTankLevelPct?: number | null;
  filtrateTankLevelM?: number | null;
  lpPumpDp?: number | null;
  lpPumpDischargeBar?: number | null;
  dpPumpToCfFeed?: number | null;
  roHpPumpDp?: number | null;
  hpPumpTag?: string | null;
  hpPumpSpeed?: number | null;
  hpPumpCurrent?: number | null;
  boosterPumpTag?: string | null;
  boosterPumpSpeed?: number | null;
  boosterPumpCurrent?: number | null;
  rejectFlow?: number | null;
  remarks?: string | null;
}

export interface LabDesalinationBWRO {
  id: string;
  readingTime?: string | null;
  cfFeedPressure?: number | null;
  cfOutletPressure?: number | null;
  cfDp?: number | null;
  feedPressure?: number | null;
  interpassPressure?: number | null;
  brinePressure?: number | null;
  stage1Dp?: number | null;
  stage2Dp?: number | null;
  stage1PermeatePressure?: number | null;
  permeatePressure?: number | null;
  permeateBackpressure?: number | null;
  feedFlow?: number | null;
  rejectFlow?: number | null;
  permeateFlow?: number | null;
  recoveryRate?: number | null;
  feedTemperature?: number | null;
  feedConductivity?: number | null;
  feedConductivityHand?: number | null;
  conductivity?: number | null;
  rejectionOnline?: number | null;
  rejectionHand?: number | null;
  dbnpaDosage?: number | null;
  lpPumpTag?: string | null;
  lpPumpSpeed?: number | null;
  lpPumpCurrent?: number | null;
  lpPumpCasingTemp?: number | null;
  hpPumpTag?: string | null;
  hpPumpSpeed?: number | null;
  hpPumpCurrent?: number | null;
  hpPumpCasingTemp?: number | null;
  remarks?: string | null;
}

export interface LabDesalinationClarifier {
  id: string;
  readingTime?: string | null;
  rawFeedConductivity?: number | null;
  rawFeedPh?: number | null;
  rawFeedOrp?: number | null;
  rawFeedLevel?: number | null;
  rawFeedTurbidity?: number | null;
  c1FeedFlow?: number | null;
  c1OutletTurbidity?: number | null;
  c1FlocMixerSpeed?: number | null;
  c1ScraperSpeed?: number | null;
  c1FerricDosingFlow?: number | null;
  c1PolymerDosingFlow?: number | null;
  c1SludgeFrequency?: number | null;
  c1SludgeDuration?: number | null;
  c2FeedFlow?: number | null;
  c2OutletTurbidity?: number | null;
  c2FlocMixerSpeed?: number | null;
  c2ScraperSpeed?: number | null;
  c2FerricDosingFlow?: number | null;
  c2PolymerDosingFlow?: number | null;
  c2SludgeFrequency?: number | null;
  c2SludgeDuration?: number | null;
  influentFlow?: number | null;
  effluentTurbidity?: number | null;
  sludgeLevel?: number | null;
  chemicalDosingRate?: number | null;
  remarks?: string | null;
}

export interface LabDesalinationPX {
  id: string;
  readingTime?: string | null;
  brineConductivity?: number | null;
  px01Conductivity?: number | null;
  px02Conductivity?: number | null;
  px03Conductivity?: number | null;
  feedConductivity?: number | null;
  temperature?: number | null;
  remarks?: string | null;
}

export interface LabDesalinationProductWater {
  id: string;
  readingTime?: string | null;
  plantFlowCounter?: number | null;
  plantFlowDelta?: number | null;
  dischargePressure?: number | null;
  flowRate?: number | null;
  conductivity?: number | null;
  ph?: number | null;
  swroPumpTag?: string | null;
  swroPumpSpeed?: number | null;
  swroPumpCurrent?: number | null;
  swroPumpCasingTemp?: number | null;
  prodPumpTag?: string | null;
  prodPumpSpeed?: number | null;
  prodPumpCurrent?: number | null;
  prodPumpCasingTemp?: number | null;
  prodPumpActivePower?: number | null;
  prodPumpActiveEnergy?: number | null;
  tds?: number | null;
  chlorineResidual?: number | null;
  hardness?: number | null;
  remarks?: string | null;
}

export interface LabDesalinationLogEntry {
  id: string;
  entryTime: string;
  shiftCode: 'DAY' | 'NIGHT' | string;
  category: string;
  entryText: string;
  createdByName: string;
  createdOn: string;
  isAuto?: boolean;
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
  uf: LabDesalinationUF[];
  swro: LabDesalinationSWRO[];
  bwro: LabDesalinationBWRO[];
  clarifier: LabDesalinationClarifier[];
  px: LabDesalinationPX[];
  productWater: LabDesalinationProductWater[];
  entries: LabDesalinationLogEntry[];
}

// ─── Chemical Dosing ────────────────────────────────────────────────────────
export interface LabChemicalDosingRow {
  id: string;
  plantCode: string;
  plantName: string;
  logDate: string;
  chemicalName: string;
  dosingPoint?: string;
  volumeDosed?: number;
  volumeUnit?: string;
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
  appearance?: string;
  traceMetals?: string;
  testMethods?: string;
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
  sampleRecordId?: string;
  sampleId?: string;
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
  location?: string;
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
  ambientTemperature?: number;
  relativeHumidity?: number;
  remarks?: string;
  createdByName: string;
  createdByEmail: string;
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

export interface LabSampleType {
  id: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  samplePointCount: number;
  createdByName: string;
  createdOn: string;
  updatedByName?: string | null;
  updatedOn?: string | null;
}

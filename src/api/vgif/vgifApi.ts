import axiosInstance from '../axiosInstance';

export interface VgifPoint {
  id: string;
  code: string;
  name: string;
  linkedPlantCode?: string | null;
  hasAg15: boolean;
  hasAg12: boolean;
  displayOrder: number;
  isActive: boolean;
}

export type SaveVgifPoint = Omit<VgifPoint, 'id'>;

export interface VgifSettings {
  responsiblePlantCode: string;
  responsiblePlantName: string;
  autoFillHeatingValue: boolean;
  heatingValuePointId?: string | null;
  ag12NormalStates: string;
  modifiedOn: string;
  modifiedByName: string;
  /** The signed-in user may upload (belongs to the responsible plant or is not tied to plants). */
  canRecord: boolean;
}

export interface VgifImportRequest {
  pointId: string;
  date?: string | null;
  includeAllDates: boolean;
  text: string;
  fileName?: string | null;
  overwrite?: string[];
}

export interface VgifChange { field: string; label: string; stored: number | null; inFile: number | null }

export interface VgifPreviewRow {
  key: string;
  date: string;
  time: string;
  ordinal?: number | null;
  status: 'new' | 'same' | 'changed' | 'invalid';
  values: Record<string, number | null>;
  states: Record<string, number>;
  problems: string[];
  changes: VgifChange[];
  consumption?: number | null;
  dailyVolume?: number | null;
  variance?: number | null;
  totalizerFlag?: string | null;
}

export interface VgifPreview {
  pointCode: string;
  pointName: string;
  rowsInFile: number;
  otherDates: number;
  new: number;
  same: number;
  changed: number;
  invalid: number;
  duplicatesInFile: number;
  firstInFile?: string | null;
  lastInFile?: string | null;
  errors: string[];
  warnings: string[];
  rows: VgifPreviewRow[];
  dayCounts: Record<string, number>;
}

export interface VgifImportResult {
  batchId: string;
  added: number;
  overwritten: number;
  unchanged: number;
  ignored: number;
  message: string;
}

export interface VgifChecklistItem {
  pointId: string;
  pointCode: string;
  pointName: string;
  hasAg15: boolean;
  hasAg12: boolean;
  ag15Done: boolean;
  ag15Consumption?: number | null;
  ag12Rows: number;
  ag12Expected: number;
}

export interface VgifAg15Row {
  id: string;
  pointId: string;
  pointCode: string;
  readingDate: string;
  readingTime: string;
  ordinalNo?: number | null;
  values: Record<string, number | null>;
  states: Record<string, number>;
  consumption?: number | null;
  dailyVolume?: number | null;
  variance?: number | null;
  totalizerFlag?: string | null;
  isCorrected: boolean;
  correctionReason?: string | null;
  correctedByName?: string | null;
  correctedOn?: string | null;
  createdByName: string;
  createdOn: string;
}

export interface VgifAg12Row {
  id: string;
  readingAt: string;
  ordinalNo?: number | null;
  values: Record<string, number | null>;
  states: Record<string, number>;
}

export type VgifKind = 'ag15' | 'ag12';

export const vgifApi = {
  getSettings: () => axiosInstance.get<VgifSettings>('/vgif/settings'),
  saveSettings: (s: { responsiblePlantCode: string; autoFillHeatingValue: boolean; heatingValuePointId?: string | null; ag12NormalStates: string }) =>
    axiosInstance.put<VgifSettings>('/vgif/settings', s),
  getPoints: (includeInactive = false) => axiosInstance.get<VgifPoint[]>('/vgif/settings/points', { params: { includeInactive } }),
  addPoint: (p: SaveVgifPoint) => axiosInstance.post('/vgif/settings/points', p),
  updatePoint: (id: string, p: SaveVgifPoint) => axiosInstance.put(`/vgif/settings/points/${id}`, p),
  deletePoint: (id: string) => axiosInstance.delete(`/vgif/settings/points/${id}`),
  checklist: (date: string) => axiosInstance.get<VgifChecklistItem[]>('/vgif/checklist', { params: { date } }),

  preview: (kind: VgifKind, req: VgifImportRequest) => axiosInstance.post<VgifPreview>(`/vgif/${kind}/preview`, req),
  import: (kind: VgifKind, req: VgifImportRequest) => axiosInstance.post<VgifImportResult>(`/vgif/${kind}/import`, req),

  getAg15: (params: { pointId?: string; from: string; to: string }) => axiosInstance.get<VgifAg15Row[]>('/vgif/ag15', { params }),
  correctAg15: (id: string, values: Record<string, number | null>, reason?: string) =>
    axiosInstance.put(`/vgif/ag15/${id}`, { values, reason }),
  deleteAg15: (id: string) => axiosInstance.delete(`/vgif/ag15/${id}`),
  getAg12Day: (pointId: string, date: string) => axiosInstance.get<VgifAg12Row[]>('/vgif/ag12', { params: { pointId, date } }),
};

/** AG15 fields as the server knows them (key, label, unit, group), for tables and the correction form. */
export const AG15_FIELDS: { key: string; label: string; unit?: string; group: string }[] = [
  { key: 'AbsPressureFreeze', label: 'Absolute pressure (freeze)', unit: 'bar', group: 'Conditions' },
  { key: 'TemperatureFreeze', label: 'Temperature (freeze)', unit: '°C', group: 'Conditions' },
  { key: 'EnergyTotalizer', label: 'Energy totalizer', unit: 'MMBtu', group: 'Totalizers' },
  { key: 'EnergyDisturbanceTotalizer', label: 'Energy disturbance totalizer', unit: 'MMBtu', group: 'Totalizers' },
  { key: 'OriginalTotalizer', label: 'Original totalizer', unit: 'm³', group: 'Totalizers' },
  { key: 'VolumeTotalizer', label: 'Volume totalizer', unit: 'Sm³', group: 'Totalizers' },
  { key: 'VolumeDisturbanceTotalizer', label: 'Volume disturbance totalizer', unit: 'Sm³', group: 'Totalizers' },
  { key: 'MassTotalizer', label: 'Mass totalizer', unit: 'kg', group: 'Totalizers' },
  { key: 'DailyEnergyYesterday', label: 'Daily energy (meter)', unit: 'MMBtu', group: 'Meter quantities' },
  { key: 'DailyVolumeYesterday', label: 'Daily volume (meter)', unit: 'Sm³', group: 'Meter quantities' },
  { key: 'LastMonthEnergy', label: 'Last month energy (meter)', unit: 'MMBtu', group: 'Meter quantities' },
  { key: 'LastHourEnergy', label: 'Last hour energy (meter)', unit: 'MMBtu', group: 'Meter quantities' },
  { key: 'DensityFreeze', label: 'Density (freeze)', unit: 'kg/m³', group: 'Gas quality' },
  { key: 'CalorificDailyMean', label: 'Calorific value (daily mean)', unit: 'kWh/Sm³', group: 'Gas quality' },
  { key: 'CalorificFreeze', label: 'Calorific value (freeze)', unit: 'kWh/Sm³', group: 'Gas quality' },
  { key: 'AbsPressure', label: 'Absolute pressure', unit: 'bar', group: 'Measured values' },
  { key: 'Temperature', label: 'Temperature', unit: '°C', group: 'Measured values' },
  { key: 'Calorific', label: 'Calorific value', unit: 'kWh/Sm³', group: 'Measured values' },
  { key: 'StandardDensity', label: 'Standard density', unit: 'kg/Sm³', group: 'Measured values' },
  { key: 'Density', label: 'Density', unit: 'kg/m³', group: 'Measured values' },
];

export const AG12_FIELDS: { key: string; label: string; unit?: string; group: string }[] = [
  { key: 'CalorificValue', label: 'Calorific value', unit: 'kWh/Sm³', group: 'Properties' },
  { key: 'StandardDensity', label: 'Standard density', unit: 'kg/Sm³', group: 'Properties' },
  { key: 'RelativeDensity', label: 'Relative density', group: 'Properties' },
  { key: 'Methane', label: 'Methane (C1)', unit: 'mol%', group: 'Composition' },
  { key: 'Ethane', label: 'Ethane (C2)', unit: 'mol%', group: 'Composition' },
  { key: 'Propane', label: 'Propane (C3)', unit: 'mol%', group: 'Composition' },
  { key: 'IButane', label: 'i-Butane', unit: 'mol%', group: 'Composition' },
  { key: 'NButane', label: 'n-Butane', unit: 'mol%', group: 'Composition' },
  { key: 'NeoPentane', label: 'neo-Pentane', unit: 'mol%', group: 'Composition' },
  { key: 'IPentane', label: 'i-Pentane', unit: 'mol%', group: 'Composition' },
  { key: 'NPentane', label: 'n-Pentane', unit: 'mol%', group: 'Composition' },
  { key: 'Hexane', label: 'Hexane (C6+)', unit: 'mol%', group: 'Composition' },
  { key: 'CarbonDioxide', label: 'CO₂', unit: 'mol%', group: 'Composition' },
  { key: 'Nitrogen', label: 'N₂', unit: 'mol%', group: 'Composition' },
  { key: 'Hydrogen', label: 'H₂', unit: 'mol%', group: 'Composition' },
  { key: 'Oxygen', label: 'O₂', unit: 'mol%', group: 'Composition' },
  { key: 'CarbonMonoxide', label: 'CO', unit: 'mol%', group: 'Composition' },
  { key: 'Helium', label: 'Helium', unit: 'mol%', group: 'Composition' },
  { key: 'Argon', label: 'Argon', unit: 'mol%', group: 'Composition' },
];

/** Btu per standard cubic foot from kWh per standard cubic metre (× 3412.14 ÷ 35.31). */
export const btuPerScf = (kwh?: number | null) => (kwh == null ? null : (kwh * 3412.14) / 35.31);

export const fmt = (v: number | null | undefined, digits = 2) =>
  v == null ? '' : v.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: 0 });

/** Readable message from an API error. */
export const apiError = (e: unknown, fallback: string) => {
  const d = (e as { response?: { data?: unknown; status?: number } })?.response;
  if (d?.data && typeof d.data === 'object' && 'message' in (d.data as object)) return String((d.data as { message: string }).message);
  if (typeof d?.data === 'string' && d.data) return d.data;
  if (d?.status === 403) return 'You do not have permission to do this.';
  return fallback;
};

// ── Rates and reports ──
export interface VgifRate { id: string; effectiveFrom: string; gasPrice: number; tariff: number; notes?: string | null; createdByName: string; createdOn: string }
export type SaveVgifRate = { effectiveFrom: string; gasPrice: number; tariff: number; notes?: string | null };

export interface VgifGasCell {
  energyTotalizer: number | null; consumption: number | null; progressive: number | null; meterDaily: number | null;
  variance: number | null; volumeTotalizer: number | null; dailyVolume: number | null; density: number | null;
  calorific: number | null; btuPerScf: number | null; flag?: string | null; isCorrected: boolean;
}
export interface VgifGasTotals {
  consumption: number; meterDaily: number; dailyVolume: number; avgCalorific: number | null; avgBtuPerScf: number | null;
  avgDensity: number | null; daysRecorded: number; daysExpected: number;
}
export interface VgifGasMonth {
  year: number; month: number; points: { id: string; code: string; name: string }[];
  days: { date: string; cells: Record<string, VgifGasCell> }[]; totals: Record<string, VgifGasTotals>;
}
export interface VgifCostRow {
  date: string; gasMmbtu: number | null; generationMwh: number | null; tariff: number | null; gasPrice: number | null;
  costOfGas: number | null; revenue: number | null; heatRateHhv: number | null; heatRateLhv: number | null;
  capacityFactor: number | null; gasCostPerMwh: number | null;
}
export interface VgifCost {
  pointCode: string; pointName: string; generationSource?: string | null; capacityMw?: number | null;
  notes: string[]; rows: VgifCostRow[]; total: VgifCostRow;
}

export const vgifReportsApi = {
  rates: () => axiosInstance.get<VgifRate[]>('/vgif/rates'),
  addRate: (r: SaveVgifRate) => axiosInstance.post('/vgif/rates', r),
  updateRate: (id: string, r: SaveVgifRate) => axiosInstance.put(`/vgif/rates/${id}`, r),
  deleteRate: (id: string) => axiosInstance.delete(`/vgif/rates/${id}`),
  gasMonth: (year: number, month: number) => axiosInstance.get<VgifGasMonth>('/vgif/reports/gas-month', { params: { year, month } }),
  gasMonthExport: (year: number, month: number) =>
    axiosInstance.get<Blob>('/vgif/reports/gas-month/export', { params: { year, month }, responseType: 'blob' }),
  cost: (pointId: string, from: string, to: string) => axiosInstance.get<VgifCost>('/vgif/reports/cost', { params: { pointId, from, to } }),
  costExport: (pointId: string, from: string, to: string) =>
    axiosInstance.get<Blob>('/vgif/reports/cost/export', { params: { pointId, from, to }, responseType: 'blob' }),
};

/** Save a downloaded file. */
export const saveBlob = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// ── AG12 analysis ──
export interface VgifStat { mean: number | null; min: number | null; max: number | null }
export interface VgifAg12Series {
  pointId: string; code: string; readings: number; expected: number; abnormal: number;
  days: { date: string; readings: number; abnormal: number; fields: Record<string, VgifStat> }[];
  overall: Record<string, VgifStat>; stdDev: Record<string, number | null>;
}
export const vgifAnalysisApi = {
  ag12: (pointIds: string[], from: string, to: string) =>
    axiosInstance.get<VgifAg12Series[]>('/vgif/analysis/ag12', {
      params: { pointIds, from, to },
      paramsSerializer: { indexes: null },
    }),
};

// ── Bulk delete ──
export interface VgifBulkDelete { ids?: string[]; all?: boolean; pointId?: string | null; from?: string | null; to?: string | null }
export const vgifDeleteApi = {
  bulk: (kind: VgifKind, body: VgifBulkDelete) =>
    axiosInstance.delete<{ deleted: number; message: string }>(`/vgif/${kind}/bulk`, { data: body }),
};

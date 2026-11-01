import axiosInstance from '../axiosInstance';

export interface SummaryDataset {
  key: string;
  label: string;
  hasUnits: boolean;
  /** "Hour" or "Interval" */
  timeLabel: string;
  /** Entry page, opened from a row with ?plant=&date= */
  entryPath: string;
  /** Daily: group in the dataset list (Energy, Fuel…) */
  category?: string;
  /** "Unit" or "Transformer" — defaults to Unit */
  unitLabel?: string;
  /** units: one field across units · columns: every column side by side (buses) · none: no compare view */
  compare?: 'units' | 'columns' | 'none';
}

export interface SummaryColumn {
  key: string;
  label: string;
  group: string;
  unit?: string | null;
  numeric: boolean;
}

export interface SummaryUnit { unitCode: string; unitName: string }

export interface SummaryRow {
  id: string;
  date: string;
  /** Minutes after midnight */
  minutes: number;
  unitCode: string;
  unitName: string;
  values: Record<string, number | string | null>;
}

export interface CompareStat { unitCode: string; count: number; min: number | null; max: number | null; avg: number | null }
export interface CompareRow { date: string; minutes: number; values: Record<string, number | null> }

export type TrendBucket = 'auto' | 'raw' | 'day' | 'week' | 'month';
export interface TrendPoint { t: string; v: number; min: number | null; max: number | null; n: number }
export interface TrendSeries {
  field: string; unitCode: string; label: string; group: string; unit?: string | null; points: TrendPoint[];
}

export interface SummaryFilters {
  plantCode: string;
  from: string;
  to: string;
  units?: string[];
  hourFrom?: number | null;
  hourTo?: number | null;
  /** Daily logs with a reading time: minutes after midnight */
  time?: number | null;
}

export type SummaryKind = 'hourly' | 'daily';

const params = (dataset: string, f: SummaryFilters) => ({
  dataset,
  plantCode: f.plantCode,
  from: f.from,
  to: f.to,
  units: f.units && f.units.length ? f.units.join(',') : undefined,
  hourFrom: f.hourFrom ?? undefined,
  hourTo: f.hourTo ?? undefined,
  time: f.time ?? undefined,
});

/** The Hourly and Daily Summary endpoints share one shape. */
export const summaryApi = (kind: SummaryKind) => {
  const base = `/summaries/${kind}`;
  return {
  getDatasets: (plantCode: string) =>
    axiosInstance.get<SummaryDataset[]>(`${base}/datasets`, { params: { plantCode } }),

  getColumns: (dataset: string, plantCode: string) =>
    axiosInstance.get<{ columns: SummaryColumn[]; units: SummaryUnit[]; times?: number[] }>(`${base}/columns`, { params: { dataset, plantCode } }),

  getRecords: (dataset: string, f: SummaryFilters, page: number, pageSize: number, newestFirst: boolean) =>
    axiosInstance.get<{ total: number; rows: SummaryRow[] }>(`${base}/records`,
      { params: { ...params(dataset, f), page, pageSize, newestFirst } }),

  compare: (dataset: string, f: SummaryFilters, field: string, page: number, pageSize: number, newestFirst: boolean) =>
    axiosInstance.get<{ total: number; units: string[]; stats: CompareStat[]; rows: CompareRow[] }>(`${base}/compare`,
      { params: { ...params(dataset, f), field, page, pageSize, newestFirst } }),

  trend: (dataset: string, f: SummaryFilters, fields: string[], bucket: TrendBucket) =>
    axiosInstance.get<{ bucket: TrendBucket; series: TrendSeries[] }>(`${base}/trend`,
      { params: { ...params(dataset, f), fields: fields.join(','), bucket } }),

  exportExcel: (dataset: string, f: SummaryFilters, columns: string[], newestFirst: boolean) =>
    axiosInstance.get<Blob>(`${base}/export`,
      { params: { ...params(dataset, f), columns: columns.join(','), newestFirst }, responseType: 'blob', timeout: 0 }),
};
};

export type SummaryApi = ReturnType<typeof summaryApi>;
export const hourlySummaryApi = summaryApi('hourly');
export const dailySummaryApi = summaryApi('daily');

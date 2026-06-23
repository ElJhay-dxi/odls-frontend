export const PEAK_INTERVALS = [
  '18:15', '18:30', '18:45',
  '19:00', '19:15', '19:30', '19:45',
  '20:00', '20:15',
];

export interface PeakPeriodInterval {
  id?: string;
  peakPeriodReadingId?: string;
  intervalTime: string; // "HH:mm"
  mW?: number | string;
  mVar?: number | string;
  voltage?: number | string;
}

export interface PeakPeriodReading {
  id: string;
  plantName: string;
  plantCode: string;
  unitName: string;
  unitCode: string;
  logDate: string;
  remarks?: string;
  createdOn: string;
  createdByName: string;
  createdByEmail: string;
  intervals: PeakPeriodInterval[];
}
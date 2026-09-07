export interface DailyUnitTrip {
  id: string;
  plantCode: string;
  plantName: string;
  unitCode: string;
  unitName: string;
  logDate: string;
  pls?: number;
  shutdown?: number;
  lowLoadTrip?: number;
  highLoadTrip?: number;
  preIgnition?: number;
  preSync?: number;
  partialLoadTrip?: number;
  fullLoadTrip?: number;
  remarks?: string;
  createdByName: string;
  createdOn: string;
  updatedByName?: string;
  updatedOn?: string;
}

export interface DailyUnitTripSummary {
  logDate: string;
  totalPls: number;
  totalShutdown: number;
  totalLowLoadTrip: number;
  totalHighLoadTrip: number;
  totalPreIgnition: number;
  totalPreSync: number;
  totalPartialLoadTrip: number;
  totalFullLoadTrip: number;
  totalTrips: number;
  unitCount: number;
}

export interface SaveDailyUnitTripForm {
  pls: string;
  shutdown: string;
  lowLoadTrip: string;
  highLoadTrip: string;
  preIgnition: string;
  preSync: string;
  partialLoadTrip: string;
  fullLoadTrip: string;
  remarks: string;
}

export interface DailyReactivePower {
  id: string;
  plantName: string;
  plantCode: string;
  unitCode: string;
  unitName: string;
  classificationType: string;
  logDate: string;
  previousReading: number;
  currentReading: number;
  difference: number;
  progressiveTotal: number;
  createdOn: string;
  createdByName: string;
  createdByEmail: string;
}

export interface DailyReactivePowerForm {
  plantCode: string;
  unitCode: string;
  unitName: string;
  logDate: string;
  currentReading: number | string;
}

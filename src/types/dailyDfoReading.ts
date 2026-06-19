export interface DailyDfoReading {
  id: string;
  plantName: string;
  plantCode: string;
  logDate: string;
  previousReading: number;
  currentReading: number;
  difference: number;
  progressiveTotal: number;
  createdOn: string;
  createdByName: string;
  createdByEmail: string;
}

export interface DailyDfoReadingForm {
  plantCode: string;
  logDate: string;
  currentReading: number | string;
}
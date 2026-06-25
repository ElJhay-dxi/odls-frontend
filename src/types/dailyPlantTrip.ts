export interface DailyPlantTrip {
  id: string;
  plantName: string;
  plantCode: string;
  classificationType: string;
  logDate: string;
  pls: number;
  primeMoverLowSteamTempPlst?: number;
  protectiveLoadSheddingTrip?: number;
  shutdown: number;
  lowLoadTrip: number;
  highLoadTrip: number;
  preIgnition: number;
  preSync: number;
  partialLoadTrip: number;
  fullLoadTrip: number;
  createdOn: string;
  createdByName: string;
  createdByEmail: string;
}

export interface DailyPlantTripForm {
  plantCode: string;
  logDate: string;
  pls: number | string;
  primeMoverLowSteamTempPlst: number | string;
  protectiveLoadSheddingTrip: number | string;
  shutdown: number | string;
  lowLoadTrip: number | string;
  highLoadTrip: number | string;
  preIgnition: number | string;
  preSync: number | string;
  partialLoadTrip: number | string;
  fullLoadTrip: number | string;
}
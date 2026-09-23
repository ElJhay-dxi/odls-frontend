export interface BearingMetal {
  id: string;
  plantName: string;
  plantCode: string;
  unitName: string;
  unitCode: string;
  bearingCode: number;
  bearingName: string;
  kkxCode?: string | null;
  createdOn: string;
  createdByName: string;
  createdByEmail: string;
}

export interface BearingDrain {
  id: string;
  plantName: string;
  plantCode: string;
  unitName: string;
  unitCode: string;
  drainCode: number;
  drainName: string;
  kkxCode?: string | null;
  createdOn: string;
  createdByName: string;
  createdByEmail: string;
}

export interface BearingMetalReadingRow {
  bearingCode: number;
  bearingName: string;
  metalTemperature: string | number;
}

export interface BearingDrainReadingRow {
  drainCode: number;
  drainName: string;
  drainTemperature: string | number;
  tempDiff?: number | null;
}
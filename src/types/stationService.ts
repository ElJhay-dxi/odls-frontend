/** One station service transformer (TSS) on a station log, with its status for the day. */
export interface StationServiceRow {
  id?: string;
  equipmentCode: string;
  equipmentName: string;
  status: string;
  remarks?: string | null;
  sortOrder?: number;
}

export interface SaveStationServiceRowItem {
  equipmentCode: string;
  equipmentName: string;
  status: string;
  remarks?: string | null;
}

export interface CarryOverSection {
  key: string;
  label: string;
  count: number;
  defaultSelected: boolean;
  note?: string | null;
}

export interface CarryOverOptions {
  /** The earlier log the data would come from; null when the plant has no earlier log. */
  sourceDate: string | null;
  /** True when the source log is exactly the day before. */
  isYesterday: boolean;
  /** Earlier logs that can be picked instead, newest first. */
  recentDates: string[];
  sections: CarryOverSection[];
}

/** One row in the station-log history popup, with what the signed-in user may do to it. */
export interface StationLogHistoryItem {
  id: string;
  logDate: string;
  createdByName: string;
  createdOn: string;
  updatedByName?: string | null;
  updatedOn?: string | null;
  entryCount: number;
  canEdit: boolean;
  canDelete: boolean;
}

/** Filters for the station-log history popup */
export interface StationLogHistoryFilters {
  from?: string;   // yyyy-MM-dd
  to?: string;     // yyyy-MM-dd
  search?: string;
}

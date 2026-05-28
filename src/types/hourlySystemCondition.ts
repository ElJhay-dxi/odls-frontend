export interface HourlySystemCondition {
  id: string;
  logDate: string;
  logHour: number;
  frequency?: number;
  // Hydro
  a1GsMW?: number; a1GsMVar?: number;
  z19GsMW?: number; z19GsMVar?: number;
  bu54MW?: number; bu54MVar?: number;
  // Thermal
  tt32TapcoMW?: number; tt32TapcoMVar?: number;
  tt32TicoMW?: number; tt32TicoMVar?: number;
  tp47MW?: number; tp47MVar?: number;
  cenitMW?: number; cenitMVar?: number;
  am84MW?: number; am84MVar?: number;
  asgliSg51MW?: number; asgliSg51MVar?: number;
  at91MW?: number; at91MVar?: number;
  ka77MW?: number; ka77MVar?: number;
  cp76MW?: number; cp76MVar?: number;
  ak79MW?: number; ak79MVar?: number;
  // Solar
  buiSolarMW?: number; buiSolarMVar?: number;
  // Customer load
  valcoMW?: number;
  // CIE
  cieMW?: number; cieMVar?: number;
  // Computed
  totalHydroMW?: number; totalHydroMVar?: number;
  totalSolarMW?: number; totalSolarMVar?: number;
  totalThermalMW?: number; totalThermalMVar?: number;
  totalSystemMW?: number; totalSystemMVar?: number;
  grandTotalMW?: number; grandTotalMVar?: number;
  // Audit
  createdOn: string;
  createdByName: string;
  createdByEmail: string;
}

export type SystemConditionForm = {
  logDate: string;
  logHour: number | string;
  frequency: number | string;
  a1GsMW: number | string; a1GsMVar: number | string;
  z19GsMW: number | string; z19GsMVar: number | string;
  bu54MW: number | string; bu54MVar: number | string;
  tt32TapcoMW: number | string; tt32TapcoMVar: number | string;
  tt32TicoMW: number | string; tt32TicoMVar: number | string;
  tp47MW: number | string; tp47MVar: number | string;
  cenitMW: number | string; cenitMVar: number | string;
  am84MW: number | string; am84MVar: number | string;
  asgliSg51MW: number | string; asgliSg51MVar: number | string;
  at91MW: number | string; at91MVar: number | string;
  ka77MW: number | string; ka77MVar: number | string;
  cp76MW: number | string; cp76MVar: number | string;
  ak79MW: number | string; ak79MVar: number | string;
  buiSolarMW: number | string; buiSolarMVar: number | string;
  valcoMW: number | string;
  cieMW: number | string; cieMVar: number | string;
};
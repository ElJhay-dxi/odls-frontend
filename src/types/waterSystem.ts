// Shared type for a, b, f (prev/curr/diff/progressive)
export interface WaterMeterReading {
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

// c) Freshwater Tank Level
export interface FreshwaterTankLevel {
  id: string;
  plantName: string;
  plantCode: string;
  logDate: string;
  levelPct: number;
  createdOn: string;
  createdByName: string;
  createdByEmail: string;
}

// d) Demin Water Tank Level
export interface DeminWaterTankLevel {
  id: string;
  plantName: string;
  plantCode: string;
  logDate: string;
  previousReading: number;
  currentReading: number;
  difference: number;
  createdOn: string;
  createdByName: string;
  createdByEmail: string;
}

// e) GT CO2
export interface GtCo2Level {
  id: string;
  plantName: string;
  plantCode: string;
  logDate: string;
  pressure: number;
  co2Pct: number;
  createdOn: string;
  createdByName: string;
  createdByEmail: string;
}

// g) Hydro Water Level
export interface HydroWaterLevel {
  id: string;
  plantName: string;
  plantCode: string;
  logDate: string;
  headWaterLevel: number;
  tailWaterLevel: number;
  netHead: number;
  createdOn: string;
  createdByName: string;
  createdByEmail: string;
}

// h) Hydro Water Discharge
export interface HydroWaterDischarge {
  id: string;
  plantName: string;
  plantCode: string;
  logDate: string;
  unitDischarge: number;
  spillwayDischarge: number;
  efficiencyKwCfs: number;
  efficiencyKwMcs: number;
  createdOn: string;
  createdByName: string;
  createdByEmail: string;
}
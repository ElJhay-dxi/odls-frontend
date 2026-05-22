// ─── Shared ───────────────────────────────────────────────────────────────────
export interface HourlyReadingAudit {
  id: string;
  plantName: string;
  plantCode: string;
  unitName: string;
  unitCode: string;
  logDate: string;
  logHour: number;
  createdOn: string;
  createdByName: string;
  createdByEmail: string;
  remarks?: string;
}

// ─── Hydro ────────────────────────────────────────────────────────────────────
export interface HourlyHydroReading extends HourlyReadingAudit {
  activePowerMW?: number;
  reactivePowerMVar?: number;
  voltageKV?: number;
  currentAmps?: number;
  powerFactor?: number;
  statorTemperature?: number;
  generatorFieldVoltage?: number;
  generatorFieldCurrent?: number;
  exciterCurrent?: number;
  gatePosition?: number;
  turbineDischarge?: number;
  spillwayDischarge?: number;
  transformerOilTemperature?: number;
  transformerWindingTemperature?: number;
}

// All reading fields stored as strings in the form for flexible empty/null handling
export interface CreateHourlyHydroReadingForm {
  plantCode: string;
  unitCode: string;
  logDate: string;
  logHour: number | string;
  activePowerMW: number | string;
  reactivePowerMVar: number | string;
  voltageKV: number | string;
  currentAmps: number | string;
  powerFactor: number | string;
  statorTemperature: number | string;
  generatorFieldVoltage: number | string;
  generatorFieldCurrent: number | string;
  exciterCurrent: number | string;
  gatePosition: number | string;
  turbineDischarge: number | string;
  spillwayDischarge: number | string;
  transformerOilTemperature: number | string;
  transformerWindingTemperature: number | string;
  remarks: string;
}

export interface UpdateHourlyHydroReadingForm {
  activePowerMW: number | string;
  reactivePowerMVar: number | string;
  voltageKV: number | string;
  currentAmps: number | string;
  powerFactor: number | string;
  statorTemperature: number | string;
  generatorFieldVoltage: number | string;
  generatorFieldCurrent: number | string;
  exciterCurrent: number | string;
  gatePosition: number | string;
  turbineDischarge: number | string;
  spillwayDischarge: number | string;
  transformerOilTemperature: number | string;
  transformerWindingTemperature: number | string;
  remarks: string;
}

// API payloads — numeric fields are optional numbers
export interface CreateHourlyHydroReadingPayload {
  plantCode: string;
  unitCode: string;
  logDate: string;
  logHour: number;
  activePowerMW?: number;
  reactivePowerMVar?: number;
  voltageKV?: number;
  currentAmps?: number;
  powerFactor?: number;
  statorTemperature?: number;
  generatorFieldVoltage?: number;
  generatorFieldCurrent?: number;
  exciterCurrent?: number;
  gatePosition?: number;
  turbineDischarge?: number;
  spillwayDischarge?: number;
  transformerOilTemperature?: number;
  transformerWindingTemperature?: number;
  remarks?: string;
}

// ─── Thermal ──────────────────────────────────────────────────────────────────
export interface HourlyThermalReading extends HourlyReadingAudit {
  genMW?: number; genMVar?: number; genKV?: number; genTNHRpm?: number;
  genColdGasTemp?: number; genHotGasTemp?: number; genMaxStatorTemp?: number;
  compAmbTemp?: number; compIgvPos?: number; compAfq?: number; compCpd?: number; compCdt?: number;
  turbGasPressCtrl?: number; turbGasInterValvePress?: number; turbGasFuelFlow?: number;
  turbGasFuelTemp?: number; turbLiquidFuelFlow?: number; turbH2OInjFlow?: number;
  turbMaxBrgVib?: number; turbExhSprd?: number; turbAllwSprd?: number;
  turbExhstTemp?: number; turbLoadTunnTemp?: number; turbBrgHdTemp?: number;
  brgMetal1?: number; brgMetal2?: number; brgMetal3?: number; brgMetal4?: number; brgMetal5?: number;
  brgThrustActiveAcc?: number; brgThrustInactiveAcc?: number;
  brgDrain1?: number; brgTempDiff1?: number;
  brgDrain2?: number; brgTempDiff2?: number;
  brgDrain3?: number; brgTempDiff3?: number;
  brgDrain4?: number; brgTempDiff4?: number;
  brgDrain5?: number; brgTempDiff5?: number;
  atomAirTemp?: number;
  ex2000FldCurr?: number; ex2000FldVolt?: number; ex2000RotorTemp?: number;
  stgMW?: number; stgMVar?: number; stgKV?: number; stgTNHRpm?: number; stgSteamFlow?: number;
  stgTurbInletTemp?: number; stgTurbInletPress?: number;
  stgTurbExhaustTemp?: number; stgTurbExhaustPress?: number;
  stgSealSteamTemp?: number; stgSealSteamPress?: number; stgHydOilPress?: number;
  stgBrgHeaderTemp?: number; stgBrgHeaderPress?: number;
  stgThrustMaxAct?: number; stgThrustMaxInact?: number;
  stgJournalMaxMetal?: number; stgJournalMaxDrain?: number;
  stgVibAmpBbmax?: number; stgProx?: number;
  stgShellExp?: number; stgAxialExp?: number; stgDiffExp?: number;
  stgEx2000FldAmp?: number; stgEx2000FldVolts?: number; stgEx2000RotorTemp?: number;
}

export interface CreateHourlyThermalReadingForm {
  plantCode: string; unitCode: string; logDate: string; logHour: number | string;
  genMW: number | string; genMVar: number | string; genKV: number | string; genTNHRpm: number | string;
  genColdGasTemp: number | string; genHotGasTemp: number | string; genMaxStatorTemp: number | string;
  compAmbTemp: number | string; compIgvPos: number | string; compAfq: number | string;
  compCpd: number | string; compCdt: number | string;
  turbGasPressCtrl: number | string; turbGasInterValvePress: number | string;
  turbGasFuelFlow: number | string; turbGasFuelTemp: number | string;
  turbLiquidFuelFlow: number | string; turbH2OInjFlow: number | string;
  turbMaxBrgVib: number | string; turbExhSprd: number | string; turbAllwSprd: number | string;
  turbExhstTemp: number | string; turbLoadTunnTemp: number | string; turbBrgHdTemp: number | string;
  brgMetal1: number | string; brgMetal2: number | string; brgMetal3: number | string;
  brgMetal4: number | string; brgMetal5: number | string;
  brgThrustActiveAcc: number | string; brgThrustInactiveAcc: number | string;
  brgDrain1: number | string; brgDrain2: number | string; brgDrain3: number | string;
  brgDrain4: number | string; brgDrain5: number | string;
  atomAirTemp: number | string;
  ex2000FldCurr: number | string; ex2000FldVolt: number | string; ex2000RotorTemp: number | string;
  stgMW: number | string; stgMVar: number | string; stgKV: number | string;
  stgTNHRpm: number | string; stgSteamFlow: number | string;
  stgTurbInletTemp: number | string; stgTurbInletPress: number | string;
  stgTurbExhaustTemp: number | string; stgTurbExhaustPress: number | string;
  stgSealSteamTemp: number | string; stgSealSteamPress: number | string; stgHydOilPress: number | string;
  stgBrgHeaderTemp: number | string; stgBrgHeaderPress: number | string;
  stgThrustMaxAct: number | string; stgThrustMaxInact: number | string;
  stgJournalMaxMetal: number | string; stgJournalMaxDrain: number | string;
  stgVibAmpBbmax: number | string; stgProx: number | string;
  stgShellExp: number | string; stgAxialExp: number | string; stgDiffExp: number | string;
  stgEx2000FldAmp: number | string; stgEx2000FldVolts: number | string; stgEx2000RotorTemp: number | string;
  remarks: string;
}

export type UpdateHourlyThermalReadingForm = Omit<CreateHourlyThermalReadingForm,
  'plantCode' | 'unitCode' | 'logDate' | 'logHour'>;

export interface UpdateHourlyHydroReadingPayload {
  activePowerMW?: number;
  reactivePowerMVar?: number;
  voltageKV?: number;
  currentAmps?: number;
  powerFactor?: number;
  statorTemperature?: number;
  generatorFieldVoltage?: number;
  generatorFieldCurrent?: number;
  exciterCurrent?: number;
  gatePosition?: number;
  turbineDischarge?: number;
  spillwayDischarge?: number;
  transformerOilTemperature?: number;
  transformerWindingTemperature?: number;
  remarks?: string;
}
import axiosInstance from '../axiosInstance';
import type {
  ThermalStationLog, UpdateThermalStationLogForm, CreateThermalStationLogForm,
  ThermalStationLogEntry, ThermalStationLogSafetyDoc,
  ThermalStationLogCondition, ThermalStationLogGasReading,
  ThermalStationLogHseEntry, ThermalStationLogGenerationRow,
  ConditionForm, GasReadingForm, SafetyDocForm,
  HseEntryForm, FuelOilTankForm, GenerationRowForm, GasConditioningRowForm, WaterTreatmentRowForm,
  StationLogUnitOutput, SaveStationLogUnitOutputItem,
} from '../../types/thermalStationLog';

const BASE = '/thermalstationlogs';

const toNum = (v: string | null | undefined) =>
  v === '' || v === null || v === undefined ? null : Number(v);

export const thermalStationLogApi = {
  getByDate: (plantCode: string, date: string) =>
    axiosInstance.get<ThermalStationLog>(`${BASE}/by-date`, { params: { plantCode, date } }),

  getById: (id: string) =>
    axiosInstance.get<ThermalStationLog>(`${BASE}/${id}`),

  create: (data: CreateThermalStationLogForm) =>
    axiosInstance.post<ThermalStationLog>(BASE, { plantCode: data.plantCode, logDate: data.logDate }),

  update: (id: string, data: UpdateThermalStationLogForm) =>
    axiosInstance.put<ThermalStationLog>(`${BASE}/${id}`, {
      ...data,
      currentOutputMw: toNum(data.currentOutputMw),
      ambientTempC: toNum(data.ambientTempC),
      ambientPressureMbar: toNum(data.ambientPressureMbar),
      relativeHumidityPct: toNum(data.relativeHumidityPct),
      totalGenerationMwh: toNum(data.totalGenerationMwh),
      totalStationServiceMwh: toNum(data.totalStationServiceMwh),
      netGenerationMwh: toNum(data.netGenerationMwh),
      totalGasConsumed: toNum(data.totalGasConsumed),
      totalLiquidFuelConsumedMt: toNum(data.totalLiquidFuelConsumedMt),
      reactiveEnergyGeneratedVarh: toNum(data.reactiveEnergyGeneratedVarh),
    }),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),

  // Entries
  addEntry: (logId: string, entryTime: string, entryText: string) =>
    axiosInstance.post<ThermalStationLogEntry>(`${BASE}/${logId}/entries`, { entryTime, entryText }),

  updateEntry: (logId: string, entryId: string, entryTime: string, entryText: string) =>
    axiosInstance.put<ThermalStationLogEntry>(`${BASE}/${logId}/entries/${entryId}`, { entryTime, entryText }),

  deleteEntry: (logId: string, entryId: string) =>
    axiosInstance.delete(`${BASE}/${logId}/entries/${entryId}`),

  // Safety Docs
  addSafetyDoc: (logId: string, data: SafetyDocForm) =>
    axiosInstance.post<ThermalStationLogSafetyDoc>(`${BASE}/${logId}/safetydocs`, {
      safetyDocTypeCode: data.safetyDocTypeCode || null,
      safetyDocTypeName: data.safetyDocTypeName || null,
      docNumber: data.docNumber,
      workOrderNumber: data.workOrderNumber,
      permitHolder: data.permitHolder,
      workDescription: data.workDescription,
      startDate: data.startDate || null,
      completionDate: data.completionDate,
      sortOrder: data.sortOrder,
    }),

  updateSafetyDoc: (logId: string, docId: string, data: SafetyDocForm) =>
    axiosInstance.put<ThermalStationLogSafetyDoc>(`${BASE}/${logId}/safetydocs/${docId}`, {
      safetyDocTypeCode: data.safetyDocTypeCode || null,
      safetyDocTypeName: data.safetyDocTypeName || null,
      docNumber: data.docNumber,
      workOrderNumber: data.workOrderNumber,
      permitHolder: data.permitHolder,
      workDescription: data.workDescription,
      startDate: data.startDate || null,
      completionDate: data.completionDate,
      sortOrder: data.sortOrder,
    }),

  deleteSafetyDoc: (logId: string, docId: string) =>
    axiosInstance.delete(`${BASE}/${logId}/safetydocs/${docId}`),

  // Conditions
  addCondition: (logId: string, data: ConditionForm) =>
    axiosInstance.post<ThermalStationLogCondition>(`${BASE}/${logId}/conditions`, {
      snapshotTime: data.snapshotTime,
      source: data.source || null,
      systemVoltageKv: toNum(data.systemVoltageKv),
      remarks: data.remarks || null,
      rows: data.rows.map((r, i) => ({
        plantCode: r.plantCode || null,
        plantName: r.plantName,
        numberOfUnits: toNum(r.numberOfUnits),
        totalLoadMw: toNum(r.totalLoadMw),
        sortOrder: i,
      })),
    }),

  updateCondition: (logId: string, conditionId: string, data: ConditionForm) =>
    axiosInstance.put<ThermalStationLogCondition>(`${BASE}/${logId}/conditions/${conditionId}`, {
      snapshotTime: data.snapshotTime,
      source: data.source || null,
      systemVoltageKv: toNum(data.systemVoltageKv),
      remarks: data.remarks || null,
      rows: data.rows.map((r, i) => ({
        plantCode: r.plantCode || null,
        plantName: r.plantName,
        numberOfUnits: toNum(r.numberOfUnits),
        totalLoadMw: toNum(r.totalLoadMw),
        sortOrder: i,
      })),
    }),

  deleteCondition: (logId: string, conditionId: string) =>
    axiosInstance.delete(`${BASE}/${logId}/conditions/${conditionId}`),

  // Gas Readings
  addGasReading: (logId: string, data: GasReadingForm) =>
    axiosInstance.post<ThermalStationLogGasReading>(`${BASE}/${logId}/gasreadings`, {
      readingTime: data.readingTime,
      source: data.source || null,
      rows: data.rows.map((r, i) => ({
        terminal: r.terminal,
        inletPressureBar: toNum(r.inletPressureBar),
        outletPressureBar: toNum(r.outletPressureBar),
        flowRateMmscf: toNum(r.flowRateMmscf),
        sortOrder: i,
      })),
    }),

  updateGasReading: (logId: string, readingId: string, data: GasReadingForm) =>
    axiosInstance.put<ThermalStationLogGasReading>(`${BASE}/${logId}/gasreadings/${readingId}`, {
      readingTime: data.readingTime,
      source: data.source || null,
      rows: data.rows.map((r, i) => ({
        terminal: r.terminal,
        inletPressureBar: toNum(r.inletPressureBar),
        outletPressureBar: toNum(r.outletPressureBar),
        flowRateMmscf: toNum(r.flowRateMmscf),
        sortOrder: i,
      })),
    }),

  deleteGasReading: (logId: string, readingId: string) =>
    axiosInstance.delete(`${BASE}/${logId}/gasreadings/${readingId}`),

  // HSE Entries
  addHseEntry: (logId: string, data: HseEntryForm) =>
    axiosInstance.post<ThermalStationLogHseEntry>(`${BASE}/${logId}/hseentries`, {
      entryDate: data.entryDate || null,
      entryTime: data.entryTime || null,
      description: data.description,
      workOrderRaised: data.workOrderRaised || null,
    }),

  updateHseEntry: (logId: string, entryId: string, data: HseEntryForm) =>
    axiosInstance.put<ThermalStationLogHseEntry>(`${BASE}/${logId}/hseentries/${entryId}`, {
      entryDate: data.entryDate || null,
      entryTime: data.entryTime || null,
      description: data.description,
      workOrderRaised: data.workOrderRaised || null,
    }),

  deleteHseEntry: (logId: string, entryId: string) =>
    axiosInstance.delete(`${BASE}/${logId}/hseentries/${entryId}`),

  // Fuel Oil Tanks (save all at once)
  saveFuelOilTanks: (logId: string, rows: FuelOilTankForm[]) =>
    axiosInstance.post(`${BASE}/${logId}/fueloiltanks`, {
      readingTime: rows[0]?.readingTime || null,
      rows: rows.map((r, i) => ({
        tankName: r.tankName,
        dcsReadingM: toNum(r.dcsReadingM),
        actualDipM: toNum(r.actualDipM),
        daysOfStock: toNum(r.daysOfStock),
        sortOrder: i,
      })),
    }),

  // Gas Conditioning (save all at once)
  saveGasConditioning: (logId: string, rows: GasConditioningRowForm[]) =>
    axiosInstance.post(`${BASE}/${logId}/gasconditioning`, {
      readingTime: rows[0]?.readingTime || null,
      rows: rows.map((r, i) => ({
        componentName: r.componentName,
        status: r.status || null,
        inletTempC: toNum(r.inletTempC),
        onBaseTempC: toNum(r.onBaseTempC),
        inletPressureBar: toNum(r.inletPressureBar),
        onBasePressureBar: toNum(r.onBasePressureBar),
        sortOrder: i,
      })),
    }),

  // Generation Rows (save all at once)
  saveGenerationRows: (logId: string, rows: GenerationRowForm[]) =>
    axiosInstance.post<ThermalStationLogGenerationRow[]>(`${BASE}/${logId}/generationrows`, {
      rows: rows.map((r, i) => ({
        description: r.description,
        value: toNum(r.value),
        unit: r.unit || null,
        sortOrder: i,
      })),
    }),

  // Water Treatment (save all at once)
  saveWaterTreatment: (logId: string, rows: WaterTreatmentRowForm[]) =>
    axiosInstance.post(`${BASE}/${logId}/watertreatment`, {
      readingTime: rows[0]?.readingTime || null,
      rows: rows.map((r, i) => ({
        tankOrSystem: r.tankOrSystem,
        level: toNum(r.level),
        unit: r.unit || null,
        status: r.status || null,
        sortOrder: i,
      })),
    }),

  // Per-Unit Output
  getUnitOutputs: (logId: string) =>
    axiosInstance.get<StationLogUnitOutput[]>(`${BASE}/${logId}/unitoutputs`),

  saveUnitOutputs: (logId: string, units: SaveStationLogUnitOutputItem[]) =>
    axiosInstance.post<StationLogUnitOutput[]>(`${BASE}/${logId}/unitoutputs`, {
      units,
    }),
};
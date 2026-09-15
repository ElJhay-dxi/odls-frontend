import {
  Box, Card, CardContent, CardHeader, TextField, Button, CircularProgress,
  Alert, Typography, MenuItem, FormControl, InputLabel, Select,
  Grid, Divider, Chip, Stack, Paper, IconButton, Tooltip, Collapse,
  OutlinedInput, Checkbox, ListItemText, Table, TableBody, TableCell,
  TableHead, TableRow, Autocomplete,
} from '@mui/material';
import {
  Save, Edit, Delete, Add, ExpandMore, ExpandLess,
  Assignment, CheckCircle, LocalFireDepartment, TableChart, GasMeter,
} from '@mui/icons-material';
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import PersonAutocomplete from '../../components/lab/PersonAutocomplete';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { plantUnitApi } from '../../api/masterData/plantUnitApi';
import { plantUnitEquipmentApi } from '../../api/masterData/plantUnitEquipmentApi';
import { bopEquipmentApi } from '../../api/masterData/bopEquipmentApi';
import { plantBusApi } from '../../api/hourly/hourlyBusVoltageApi';
import { thermalStationLogApi } from '../../api/stationLog/thermalStationLogApi';
import { thermalStationLogAdditionsApi } from '../../api/stationLog/thermalStationLogAdditionsApi';
import { safetyDocumentTypeApi } from '../../api/masterData/safetyDocumentTypeApi';
import { shiftLogApi } from '../../api/stationLog/shiftLogApi';
import { appUsersApi } from '../../api/auth/userManagementApi';
import type { PowerPlant, PlantUnit, PlantUnitEquipment, BopEquipmentSearchResult } from '../../types/masterData';
import type {
  ThermalStationLog, ThermalStationLogEntry, ThermalStationLogSafetyDoc,
  ThermalStationLogCondition, ThermalStationLogGasReading,
  ThermalStationLogHseEntry,
  SafetyDocForm, ConditionForm,
  GasReadingForm, HseEntryForm, FuelOilTankForm, GenerationRowForm,
  GasConditioningRowForm, WaterTreatmentRowForm,
  ThermalCriticalIssue, ThermalOversightEntry, ThermalShiftInfo, ThermalEquipmentStatus,
  SaveStationLogUnitOutputItem,
} from '../../types/thermalStationLog';
import type { ShiftLog } from '../../types/shiftLog';
import type { PlantBus } from '../../types/plantBus';
import type { SafetyDocumentType } from '../../types/safetyDocumentType';
import { useSectionPermissions, usePlantFilter } from '../../hooks/usePermission';
import { useUser } from '../../context/UserContext';

const emptyHseEntry: HseEntryForm = {
  entryDate: new Date().toISOString().split('T')[0],
  entryTime: new Date().toTimeString().slice(0, 5),
  description: '', workOrderRaised: '',
};

const emptyFuelOilTankRow: FuelOilTankForm = {
  readingTime: new Date().toTimeString().slice(0, 5),
  tankName: '', dcsReadingM: '', actualDipM: '', daysOfStock: '', sortOrder: 0,
};

const emptyGasConditioningRow: GasConditioningRowForm = {
  readingTime: new Date().toTimeString().slice(0, 5),
  componentName: '', status: '', inletTempC: '', onBaseTempC: '',
  inletPressureBar: '', onBasePressureBar: '', sortOrder: 0,
};

const emptyGenerationRow: GenerationRowForm = {
  description: '', value: '', unit: 'kWh', sortOrder: 0,
};

const emptyWaterTreatmentRow: WaterTreatmentRowForm = {
  readingTime: new Date().toTimeString().slice(0, 5),
  tankOrSystem: '', level: '', unit: 'm', status: '', sortOrder: 0,
};

const emptySafetyDoc: SafetyDocForm = {
  safetyDocTypeCode: '', safetyDocTypeName: '',
  docNumber: '', workOrderNumber: '', permitHolder: '', workDescription: '',
  startDate: '', completionDate: '', sortOrder: 0,
};

const emptyCondition: ConditionForm = {
  snapshotTime: new Date().toTimeString().slice(0, 5),
  source: '', systemVoltageKv: '', remarks: '', rows: [],
};

const emptyGasReading: GasReadingForm = {
  readingTime: new Date().toTimeString().slice(0, 5),
  source: '', rows: [],
};

interface CriticalIssueFormState {
  equipmentCode: string;
  equipmentName: string;
  dateObserved: string;
  descriptionOfFault: string;
  riskInvolved: string;
  impact: string;
  status: string;
  resolvedOn: string;
  resolvedBy: string;
}
const emptyCriticalIssueForm: CriticalIssueFormState = {
  equipmentCode: '', equipmentName: '', dateObserved: new Date().toISOString().split('T')[0],
  descriptionOfFault: '', riskInvolved: '', impact: '', status: 'Open', resolvedOn: '', resolvedBy: '',
};

interface FieldOperatorRow { name: string; assignment: string }
interface ShiftFormState {
  teamLeader: string;
  controlRoomOperators: string[];
  fieldOperators: FieldOperatorRow[];
  shiftStrength: string;
  onLeave: string[];
  comments: string;
}
const emptyShiftForm: ShiftFormState = {
  teamLeader: '', controlRoomOperators: [], fieldOperators: [], shiftStrength: '', onLeave: [], comments: '',
};

const RISK_STYLES: Record<string, { color: string; backgroundColor: string }> = {
  Low: { color: '#1B5E20', backgroundColor: '#E8F5E9' },
  Medium: { color: '#F57F17', backgroundColor: '#FFF9C4' },
  High: { color: '#E65100', backgroundColor: '#FBE9E7' },
  Severe: { color: '#B71C1C', backgroundColor: '#FFEBEE' },
};
interface EquipmentStatusRow {
  equipmentCode: string;
  equipmentName: string;
  location?: string;
  status: string;
  remarks: string;
}
const PUMP_STATUS_OPTIONS = ['In Service', 'On Standby', 'Not Available', 'Under Permit'];
const TRANSFORMER_STATUS_OPTIONS = ['In Service', 'On Potential', 'Off Potential', 'Not Available', 'Under Permit', 'On Standby'];
const FIELD_ASSIGNMENT_OPTIONS = ['GT1/HRSG1', 'GT2/HRSG2', 'STG/OTCS', 'BOPs'];

const containsKeyword = (fields: (string | undefined | null)[], keyword: string) =>
  fields.some((f) => f?.toLowerCase().includes(keyword.toLowerCase()));

const isPump = (e: {
  unitName?: string; systemName?: string; subSystemName?: string;
  subsystemName?: string; bopName?: string; equipmentName?: string;
}) => containsKeyword(
  [e.unitName, e.systemName, e.subSystemName, e.subsystemName, e.bopName, e.equipmentName],
  'pump'
);

const isTransformer = (e: {
  unitName?: string; systemName?: string; subSystemName?: string;
  subsystemName?: string; bopName?: string; equipmentName?: string;
}) => containsKeyword(
  [e.unitName, e.systemName, e.subSystemName, e.subsystemName, e.bopName, e.equipmentName],
  'transformer'
);

type TimelineItemType = 'entry' | 'condition' | 'gasreading' | 'handover';
interface TimelineItem {
  id: string; time: string; type: TimelineItemType;
  entry?: ThermalStationLogEntry;
  condition?: ThermalStationLogCondition;
  gasReading?: ThermalStationLogGasReading;
  handoverText?: string;
  handoverType?: 'incoming' | 'outgoing';
}

const toArray = (val?: string) => val ? val.split(',').map((s) => s.trim()).filter(Boolean) : [];
const toStr = (arr: string[]) => arr.join(', ');

const safeParseArray = <T,>(json?: string): T[] => {
  if (!json) return [];
  try { const parsed = JSON.parse(json); return Array.isArray(parsed) ? parsed : []; }
  catch { return []; }
};

const parseShiftInfo = (s: ThermalShiftInfo | null): ShiftFormState => s ? {
  teamLeader: s.teamLeader ?? '',
  controlRoomOperators: safeParseArray<string>(s.controlRoomOperators),
  fieldOperators: safeParseArray<FieldOperatorRow>(s.fieldOperators),
  shiftStrength: s.shiftStrength?.toString() ?? '',
  onLeave: safeParseArray<string>(s.onLeave),
  comments: s.comments ?? '',
} : emptyShiftForm;

const sortOversightEntries = (a: ThermalOversightEntry, b: ThermalOversightEntry) =>
  a.entryDate.localeCompare(b.entryDate) || a.entryTime.localeCompare(b.entryTime);

const TEXT_FIELDS = [
  { key: 'stationService',           label: 'Station Service' },
  { key: 'fireProtectionStatus',     label: 'Fire Protection System' },
  { key: 'emergencyDieselGenStatus', label: 'Emergency Diesel Generator' },
  { key: 'applicationForOutage',     label: 'Application for Outage' },
  { key: 'miscNotes',                label: 'Miscellaneous / Standing Notes' },
] as const;
type TextFieldKey = typeof TEXT_FIELDS[number]['key'];

export default function ThermalStationLogPage() {
  const { canCreate, canEdit, canDelete } = useSectionPermissions('station_logs.thermal');
  const { isPlantUser, userPlantClassifications, profile } = useUser();
  const navigate = useNavigate();
  const isWrongPlantType = isPlantUser && userPlantClassifications.length > 0
    && !userPlantClassifications.includes('thermal');

  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const { availablePlants, plantLocked, autoPlantCode } = usePlantFilter(plants);
  const [allPlants, setAllPlants] = useState<PowerPlant[]>([]);
  const [safetyDocTypes, setSafetyDocTypes] = useState<SafetyDocumentType[]>([]);
  const [plantUnits, setPlantUnits] = useState<PlantUnit[]>([]);
  const [plantBuses, setPlantBuses] = useState<PlantBus[]>([]);

  const [selectedPlant, setSelectedPlant] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [log, setLog] = useState<ThermalStationLog | null>(null);
  const [shiftHandovers, setShiftHandovers] = useState<ShiftLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creatingLog, setCreatingLog] = useState(false);

  // Header
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [selectedBuses, setSelectedBuses] = useState<string[]>([]);
  const [currentOutputMw, setCurrentOutputMw] = useState('');
  const [headerTextForm, setHeaderTextForm] = useState<Record<TextFieldKey, string>>({
    stationService: '', fireProtectionStatus: '',
    emergencyDieselGenStatus: '', applicationForOutage: '', miscNotes: '',
  });
  const [headerEditing, setHeaderEditing] = useState(false);
  const [savingHeader, setSavingHeader] = useState(false);
  const [headerError, setHeaderError] = useState<string | null>(null);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);

  // Per-unit output
  const [unitOutputs, setUnitOutputs] = useState<SaveStationLogUnitOutputItem[]>([]);
  const [savingUnitOutputs, setSavingUnitOutputs] = useState(false);
  const [unitOutputsSaved, setUnitOutputsSaved] = useState(false);
  const [unitOutputsError, setUnitOutputsError] = useState<string | null>(null);

  // Entry
  const [entryForm, setEntryForm] = useState({ entryTime: new Date().toTimeString().slice(0, 5), entryText: '' });
  const [addingEntry, setAddingEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ThermalStationLogEntry | null>(null);
  const [editEntryForm, setEditEntryForm] = useState({ entryTime: '', entryText: '' });
  const [savingEntry, setSavingEntry] = useState(false);
  const [deleteEntry, setDeleteEntry] = useState<ThermalStationLogEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);

  // Safety docs
  const [safetyDocForm, setSafetyDocForm] = useState<SafetyDocForm>(emptySafetyDoc);
  const [editingSafetyDoc, setEditingSafetyDoc] = useState<ThermalStationLogSafetyDoc | null>(null);
  const [showSafetyDocForm, setShowSafetyDocForm] = useState(false);
  const [savingSafetyDoc, setSavingSafetyDoc] = useState(false);
  const [deleteSafetyDoc, setDeleteSafetyDoc] = useState<ThermalStationLogSafetyDoc | null>(null);
  const [deletingSafetyDoc, setDeletingSafetyDoc] = useState(false);
  const [safetyDocError, setSafetyDocError] = useState<string | null>(null);
  const [safetyDocsCollapsed, setSafetyDocsCollapsed] = useState(false);

  // Conditions
  const [conditionForm, setConditionForm] = useState<ConditionForm>(emptyCondition);
  const [editingCondition, setEditingCondition] = useState<ThermalStationLogCondition | null>(null);
  const [showConditionForm, setShowConditionForm] = useState(false);
  const [savingCondition, setSavingCondition] = useState(false);
  const [deleteCondition, setDeleteCondition] = useState<ThermalStationLogCondition | null>(null);
  const [deletingCondition, setDeletingCondition] = useState(false);
  const [expandedConditions, setExpandedConditions] = useState<Set<string>>(new Set());
  const [conditionError, setConditionError] = useState<string | null>(null);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState('');

  // Gas readings
  const [gasReadingForm, setGasReadingForm] = useState<GasReadingForm>(emptyGasReading);
  const [editingGasReading, setEditingGasReading] = useState<ThermalStationLogGasReading | null>(null);
  const [showGasReadingForm, setShowGasReadingForm] = useState(false);
  const [savingGasReading, setSavingGasReading] = useState(false);
  const [deleteGasReading, setDeleteGasReading] = useState<ThermalStationLogGasReading | null>(null);
  const [deletingGasReading, setDeletingGasReading] = useState(false);
  const [expandedGasReadings, setExpandedGasReadings] = useState<Set<string>>(new Set());
  const [gasReadingError, setGasReadingError] = useState<string | null>(null);

  // HSE Entries
  const [hseEntryForm, setHseEntryForm] = useState<HseEntryForm>(emptyHseEntry);
  const [addingHseEntry, setAddingHseEntry] = useState(false);
  const [editingHseEntry, setEditingHseEntry] = useState<ThermalStationLogHseEntry | null>(null);
  const [editHseEntryForm, setEditHseEntryForm] = useState<HseEntryForm>(emptyHseEntry);
  const [savingHseEntry, setSavingHseEntry] = useState(false);
  const [deleteHseEntry, setDeleteHseEntry] = useState<ThermalStationLogHseEntry | null>(null);
  const [deletingHseEntry, setDeletingHseEntry] = useState(false);
  const [hseEntryError, setHseEntryError] = useState<string | null>(null);
  const [hseCollapsed, setHseCollapsed] = useState(false);

  // Fuel Oil Tanks
  const [fuelOilTankRows, setFuelOilTankRows] = useState<FuelOilTankForm[]>([]);
  const [fuelOilReadingTime, setFuelOilReadingTime] = useState(new Date().toTimeString().slice(0, 5));
  const [savingFuelOilTanks, setSavingFuelOilTanks] = useState(false);
  const [fuelOilSaveSuccess, setFuelOilSaveSuccess] = useState(false);
  const [fuelOilSaveError, setFuelOilSaveError] = useState<string | null>(null);
  const [fuelOilCollapsed, setFuelOilCollapsed] = useState(false);

  // Gas Conditioning
  const [gasConditioningRows, setGasConditioningRows] = useState<GasConditioningRowForm[]>([]);
  const [gasCondReadingTime, setGasCondReadingTime] = useState(new Date().toTimeString().slice(0, 5));
  const [savingGasConditioning, setSavingGasConditioning] = useState(false);
  const [gasCondSaveSuccess, setGasCondSaveSuccess] = useState(false);
  const [gasCondSaveError, setGasCondSaveError] = useState<string | null>(null);
  const [gasConditioningCollapsed, setGasConditioningCollapsed] = useState(false);

  // Water Treatment
  const [waterTreatmentRows, setWaterTreatmentRows] = useState<WaterTreatmentRowForm[]>([]);
  const [waterReadingTime, setWaterReadingTime] = useState(new Date().toTimeString().slice(0, 5));
  const [savingWaterTreatment, setSavingWaterTreatment] = useState(false);
  const [waterSaveSuccess, setWaterSaveSuccess] = useState(false);
  const [waterSaveError, setWaterSaveError] = useState<string | null>(null);
  const [waterTreatmentCollapsed, setWaterTreatmentCollapsed] = useState(false);

  // Ambient Conditions
  const [ambientTempC, setAmbientTempC] = useState('');
  const [ambientPressureMbar, setAmbientPressureMbar] = useState('');
  const [relativeHumidityPct, setRelativeHumidityPct] = useState('');
  const [ambientCollapsed, setAmbientCollapsed] = useState(false);

  // End of Day Summary
  const [summaryEditing, setSummaryEditing] = useState(false);
  const [summaryCollapsed, setSummaryCollapsed] = useState(false);
  const [savingSummary, setSavingSummary] = useState(false);
  const [summarySaveSuccess, setSummarySaveSuccess] = useState(false);
  const [summarySaveError, setSummarySaveError] = useState<string | null>(null);
  // Fixed summary fields
  const [totalGenerationMwh, setTotalGenerationMwh] = useState('');
  const [totalStationServiceMwh, setTotalStationServiceMwh] = useState('');
  const [netGenerationMwh, setNetGenerationMwh] = useState('');
  const [totalGasConsumed, setTotalGasConsumed] = useState('');
  const [totalGasConsumedUnit, setTotalGasConsumedUnit] = useState('MMScf');
  const [totalLiquidFuelConsumedMt, setTotalLiquidFuelConsumedMt] = useState('');
  const [reactiveEnergyGeneratedVarh, setReactiveEnergyGeneratedVarh] = useState('');
  const [generationNotes, setGenerationNotes] = useState('');
  // Per-unit breakdown rows
  const [generationRows, setGenerationRows] = useState<GenerationRowForm[]>([]);
  const [savingGenerationRows, setSavingGenerationRows] = useState(false);
  const [generationRowsSaveSuccess, setGenerationRowsSaveSuccess] = useState(false);
  const [generationRowsSaveError, setGenerationRowsSaveError] = useState<string | null>(null);

  // Plant equipment (for critical issues autocomplete + pump/transformer status lists)
  const [pumpEquipments, setPumpEquipments] = useState<PlantUnitEquipment[]>([]);
  const [transformerEquipments, setTransformerEquipments] = useState<PlantUnitEquipment[]>([]);
  const [bopPumpEquipments, setBopPumpEquipments] = useState<BopEquipmentSearchResult[]>([]);
  const [bopTransformerEquipments, setBopTransformerEquipments] = useState<BopEquipmentSearchResult[]>([]);
  const [plantUserNames, setPlantUserNames] = useState<string[]>([]);

  // Critical Issues
  const [criticalIssues, setCriticalIssues] = useState<ThermalCriticalIssue[]>([]);
  const [criticalIssuesCollapsed, setCriticalIssuesCollapsed] = useState(false);
  const [showCriticalIssueForm, setShowCriticalIssueForm] = useState(false);
  const [editingCriticalIssue, setEditingCriticalIssue] = useState<ThermalCriticalIssue | null>(null);
  const [criticalIssueForm, setCriticalIssueForm] = useState<CriticalIssueFormState>(emptyCriticalIssueForm);
  const [savingCriticalIssue, setSavingCriticalIssue] = useState(false);
  const [criticalIssueError, setCriticalIssueError] = useState<string | null>(null);
  const [deleteCriticalIssue, setDeleteCriticalIssue] = useState<ThermalCriticalIssue | null>(null);
  const [deletingCriticalIssue, setDeletingCriticalIssue] = useState(false);

  // Shift Information
  const [shiftInfoDay, setShiftInfoDay] = useState<ThermalShiftInfo | null>(null);
  const [shiftInfoNight, setShiftInfoNight] = useState<ThermalShiftInfo | null>(null);
  const [shiftCollapsed, setShiftCollapsed] = useState(false);
  const [dayShiftForm, setDayShiftForm] = useState<ShiftFormState>(emptyShiftForm);
  const [nightShiftForm, setNightShiftForm] = useState<ShiftFormState>(emptyShiftForm);
  const [savingDayShift, setSavingDayShift] = useState(false);
  const [savingNightShift, setSavingNightShift] = useState(false);
  const [dayShiftError, setDayShiftError] = useState<string | null>(null);
  const [nightShiftError, setNightShiftError] = useState<string | null>(null);

  // Pumps Status
  const [pumpStatuses, setPumpStatuses] = useState<ThermalEquipmentStatus[]>([]);
  const [pumpRows, setPumpRows] = useState<EquipmentStatusRow[]>([]);
  const [pumpsCollapsed, setPumpsCollapsed] = useState(true);
  const [savingPumps, setSavingPumps] = useState(false);
  const [pumpsSaved, setPumpsSaved] = useState(false);
  const [pumpsError, setPumpsError] = useState<string | null>(null);

  // Transformers Status
  const [transformerStatuses, setTransformerStatuses] = useState<ThermalEquipmentStatus[]>([]);
  const [transformerRows, setTransformerRows] = useState<EquipmentStatusRow[]>([]);
  const [transformersCollapsed, setTransformersCollapsed] = useState(true);
  const [savingTransformers, setSavingTransformers] = useState(false);
  const [transformersSaved, setTransformersSaved] = useState(false);
  const [transformersError, setTransformersError] = useState<string | null>(null);

  // Oversight Conditions (TICO/CENIT)
  const [oversightEntries, setOversightEntries] = useState<ThermalOversightEntry[]>([]);
  const [oversightCollapsed, setOversightCollapsed] = useState(false);
  const [showOversightForm, setShowOversightForm] = useState(false);
  const [editingOversightEntry, setEditingOversightEntry] = useState<ThermalOversightEntry | null>(null);
  const [oversightForm, setOversightForm] = useState({
    entryDate: new Date().toISOString().split('T')[0],
    entryTime: new Date().toTimeString().slice(0, 5),
    entryText: '',
  });
  const [savingOversightEntry, setSavingOversightEntry] = useState(false);
  const [oversightError, setOversightError] = useState<string | null>(null);
  const [deleteOversightEntry, setDeleteOversightEntry] = useState<ThermalOversightEntry | null>(null);
  const [deletingOversightEntry, setDeletingOversightEntry] = useState(false);

  useEffect(() => {
    powerPlantApi.getAll().then((res) => {
      setAllPlants(res.data);
      setPlants(res.data.filter((p) => p.classificationType?.toLowerCase() === 'thermal'));
    });
    safetyDocumentTypeApi.getAll({ activeOnly: true }).then((res) => setSafetyDocTypes(res.data));
  }, []);

  useEffect(() => { if (autoPlantCode) setSelectedPlant(autoPlantCode); }, [autoPlantCode]);

  useEffect(() => {
    if (!selectedPlant) { setPlantUnits([]); setPlantBuses([]); return; }
    plantUnitApi.getByPlant(selectedPlant).then((res) => setPlantUnits(res.data));
    plantBusApi.getAll(selectedPlant).then((res) => setPlantBuses(res.data));
  }, [selectedPlant]);

  // Load plant equipment (pumps/transformers) from both unit and BOP hierarchies
  useEffect(() => {
    if (!selectedPlant) {
      setPumpEquipments([]); setTransformerEquipments([]);
      setBopPumpEquipments([]); setBopTransformerEquipments([]);
      setPlantUserNames([]); return;
    }

    // Unit equipment
    plantUnitEquipmentApi.getAll().then((res) => {
      const forPlant = res.data.filter((e) => e.plantCode === selectedPlant);
      setPumpEquipments(forPlant.filter(isPump));
      setTransformerEquipments(forPlant.filter(isTransformer));
    }).catch(() => { setPumpEquipments([]); setTransformerEquipments([]); });

    // BOP / Auxiliary equipment — backend search endpoint handles the pump/transformer filtering
    bopEquipmentApi.search(selectedPlant, 'pump').then((res) => {
      setBopPumpEquipments(res.data);
    }).catch(() => setBopPumpEquipments([]));

    bopEquipmentApi.search(selectedPlant, 'transformer').then((res) => {
      setBopTransformerEquipments(res.data);
    }).catch(() => setBopTransformerEquipments([]));

    appUsersApi.getAll({ activeOnly: true, plantCode: selectedPlant })
      .then((res) => setPlantUserNames(res.data.map((u) => u.fullName)))
      .catch(() => setPlantUserNames([]));
  }, [selectedPlant]);

  useEffect(() => {
    if (!selectedPlant || !selectedDate) return;
    loadLog();
  }, [selectedPlant, selectedDate]);

  useEffect(() => { setDayShiftForm(parseShiftInfo(shiftInfoDay)); }, [shiftInfoDay]);
  useEffect(() => { setNightShiftForm(parseShiftInfo(shiftInfoNight)); }, [shiftInfoNight]);

  // Keep unit output rows in sync with the units-in-service selection —
  // add rows for newly selected units, drop rows for deselected ones, keep existing values otherwise
  useEffect(() => {
    setUnitOutputs((prev) => selectedUnits.map((code) => {
      const existing = prev.find((u) => u.unitCode === code);
      if (existing) return existing;
      const unit = plantUnits.find((u) => u.unitCode === code);
      return { unitCode: code, unitName: unit?.unitName ?? code, unitStatus: 'In Service', outputMW: null, outputMVAr: null };
    }));
  }, [selectedUnits, plantUnits]);

  useEffect(() => {
    const combined = [
      ...pumpEquipments.map((eq) => ({
        equipmentCode: eq.equipmentCode, equipmentName: eq.equipmentName,
        location: eq.systemName ?? '',
        groupLabel: [eq.unitName, eq.systemName, eq.subSystemName].filter(Boolean).join(' / '),
      })),
      ...bopPumpEquipments.map((eq) => ({
        equipmentCode: eq.equipmentCode, equipmentName: eq.equipmentName,
        location: eq.location,
        groupLabel: eq.groupLabel,
      })),
    ].filter((eq, idx, arr) => arr.findIndex((e) => e.equipmentCode === eq.equipmentCode) === idx);

    setPumpRows(combined.map((eq) => {
      const saved = pumpStatuses.find((s) => s.equipmentCode === eq.equipmentCode);
      return {
        equipmentCode: eq.equipmentCode, equipmentName: eq.equipmentName,
        location: eq.location, status: saved?.status ?? '', remarks: saved?.remarks ?? '',
      };
    }));
  }, [pumpEquipments, bopPumpEquipments, pumpStatuses]);

  useEffect(() => {
    const combined = [
      ...transformerEquipments.map((eq) => ({
        equipmentCode: eq.equipmentCode, equipmentName: eq.equipmentName,
        location: eq.systemName ?? '',
        groupLabel: [eq.unitName, eq.systemName, eq.subSystemName].filter(Boolean).join(' / '),
      })),
      ...bopTransformerEquipments.map((eq) => ({
        equipmentCode: eq.equipmentCode, equipmentName: eq.equipmentName,
        location: eq.location,
        groupLabel: eq.groupLabel,
      })),
    ].filter((eq, idx, arr) => arr.findIndex((e) => e.equipmentCode === eq.equipmentCode) === idx);

    setTransformerRows(combined.map((eq) => {
      const saved = transformerStatuses.find((s) => s.equipmentCode === eq.equipmentCode);
      return {
        equipmentCode: eq.equipmentCode, equipmentName: eq.equipmentName,
        location: eq.location, status: saved?.status ?? '', remarks: saved?.remarks ?? '',
      };
    }));
  }, [transformerEquipments, bopTransformerEquipments, transformerStatuses]);

  const currentPlant = allPlants.find((p) => p.plantCode === selectedPlant) ?? null;

  const allPumpEquipments = [
    ...pumpEquipments.map((eq) => ({
      equipmentCode: eq.equipmentCode,
      equipmentName: eq.equipmentName,
      location: eq.systemName ?? '',
      groupLabel: [eq.unitName, eq.systemName, eq.subSystemName].filter(Boolean).join(' / '),
      source: 'unit' as const,
    })),
    ...bopPumpEquipments.map((eq) => ({
      equipmentCode: eq.equipmentCode,
      equipmentName: eq.equipmentName,
      location: eq.location,
      groupLabel: eq.groupLabel,
      source: 'bop' as const,
    })),
  ].filter((eq, idx, arr) =>
    arr.findIndex((e) => e.equipmentCode === eq.equipmentCode) === idx
  );

  const allTransformerEquipments = [
    ...transformerEquipments.map((eq) => ({
      equipmentCode: eq.equipmentCode,
      equipmentName: eq.equipmentName,
      location: eq.systemName ?? '',
      groupLabel: [eq.unitName, eq.systemName, eq.subSystemName].filter(Boolean).join(' / '),
      source: 'unit' as const,
    })),
    ...bopTransformerEquipments.map((eq) => ({
      equipmentCode: eq.equipmentCode,
      equipmentName: eq.equipmentName,
      location: eq.location,
      groupLabel: eq.groupLabel,
      source: 'bop' as const,
    })),
  ].filter((eq, idx, arr) =>
    arr.findIndex((e) => e.equipmentCode === eq.equipmentCode) === idx
  );

  const populateHeader = (data: ThermalStationLog) => {
    setSelectedUnits(toArray(data.unitsInService));
    setSelectedBuses(toArray(data.linesInService));
    setCurrentOutputMw(data.currentOutputMw?.toString() ?? '');
    setHeaderTextForm({
      stationService: data.stationService ?? '',
      fireProtectionStatus: data.fireProtectionStatus ?? '',
      emergencyDieselGenStatus: data.emergencyDieselGenStatus ?? '',
      applicationForOutage: data.applicationForOutage ?? '',
      miscNotes: data.miscNotes ?? '',
    });
    setAmbientTempC(data.ambientTempC?.toString() ?? '');
    setAmbientPressureMbar(data.ambientPressureMbar?.toString() ?? '');
    setRelativeHumidityPct(data.relativeHumidityPct?.toString() ?? '');
    setFuelOilTankRows(data.fuelOilTanks.map((t) => ({
      readingTime: data.fuelOilReadingTime ?? new Date().toTimeString().slice(0, 5),
      tankName: t.tankName, dcsReadingM: t.dcsReadingM?.toString() ?? '',
      actualDipM: t.actualDipM?.toString() ?? '', daysOfStock: t.daysOfStock?.toString() ?? '',
      sortOrder: t.sortOrder,
    })));
    setGasConditioningRows(data.gasConditioningRows.map((r) => ({
      readingTime: data.gasCondReadingTime ?? new Date().toTimeString().slice(0, 5),
      componentName: r.componentName, status: r.status ?? '',
      inletTempC: r.inletTempC?.toString() ?? '', onBaseTempC: r.onBaseTempC?.toString() ?? '',
      inletPressureBar: r.inletPressureBar?.toString() ?? '',
      onBasePressureBar: r.onBasePressureBar?.toString() ?? '', sortOrder: r.sortOrder,
    })));
    setTotalGenerationMwh(data.totalGenerationMwh?.toString() ?? '');
    setTotalStationServiceMwh(data.totalStationServiceMwh?.toString() ?? '');
    setNetGenerationMwh(data.netGenerationMwh?.toString() ?? '');
    setTotalGasConsumed(data.totalGasConsumed?.toString() ?? '');
    setTotalGasConsumedUnit(data.totalGasConsumedUnit ?? 'MMScf');
    setTotalLiquidFuelConsumedMt(data.totalLiquidFuelConsumedMt?.toString() ?? '');
    setReactiveEnergyGeneratedVarh(data.reactiveEnergyGeneratedVarh?.toString() ?? '');
    setGenerationNotes(data.generationNotes ?? '');
    setGenerationRows(data.generationRows.map((r) => ({
      description: r.description, value: r.value?.toString() ?? '',
      unit: r.unit ?? 'kWh', sortOrder: r.sortOrder,
    })));
    setFuelOilReadingTime(data.fuelOilReadingTime ?? new Date().toTimeString().slice(0, 5));
    setGasCondReadingTime(data.gasCondReadingTime ?? new Date().toTimeString().slice(0, 5));
    setWaterReadingTime(data.waterReadingTime ?? new Date().toTimeString().slice(0, 5));
    setWaterTreatmentRows(data.waterTreatmentRows.map((r) => ({
      readingTime: data.waterReadingTime ?? new Date().toTimeString().slice(0, 5),
      tankOrSystem: r.tankOrSystem, level: r.level?.toString() ?? '',
      unit: r.unit ?? 'm', status: r.status ?? '', sortOrder: r.sortOrder,
    })));
  };

  const loadAdditionalSections = async (logId: string) => {
    const plantForLog = allPlants.find((p) => p.plantCode === selectedPlant);
    const [issues, shiftData, pumps, transformers, oversight, unitOutputsRes] = await Promise.allSettled([
      thermalStationLogAdditionsApi.getCriticalIssues(logId),
      thermalStationLogAdditionsApi.getShiftInfo(logId),
      thermalStationLogAdditionsApi.getEquipmentStatus(logId, 'Pump'),
      thermalStationLogAdditionsApi.getEquipmentStatus(logId, 'Transformer'),
      plantForLog?.oversightPlantCode
        ? thermalStationLogAdditionsApi.getOversightEntries(logId, plantForLog.oversightPlantCode)
        : Promise.resolve({ data: [] as ThermalOversightEntry[] }),
      thermalStationLogApi.getUnitOutputs(logId),
    ]);
    if (issues.status === 'fulfilled') setCriticalIssues(issues.value.data);
    if (shiftData.status === 'fulfilled') {
      const shifts = shiftData.value.data;
      setShiftInfoDay(shifts.find((s) => s.shiftType === 'DAY') ?? null);
      setShiftInfoNight(shifts.find((s) => s.shiftType === 'NIGHT') ?? null);
    }
    if (pumps.status === 'fulfilled') setPumpStatuses(pumps.value.data);
    if (transformers.status === 'fulfilled') setTransformerStatuses(transformers.value.data);
    if (oversight.status === 'fulfilled') setOversightEntries(oversight.value.data.sort(sortOversightEntries));
    if (unitOutputsRes.status === 'fulfilled') {
      setUnitOutputs(unitOutputsRes.value.data.map((u) => ({
        unitCode: u.unitCode, unitName: u.unitName, unitStatus: u.unitStatus,
        outputMW: u.outputMW, outputMVAr: u.outputMVAr,
      })));
    }
  };

  const loadLog = async () => {
    setLoading(true); setLoadError(null); setLog(null); setShiftHandovers([]);
    setCriticalIssues([]); setOversightEntries([]);
    setShiftInfoDay(null); setShiftInfoNight(null);
    setPumpStatuses([]); setTransformerStatuses([]);
    setUnitOutputs([]); setUnitOutputsSaved(false);
    try {
      const prevDate = new Date(selectedDate + 'T12:00:00');
      prevDate.setDate(prevDate.getDate() - 1);
      const prevDateStr = prevDate.toISOString().split('T')[0];
      const [logRes, handoverRes, prevHandoverRes] = await Promise.allSettled([
        thermalStationLogApi.getByDate(selectedPlant, selectedDate),
        shiftLogApi.getAll({ plantCode: selectedPlant, date: selectedDate }),
        shiftLogApi.getAll({ plantCode: selectedPlant, date: prevDateStr }),
      ]);
      if (logRes.status === 'fulfilled') {
        setLog(logRes.value.data); populateHeader(logRes.value.data);
        await loadAdditionalSections(logRes.value.data.id);
      }
      else { const s = (logRes.reason as { response?: { status?: number } })?.response?.status; if (s !== 404) setLoadError('Failed to load station log.'); }
      const current = handoverRes.status === 'fulfilled' ? handoverRes.value.data : [];
      const prev = prevHandoverRes.status === 'fulfilled' ? prevHandoverRes.value.data.filter((h) => h.shiftCode === 'B') : [];
      setShiftHandovers([...current, ...prev]);
    } finally { setLoading(false); }
  };

  const handleCreateLog = async () => {
    setCreatingLog(true);
    try {
      await thermalStationLogApi.create({ plantCode: selectedPlant, logDate: selectedDate });
      await loadLog(); setHeaderEditing(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setLoadError(msg ?? 'Failed to create station log.');
    } finally { setCreatingLog(false); }
  };

  const handleSaveHeader = async () => {
    if (!log) return;
    setSavingHeader(true); setHeaderError(null);
    try {
      const res = await thermalStationLogApi.update(log.id, buildUpdatePayload({
        unitsInService: toStr(selectedUnits),
        linesInService: toStr(selectedBuses),
        currentOutputMw: currentOutputMw || null,
        ...headerTextForm,
      }));
      setLog(res.data); populateHeader(res.data); setHeaderEditing(false);
    } catch { setHeaderError('Failed to save header.'); }
    finally { setSavingHeader(false); }
  };

  // Toggle an optional section on — saves immediately
  const handleToggleSection = async (
    section: 'showAmbientConditions' | 'showHseEntries' | 'showFuelOilTanks' | 'showGasConditioning' | 'showWaterTreatment'
  ) => {
    if (!log) return;
    const updated = { ...log, [section]: true };
    try {
      const res = await thermalStationLogApi.update(log.id, buildUpdatePayload({
        showAmbientConditions: updated.showAmbientConditions,
        showHseEntries: updated.showHseEntries,
        showFuelOilTanks: updated.showFuelOilTanks,
        showGasConditioning: updated.showGasConditioning,
        showWaterTreatment: updated.showWaterTreatment,
      }));
      setLog(res.data);
    } catch { setLoadError('Failed to enable section.'); }
  };

  const handleAddEntry = async () => {
    if (!log || !entryForm.entryTime || !entryForm.entryText.trim()) return;
    setAddingEntry(true); setEntryError(null);
    try {
      const res = await thermalStationLogApi.addEntry(log.id, entryForm.entryTime, entryForm.entryText);
      setLog((p) => p ? { ...p, entries: [...p.entries, res.data].sort((a, b) => a.entryTime.localeCompare(b.entryTime)) } : p);
      setEntryForm({ entryTime: new Date().toTimeString().slice(0, 5), entryText: '' });
    } catch { setEntryError('Failed to add entry.'); }
    finally { setAddingEntry(false); }
  };

  const handleSaveEntry = async () => {
    if (!log || !editingEntry) return;
    setSavingEntry(true);
    try {
      const res = await thermalStationLogApi.updateEntry(log.id, editingEntry.id, editEntryForm.entryTime, editEntryForm.entryText);
      setLog((p) => p ? { ...p, entries: p.entries.map((e) => e.id === editingEntry.id ? res.data : e).sort((a, b) => a.entryTime.localeCompare(b.entryTime)) } : p);
      setEditingEntry(null);
    } catch { setEntryError('Failed to update entry.'); }
    finally { setSavingEntry(false); }
  };

  const handleDeleteEntry = async () => {
    if (!log || !deleteEntry) return;
    setDeletingEntry(true);
    try {
      await thermalStationLogApi.deleteEntry(log.id, deleteEntry.id);
      setLog((p) => p ? { ...p, entries: p.entries.filter((e) => e.id !== deleteEntry.id) } : p);
      setDeleteEntry(null);
    } catch { setEntryError('Failed to delete entry.'); }
    finally { setDeletingEntry(false); }
  };

  const handleSaveSafetyDoc = async () => {
    if (!log) return;
    setSavingSafetyDoc(true); setSafetyDocError(null);
    try {
      if (editingSafetyDoc) {
        const res = await thermalStationLogApi.updateSafetyDoc(log.id, editingSafetyDoc.id, safetyDocForm);
        setLog((p) => p ? { ...p, safetyDocs: p.safetyDocs.map((d) => d.id === editingSafetyDoc.id ? res.data : d) } : p);
        setEditingSafetyDoc(null);
      } else {
        const res = await thermalStationLogApi.addSafetyDoc(log.id, { ...safetyDocForm, sortOrder: log.safetyDocs.length });
        setLog((p) => p ? { ...p, safetyDocs: [...p.safetyDocs, res.data] } : p);
      }
      setSafetyDocForm(emptySafetyDoc); setShowSafetyDocForm(false);
    } catch { setSafetyDocError('Failed to save safety document.'); }
    finally { setSavingSafetyDoc(false); }
  };

  const handleDeleteSafetyDoc = async () => {
    if (!log || !deleteSafetyDoc) return;
    setDeletingSafetyDoc(true);
    try {
      await thermalStationLogApi.deleteSafetyDoc(log.id, deleteSafetyDoc.id);
      setLog((p) => p ? { ...p, safetyDocs: p.safetyDocs.filter((d) => d.id !== deleteSafetyDoc.id) } : p);
      setDeleteSafetyDoc(null);
    } catch { setSafetyDocError('Failed to delete safety document.'); }
    finally { setDeletingSafetyDoc(false); }
  };

  const parsePasteText = (text: string) => {
    const lines = text.trim().split('\n').filter((l) => l.trim());
    const parsed: { plantName: string; numberOfUnits: string; totalLoadMw: string }[] = [];
    for (const line of lines) {
      const parts = line.split(/\t|  +/).map((p) => p.trim()).filter(Boolean);
      if (parts.length < 2) continue;
      const plantName = parts[0];
      if (/^(station|plant|number|units|load)/i.test(plantName)) continue;
      const rawUnits = parts[1] ?? '';
      const numberOfUnits = /^\d+$/.test(rawUnits) ? rawUnits : '';
      const rawLoad = parts[2] ?? '';
      const totalLoadMw = /^\d+(\.\d+)?$/.test(rawLoad) ? rawLoad : '';
      if (plantName) parsed.push({ plantName, numberOfUnits, totalLoadMw });
    }
    const fuzzyMatch = (name: string) => {
      const lower = name.toLowerCase();
      const codeMatch = name.match(/\(([A-Z]{2}\d{2,})\)/i);
      if (codeMatch) { const code = codeMatch[1].toUpperCase(); const byCode = allPlants.find((p) => p.plantCode.toUpperCase() === code); if (byCode) return byCode; }
      const byExact = allPlants.find((p) => p.plantName.toLowerCase() === lower); if (byExact) return byExact;
      const byPrefix = allPlants.find((p) => { const pl = p.plantName.toLowerCase(); return (lower.length >= 5 && pl.startsWith(lower)) || (pl.length >= 5 && lower.startsWith(pl)); });
      return byPrefix ?? null;
    };
    const used = new Set<string>();
    const rows = parsed.map((p) => ({ match: fuzzyMatch(p.plantName), p }))
      .filter(({ match }) => { if (!match || used.has(match.plantCode)) return false; used.add(match.plantCode); return true; })
      .map(({ match, p }, idx) => ({ plantCode: match!.plantCode, plantName: match!.plantName, numberOfUnits: p.numberOfUnits, totalLoadMw: p.totalLoadMw, sortOrder: idx }));
    setConditionForm((prev) => ({ ...prev, rows }));
    setPasteMode(false); setPasteText('');
  };

  const handleSaveCondition = async () => {
    if (!log || !conditionForm.snapshotTime) return;
    setSavingCondition(true); setConditionError(null);
    try {
      if (editingCondition) {
        const res = await thermalStationLogApi.updateCondition(log.id, editingCondition.id, conditionForm);
        setLog((p) => p ? { ...p, conditions: p.conditions.map((c) => c.id === editingCondition.id ? res.data : c).sort((a, b) => a.snapshotTime.localeCompare(b.snapshotTime)) } : p);
        setEditingCondition(null);
      } else {
        const res = await thermalStationLogApi.addCondition(log.id, conditionForm);
        setLog((p) => p ? { ...p, conditions: [...p.conditions, res.data].sort((a, b) => a.snapshotTime.localeCompare(b.snapshotTime)) } : p);
      }
      setConditionForm(emptyCondition); setShowConditionForm(false);
    } catch { setConditionError('Failed to save condition snapshot.'); }
    finally { setSavingCondition(false); }
  };

  const handleDeleteCondition = async () => {
    if (!log || !deleteCondition) return;
    setDeletingCondition(true);
    try {
      await thermalStationLogApi.deleteCondition(log.id, deleteCondition.id);
      setLog((p) => p ? { ...p, conditions: p.conditions.filter((c) => c.id !== deleteCondition.id) } : p);
      setDeleteCondition(null);
    } catch { setConditionError('Failed to delete condition.'); }
    finally { setDeletingCondition(false); }
  };

  const handleSaveGasReading = async () => {
    if (!log || !gasReadingForm.readingTime) return;
    setSavingGasReading(true); setGasReadingError(null);
    try {
      if (editingGasReading) {
        const res = await thermalStationLogApi.updateGasReading(log.id, editingGasReading.id, gasReadingForm);
        setLog((p) => p ? { ...p, gasReadings: p.gasReadings.map((g) => g.id === editingGasReading.id ? res.data : g).sort((a, b) => a.readingTime.localeCompare(b.readingTime)) } : p);
        setEditingGasReading(null);
      } else {
        const res = await thermalStationLogApi.addGasReading(log.id, gasReadingForm);
        setLog((p) => p ? { ...p, gasReadings: [...p.gasReadings, res.data].sort((a, b) => a.readingTime.localeCompare(b.readingTime)) } : p);
      }
      setGasReadingForm(emptyGasReading); setShowGasReadingForm(false);
    } catch { setGasReadingError('Failed to save gas reading.'); }
    finally { setSavingGasReading(false); }
  };

  const handleDeleteGasReading = async () => {
    if (!log || !deleteGasReading) return;
    setDeletingGasReading(true);
    try {
      await thermalStationLogApi.deleteGasReading(log.id, deleteGasReading.id);
      setLog((p) => p ? { ...p, gasReadings: p.gasReadings.filter((g) => g.id !== deleteGasReading.id) } : p);
      setDeleteGasReading(null);
    } catch { setGasReadingError('Failed to delete gas reading.'); }
    finally { setDeletingGasReading(false); }
  };

  const handleAddHseEntry = async () => {
    if (!log || !hseEntryForm.description.trim()) return;
    setAddingHseEntry(true); setHseEntryError(null);
    try {
      const res = await thermalStationLogApi.addHseEntry(log.id, hseEntryForm);
      setLog((p) => p ? { ...p, hseEntries: [...p.hseEntries, res.data].sort((a, b) => (a.entryDate ?? '').localeCompare(b.entryDate ?? '') || (a.entryTime ?? '').localeCompare(b.entryTime ?? '')) } : p);
      setHseEntryForm(emptyHseEntry);
    } catch { setHseEntryError('Failed to add HSE entry.'); }
    finally { setAddingHseEntry(false); }
  };

  const handleSaveHseEntry = async () => {
    if (!log || !editingHseEntry) return;
    setSavingHseEntry(true);
    try {
      const res = await thermalStationLogApi.updateHseEntry(log.id, editingHseEntry.id, editHseEntryForm);
      setLog((p) => p ? { ...p, hseEntries: p.hseEntries.map((e) => e.id === editingHseEntry.id ? res.data : e) } : p);
      setEditingHseEntry(null);
    } catch { setHseEntryError('Failed to update HSE entry.'); }
    finally { setSavingHseEntry(false); }
  };

  const handleDeleteHseEntry = async () => {
    if (!log || !deleteHseEntry) return;
    setDeletingHseEntry(true);
    try {
      await thermalStationLogApi.deleteHseEntry(log.id, deleteHseEntry.id);
      setLog((p) => p ? { ...p, hseEntries: p.hseEntries.filter((e) => e.id !== deleteHseEntry.id) } : p);
      setDeleteHseEntry(null);
    } catch { setHseEntryError('Failed to delete HSE entry.'); }
    finally { setDeletingHseEntry(false); }
  };

  const handleSaveFuelOilTanks = async () => {
    if (!log) return;
    setSavingFuelOilTanks(true); setFuelOilSaveSuccess(false); setFuelOilSaveError(null);
    try {
      const rows = fuelOilTankRows.map((r) => ({ ...r, readingTime: fuelOilReadingTime }));
      const res = await thermalStationLogApi.saveFuelOilTanks(log.id, rows);
      setLog((p) => p ? { ...p, fuelOilTanks: (res.data as { rows: typeof p.fuelOilTanks }).rows, fuelOilReadingTime } : p);
      setFuelOilSaveSuccess(true);
    } catch { setFuelOilSaveError('Failed to save fuel oil tanks.'); }
    finally { setSavingFuelOilTanks(false); }
  };

  const handleSaveGasConditioning = async () => {
    if (!log) return;
    setSavingGasConditioning(true); setGasCondSaveSuccess(false); setGasCondSaveError(null);
    try {
      const rows = gasConditioningRows.map((r) => ({ ...r, readingTime: gasCondReadingTime }));
      const res = await thermalStationLogApi.saveGasConditioning(log.id, rows);
      setLog((p) => p ? { ...p, gasConditioningRows: (res.data as { rows: typeof p.gasConditioningRows }).rows, gasCondReadingTime } : p);
      setGasCondSaveSuccess(true);
    } catch { setGasCondSaveError('Failed to save gas conditioning.'); }
    finally { setSavingGasConditioning(false); }
  };

  const handleSaveWaterTreatment = async () => {
    if (!log) return;
    setSavingWaterTreatment(true); setWaterSaveSuccess(false); setWaterSaveError(null);
    try {
      const rows = waterTreatmentRows.map((r) => ({ ...r, readingTime: waterReadingTime }));
      const res = await thermalStationLogApi.saveWaterTreatment(log.id, rows);
      setLog((p) => p ? { ...p, waterTreatmentRows: (res.data as { rows: typeof p.waterTreatmentRows }).rows, waterReadingTime } : p);
      setWaterSaveSuccess(true);
    } catch { setWaterSaveError('Failed to save water treatment.'); }
    finally { setSavingWaterTreatment(false); }
  };

  const handleSaveAmbientConditions = async () => {
    if (!log) return;
    setSavingHeader(true);
    try {
      const res = await thermalStationLogApi.update(log.id, buildUpdatePayload());
      setLog(res.data);
    } catch { setHeaderError('Failed to save ambient conditions.'); }
    finally { setSavingHeader(false); }
  };

  const buildUpdatePayload = (overrides: Record<string, unknown> = {}) => ({
    unitsInService: log!.unitsInService ?? '',
    currentOutputMw: log!.currentOutputMw?.toString() ?? null,
    stationService: log!.stationService ?? '',
    linesInService: log!.linesInService ?? '',
    fireProtectionStatus: log!.fireProtectionStatus ?? '',
    emergencyDieselGenStatus: log!.emergencyDieselGenStatus ?? '',
    applicationForOutage: log!.applicationForOutage ?? '',
    miscNotes: log!.miscNotes ?? '',
    showAmbientConditions: log!.showAmbientConditions,
    showHseEntries: log!.showHseEntries,
    showFuelOilTanks: log!.showFuelOilTanks,
    showGasConditioning: log!.showGasConditioning,
    showWaterTreatment: log!.showWaterTreatment,
    ambientTempC: ambientTempC || null,
    ambientPressureMbar: ambientPressureMbar || null,
    relativeHumidityPct: relativeHumidityPct || null,
    fuelOilReadingTime: log!.fuelOilReadingTime ?? null,
    gasCondReadingTime: log!.gasCondReadingTime ?? null,
    waterReadingTime: log!.waterReadingTime ?? null,
    totalGenerationMwh: totalGenerationMwh || null,
    totalStationServiceMwh: totalStationServiceMwh || null,
    netGenerationMwh: netGenerationMwh || null,
    totalGasConsumed: totalGasConsumed || null,
    totalGasConsumedUnit,
    totalLiquidFuelConsumedMt: totalLiquidFuelConsumedMt || null,
    reactiveEnergyGeneratedVarh: reactiveEnergyGeneratedVarh || null,
    generationNotes,
    ...overrides,
  });

  const handleSaveSummary = async () => {
    if (!log) return;
    setSavingSummary(true); setSummarySaveSuccess(false); setSummarySaveError(null);
    try {
      const res = await thermalStationLogApi.update(log.id, buildUpdatePayload());
      setLog(res.data); setSummaryEditing(false); setSummarySaveSuccess(true);
    } catch { setSummarySaveError('Failed to save summary.'); }
    finally { setSavingSummary(false); }
  };

  const handleSaveGenerationRows = async () => {
    if (!log) return;
    setSavingGenerationRows(true); setGenerationRowsSaveSuccess(false); setGenerationRowsSaveError(null);
    try {
      const res = await thermalStationLogApi.saveGenerationRows(log.id, generationRows);
      setLog((p) => p ? { ...p, generationRows: res.data } : p);
      setGenerationRowsSaveSuccess(true);
    } catch { setGenerationRowsSaveError('Failed to save breakdown rows.'); }
    finally { setSavingGenerationRows(false); }
  };

  // ── Per-Unit Output ──
  const handleSaveUnitOutputs = async () => {
    if (!log) return;
    setSavingUnitOutputs(true); setUnitOutputsError(null);
    try {
      await thermalStationLogApi.saveUnitOutputs(log.id, unitOutputs);
      setUnitOutputsSaved(true);
    } catch { setUnitOutputsError('Failed to save unit outputs.'); }
    finally { setSavingUnitOutputs(false); }
  };

  // ── Critical Issues ──
  const handleSaveCriticalIssue = async () => {
    if (!log || !criticalIssueForm.descriptionOfFault.trim()) return;
    setSavingCriticalIssue(true); setCriticalIssueError(null);
    try {
      const dto = {
        equipmentCode: criticalIssueForm.equipmentCode, equipmentName: criticalIssueForm.equipmentName,
        dateObserved: criticalIssueForm.dateObserved || null, descriptionOfFault: criticalIssueForm.descriptionOfFault,
        riskInvolved: criticalIssueForm.riskInvolved || null, impact: criticalIssueForm.impact || null,
        status: criticalIssueForm.status,
      };
      if (editingCriticalIssue) {
        const res = await thermalStationLogAdditionsApi.updateCriticalIssue(log.id, editingCriticalIssue.id, dto);
        setCriticalIssues((p) => p.map((i) => i.id === editingCriticalIssue.id ? res.data : i));
        setEditingCriticalIssue(null);
      } else {
        const res = await thermalStationLogAdditionsApi.addCriticalIssue(log.id, dto);
        setCriticalIssues((p) => [...p, res.data]);
      }
      setCriticalIssueForm(emptyCriticalIssueForm); setShowCriticalIssueForm(false);
    } catch { setCriticalIssueError('Failed to save critical issue.'); }
    finally { setSavingCriticalIssue(false); }
  };

  const handleMarkIssueResolved = async (issue: ThermalCriticalIssue) => {
    if (!log) return;
    setCriticalIssueError(null);
    try {
      const dto = {
        equipmentCode: issue.equipmentCode, equipmentName: issue.equipmentName,
        dateObserved: issue.dateObserved, descriptionOfFault: issue.descriptionOfFault,
        riskInvolved: issue.riskInvolved, impact: issue.impact,
        status: 'Resolved', resolvedOn: new Date().toISOString().split('T')[0],
        resolvedBy: profile?.fullName ?? '',
      };
      const res = await thermalStationLogAdditionsApi.updateCriticalIssue(log.id, issue.id, dto);
      setCriticalIssues((p) => p.map((i) => i.id === issue.id ? res.data : i));
    } catch { setCriticalIssueError('Failed to mark issue resolved.'); }
  };

  const handleDeleteCriticalIssue = async () => {
    if (!log || !deleteCriticalIssue) return;
    setDeletingCriticalIssue(true);
    try {
      await thermalStationLogAdditionsApi.deleteCriticalIssue(log.id, deleteCriticalIssue.id);
      setCriticalIssues((p) => p.filter((i) => i.id !== deleteCriticalIssue.id));
      setDeleteCriticalIssue(null);
    } catch { setCriticalIssueError('Failed to delete critical issue.'); }
    finally { setDeletingCriticalIssue(false); }
  };

  // ── Shift Information ──
  const handleSaveShift = async (shiftType: 'DAY' | 'NIGHT') => {
    if (!log) return;
    const form = shiftType === 'DAY' ? dayShiftForm : nightShiftForm;
    const setSaving = shiftType === 'DAY' ? setSavingDayShift : setSavingNightShift;
    const setError = shiftType === 'DAY' ? setDayShiftError : setNightShiftError;
    const setInfo = shiftType === 'DAY' ? setShiftInfoDay : setShiftInfoNight;
    setSaving(true); setError(null);
    try {
      const dto = {
        shiftType,
        teamLeader: form.teamLeader || null,
        controlRoomOperators: JSON.stringify(form.controlRoomOperators),
        fieldOperators: JSON.stringify(form.fieldOperators),
        shiftStrength: form.shiftStrength ? Number(form.shiftStrength) : null,
        onLeave: JSON.stringify(form.onLeave),
        comments: form.comments || null,
      };
      const res = await thermalStationLogAdditionsApi.saveShiftInfo(log.id, dto);
      setInfo(res.data);
    } catch { setError(`Failed to save ${shiftType === 'DAY' ? 'day' : 'night'} shift information.`); }
    finally { setSaving(false); }
  };

  // ── Pumps / Transformers Status ──
  const handleSavePumps = async () => {
    if (!log) return;
    setSavingPumps(true); setPumpsSaved(false); setPumpsError(null);
    try {
      await thermalStationLogAdditionsApi.saveAllEquipmentStatus(
        log.id, 'Pump',
        pumpRows.map((r) => ({ equipmentCode: r.equipmentCode, equipmentName: r.equipmentName, location: r.location, status: r.status, remarks: r.remarks }))
      );
      setPumpsSaved(true);
    } catch { setPumpsError('Failed to save pump statuses.'); }
    finally { setSavingPumps(false); }
  };

  const handleSaveTransformers = async () => {
    if (!log) return;
    setSavingTransformers(true); setTransformersSaved(false); setTransformersError(null);
    try {
      await thermalStationLogAdditionsApi.saveAllEquipmentStatus(
        log.id, 'Transformer',
        transformerRows.map((r) => ({ equipmentCode: r.equipmentCode, equipmentName: r.equipmentName, location: r.location, status: r.status, remarks: r.remarks }))
      );
      setTransformersSaved(true);
    } catch { setTransformersError('Failed to save transformer statuses.'); }
    finally { setSavingTransformers(false); }
  };

  // ── Oversight Conditions ──
  const reloadOversightEntries = async () => {
    if (!log || !currentPlant?.oversightPlantCode) return;
    try {
      const res = await thermalStationLogAdditionsApi.getOversightEntries(log.id, currentPlant.oversightPlantCode);
      setOversightEntries(res.data.sort(sortOversightEntries));
    } catch { setOversightError('Failed to reload oversight entries.'); }
  };

  const handleSaveOversightEntry = async () => {
    if (!log || !currentPlant?.oversightPlantCode || !oversightForm.entryText.trim()) return;
    setSavingOversightEntry(true); setOversightError(null);
    try {
      const dto = {
        oversightPlantCode: currentPlant.oversightPlantCode,
        oversightPlantName: currentPlant.oversightPlantName ?? currentPlant.oversightPlantCode,
        entryDate: oversightForm.entryDate, entryTime: oversightForm.entryTime, entryText: oversightForm.entryText,
      };
      if (editingOversightEntry) {
        await thermalStationLogAdditionsApi.updateOversightEntry(log.id, editingOversightEntry.id, dto);
        setEditingOversightEntry(null);
      } else {
        await thermalStationLogAdditionsApi.addOversightEntry(log.id, dto);
      }
      await reloadOversightEntries();
      setShowOversightForm(false);
      setOversightForm({ entryDate: new Date().toISOString().split('T')[0], entryTime: new Date().toTimeString().slice(0, 5), entryText: '' });
    } catch { setOversightError('Failed to save oversight entry.'); }
    finally { setSavingOversightEntry(false); }
  };

  const handleDeleteOversightEntry = async () => {
    if (!log || !deleteOversightEntry) return;
    setDeletingOversightEntry(true);
    try {
      await thermalStationLogAdditionsApi.deleteOversightEntry(log.id, deleteOversightEntry.id);
      setDeleteOversightEntry(null);
      await reloadOversightEntries();
    } catch { setOversightError('Failed to delete oversight entry.'); }
    finally { setDeletingOversightEntry(false); }
  };

  const buildTimeline = (): TimelineItem[] => {
    const items: TimelineItem[] = [];
    (log?.entries ?? []).forEach((e) => items.push({ id: e.id, time: e.entryTime, type: 'entry', entry: e }));
    (log?.conditions ?? []).forEach((c) => items.push({ id: c.id, time: c.snapshotTime, type: 'condition', condition: c }));
    (log?.gasReadings ?? []).forEach((g) => items.push({ id: g.id, time: g.readingTime, type: 'gasreading', gasReading: g }));
    shiftHandovers.forEach((h) => {
      const isCurrentDay = h.logDate?.split('T')[0] === selectedDate;
      const isPrevOvernight = !isCurrentDay && h.shiftCode === 'B';
      if (!isCurrentDay && !isPrevOvernight) return;
      if (isPrevOvernight) {
        if (h.officers.length > 0) items.push({ id: `${h.id}-overnight`, time: '00:00', type: 'handover', handoverType: 'incoming', handoverText: `On duty (overnight): ${h.officers.map((o) => o.officerName).join(', ')}.` });
        return;
      }
      if (h.officers.length > 0) items.push({ id: `${h.id}-in`, time: h.handoverTime, type: 'handover', handoverType: 'incoming', handoverText: `On duty: ${h.officers.map((o) => o.officerName).join(', ')}.` });
      if (h.outgoingOfficers.length > 0) {
        const [hh, mm] = h.handoverTime.split(':').map(Number);
        const outTime = `${String(hh).padStart(2, '0')}:${String(Math.min(mm + 1, 59)).padStart(2, '0')}`;
        items.push({ id: `${h.id}-out`, time: outTime, type: 'handover', handoverType: 'outgoing', handoverText: `Off duty: ${h.outgoingOfficers.map((o) => o.officerName).join(', ')}.` });
      }
    });
    return items.sort((a, b) => a.time.localeCompare(b.time));
  };

  const getUnitName = (code: string) => plantUnits.find((u) => u.unitCode === code)?.unitName ?? code;
  const getBusName = (code: string) => plantBuses.find((b) => b.busCode === code)?.busName ?? code;
  const plantDisplayName = availablePlants.find((p) => p.plantCode === selectedPlant)?.plantName ?? selectedPlant;
  const timeline = log ? buildTimeline() : [];
  const totalItems = (log?.entries.length ?? 0) + (log?.conditions.length ?? 0) + (log?.gasReadings.length ?? 0) + shiftHandovers.length;

  const renderMultiSelect = (label: string, items: { value: string; label: string }[], selected: string[], onChange: (v: string[]) => void, disabled?: boolean) => (
    <FormControl fullWidth size="small" disabled={disabled}>
      <InputLabel>{label}</InputLabel>
      <Select multiple value={selected} onChange={(e) => onChange(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)} input={<OutlinedInput label={label} />}
        renderValue={(sel) => sel.map((v) => items.find((i) => i.value === v)?.label ?? v).join(', ')}>
        {items.map((item) => (<MenuItem key={item.value} value={item.value}><Checkbox checked={selected.includes(item.value)} /><ListItemText primary={item.label} /></MenuItem>))}
      </Select>
      {selected.length > 0 && (
        <Stack direction="row" spacing={0.5} sx={{ mt: 0.75, flexWrap: 'wrap' }} useFlexGap>
          {selected.map((val) => (<Chip key={val} size="small" label={items.find((i) => i.value === val)?.label ?? val} onDelete={() => onChange(selected.filter((s) => s !== val))} />))}
        </Stack>
      )}
    </FormControl>
  );

  const renderShiftCard = (
    shiftType: 'DAY' | 'NIGHT',
    form: ShiftFormState,
    setForm: Dispatch<SetStateAction<ShiftFormState>>,
    saving: boolean,
    error: string | null,
    clearError: () => void,
  ) => (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
      <Typography variant="body2" sx={{ fontWeight: 700, color: '#1565C0', mb: 1.5 }}>
        {shiftType === 'DAY' ? 'Day Shift (07:00–19:00)' : 'Night Shift (19:00–07:00)'}
      </Typography>
      {error && <Alert severity="error" onClose={clearError} sx={{ mb: 1.5 }}>{error}</Alert>}
      <Stack spacing={1.5}>
        <PersonAutocomplete label="Team Leader" plantCode={selectedPlant} disabled={!canEdit}
          value={form.teamLeader} onChange={(v) => setForm((p) => ({ ...p, teamLeader: v }))} />

        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', mb: 0.5, display: 'block' }}>
            Control Room Operators
          </Typography>
          <Stack spacing={1}>
            {form.controlRoomOperators.map((name, idx) => (
              <Stack key={idx} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Autocomplete freeSolo size="small" options={plantUserNames} disabled={!canEdit}
                  value={name}
                  onInputChange={(_, v) => { const arr = [...form.controlRoomOperators]; arr[idx] = v; setForm((p) => ({ ...p, controlRoomOperators: arr })); }}
                  renderInput={(params) => <TextField {...params} size="small" placeholder="Operator name" />}
                  sx={{ flex: 1 }} />
                {canEdit && (
                  <IconButton size="small" color="error" onClick={() => setForm((p) => ({ ...p, controlRoomOperators: p.controlRoomOperators.filter((_, i) => i !== idx) }))}>
                    <Delete sx={{ fontSize: 16 }} />
                  </IconButton>
                )}
              </Stack>
            ))}
            {canEdit && form.controlRoomOperators.length < 3 && (
              <Button size="small" startIcon={<Add />} sx={{ alignSelf: 'flex-start', color: '#1565C0' }}
                onClick={() => setForm((p) => ({ ...p, controlRoomOperators: [...p.controlRoomOperators, ''] }))}>
                Add Operator
              </Button>
            )}
          </Stack>
        </Box>

        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', mb: 0.5, display: 'block' }}>
            Field Operators
          </Typography>
          <Stack spacing={1}>
            {form.fieldOperators.map((row, idx) => (
              <Box key={idx}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Autocomplete freeSolo size="small" options={plantUserNames} disabled={!canEdit}
                    value={row.name}
                    onInputChange={(_, v) => { const arr = [...form.fieldOperators]; arr[idx] = { ...arr[idx], name: v }; setForm((p) => ({ ...p, fieldOperators: arr })); }}
                    renderInput={(params) => <TextField {...params} size="small" placeholder="Name" />}
                    sx={{ flex: 1.4 }} />
                  <TextField size="small" placeholder="Assignment (e.g. GT1/HRSG1)" disabled={!canEdit} value={row.assignment}
                    onChange={(e) => { const arr = [...form.fieldOperators]; arr[idx] = { ...arr[idx], assignment: e.target.value }; setForm((p) => ({ ...p, fieldOperators: arr })); }}
                    sx={{ flex: 1 }} />
                  {canEdit && (
                    <IconButton size="small" color="error" onClick={() => setForm((p) => ({ ...p, fieldOperators: p.fieldOperators.filter((_, i) => i !== idx) }))}>
                      <Delete sx={{ fontSize: 16 }} />
                    </IconButton>
                  )}
                </Stack>
                {canEdit && (
                  <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, ml: 0, flexWrap: 'wrap' }} useFlexGap>
                    {FIELD_ASSIGNMENT_OPTIONS.map((opt) => (
                      <Chip key={opt} label={opt} size="small" variant="outlined" sx={{ fontSize: 11, cursor: 'pointer' }}
                        onClick={() => { const arr = [...form.fieldOperators]; arr[idx] = { ...arr[idx], assignment: opt }; setForm((p) => ({ ...p, fieldOperators: arr })); }} />
                    ))}
                  </Stack>
                )}
              </Box>
            ))}
            {canEdit && form.fieldOperators.length < 4 && (
              <Button size="small" startIcon={<Add />} sx={{ alignSelf: 'flex-start', color: '#1565C0' }}
                onClick={() => setForm((p) => ({ ...p, fieldOperators: [...p.fieldOperators, { name: '', assignment: '' }] }))}>
                Add Field Operator
              </Button>
            )}
          </Stack>
        </Box>

        <TextField label="Shift Strength" type="number" size="small" fullWidth disabled={!canEdit}
          value={form.shiftStrength} onChange={(e) => setForm((p) => ({ ...p, shiftStrength: e.target.value }))}
          slotProps={{ htmlInput: { min: 0 } }} />

        <Autocomplete multiple freeSolo size="small" options={plantUserNames} disabled={!canEdit}
          value={form.onLeave}
          onChange={(_, v) => setForm((p) => ({ ...p, onLeave: v }))}
          renderInput={(params) => <TextField {...params} label="On Leave" size="small" placeholder="Add name…" />}
          renderValue={(value, getItemProps) => value.map((option, index) => (
            <Chip variant="outlined" size="small" label={option} {...getItemProps({ index })} />
          ))} />

        <TextField label="Comments" size="small" fullWidth multiline maxRows={4} disabled={!canEdit}
          value={form.comments} onChange={(e) => setForm((p) => ({ ...p, comments: e.target.value }))} />

        {canEdit && (
          <Button size="small" variant="contained" sx={{ backgroundColor: '#1565C0', alignSelf: 'flex-start' }}
            onClick={() => handleSaveShift(shiftType)} disabled={saving}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <Save />}>
            {saving ? 'Saving...' : `Save ${shiftType === 'DAY' ? 'Day' : 'Night'} Shift`}
          </Button>
        )}
      </Stack>
    </Paper>
  );

  return (
    <Box>
      <PageHeader title="Thermal Station Log" subtitle="Daily operational log for thermal power stations"
        breadcrumbs={[{ label: 'Station Logs' }, { label: 'Thermal Station Log' }]} />

      {isWrongPlantType && (
        <Alert severity="warning" sx={{ mb: 3 }}
          action={<Button color="warning" size="small" variant="outlined" onClick={() => navigate('/station-logs/hydro')}>Go to Hydro Station Log</Button>}>
          Your plant assignment is for a hydro plant. You may not have the right data here.
        </Alert>
      )}

      {/* Plant + Date */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ py: '14px !important' }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <LocalFireDepartment sx={{ color: '#B71C1C' }} />
            <FormControl size="small" sx={{ minWidth: 240 }} disabled={plantLocked}>
              <InputLabel>Power Plant</InputLabel>
              <Select label="Power Plant" value={selectedPlant} onChange={(e) => setSelectedPlant(e.target.value)}>
                <MenuItem value="">Select plant…</MenuItem>
                {availablePlants.map((p: PowerPlant) => (<MenuItem key={p.id} value={p.plantCode}>{p.plantName} ({p.plantCode})</MenuItem>))}
              </Select>
            </FormControl>
            <TextField label="Date" type="date" size="small" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            {loading && <CircularProgress size={20} />}
            {log && !loading && <Chip icon={<CheckCircle />} label="Log loaded" color="success" size="small" variant="outlined" />}
          </Stack>
        </CardContent>
      </Card>

      {loadError && <Alert severity="error" onClose={() => setLoadError(null)} sx={{ mb: 2 }}>{loadError}</Alert>}

      {!loading && !log && selectedPlant && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ textAlign: 'center', py: 5 }}>
            <Assignment sx={{ fontSize: '3rem', color: 'text.disabled', mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
              No station log for {plantDisplayName} on {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>Start the log for this date to begin recording entries.</Typography>
            {canCreate && (
              <Button variant="contained" color="error" startIcon={creatingLog ? <CircularProgress size={16} color="inherit" /> : <Add />} onClick={handleCreateLog} disabled={creatingLog}>
                {creatingLog ? 'Creating...' : 'Start Station Log'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {log && (
        <>
          {/* Opening Conditions */}
          <Card sx={{ mb: 2 }}>
            <Box sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', backgroundColor: '#B71C1C14', borderBottom: headerCollapsed ? 'none' : '1px solid', borderColor: 'divider' }} onClick={() => setHeaderCollapsed((p) => !p)}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#B71C1C' }}>
                  Opening Conditions — {new Date(log.logDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                </Typography>
                <Chip label={log.plantName} size="small" color="error" variant="outlined" />
              </Stack>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                {canEdit && !headerEditing && (<Tooltip title="Edit header"><IconButton size="small" onClick={(e) => { e.stopPropagation(); setHeaderEditing(true); }}><Edit fontSize="small" /></IconButton></Tooltip>)}
                <IconButton size="small">{headerCollapsed ? <ExpandMore fontSize="small" /> : <ExpandLess fontSize="small" />}</IconButton>
              </Stack>
            </Box>
            <Collapse in={!headerCollapsed}>
              <CardContent>
                {headerError && <Alert severity="error" onClose={() => setHeaderError(null)} sx={{ mb: 2 }}>{headerError}</Alert>}
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    {headerEditing ? renderMultiSelect('Units in Service', plantUnits.map((u) => ({ value: u.unitCode, label: `${u.unitName} (${u.unitCode})` })), selectedUnits, setSelectedUnits, plantUnits.length === 0)
                      : (
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Units in Service</Typography>
                          <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap' }} useFlexGap>
                            {toArray(log.unitsInService).length > 0
                              ? toArray(log.unitsInService).map((code) => (<Chip key={code} label={getUnitName(code)} size="small" color="error" variant="outlined" />))
                              : <Typography variant="body2" sx={{ fontStyle: 'italic', color: '#999' }}>Not specified</Typography>}
                          </Stack>
                        </Box>
                      )}
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    {headerEditing
                      ? <TextField label="Current Output (MW)" type="number" fullWidth size="small" value={currentOutputMw} onChange={(e) => setCurrentOutputMw(e.target.value)} slotProps={{ htmlInput: { min: 0, step: 0.01 } }} />
                      : (
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Current Output</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: '#B71C1C', mt: 0.25 }}>
                            {log.currentOutputMw != null ? `${log.currentOutputMw} MW` : <span style={{ color: '#999', fontSize: 14, fontWeight: 400, fontStyle: 'italic' }}>Not recorded</span>}
                          </Typography>
                        </Box>
                      )}
                  </Grid>

                  {unitOutputs.length > 0 && (
                    <Grid size={{ xs: 12 }}>
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#1B5E20', display: 'block', mb: 1 }}>
                          Unit Outputs
                        </Typography>
                        {unitOutputsError && <Alert severity="error" onClose={() => setUnitOutputsError(null)} sx={{ mb: 1.5 }}>{unitOutputsError}</Alert>}
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ backgroundColor: '#E8F5E9' }}>
                              <TableCell sx={{ fontWeight: 700 }}>Unit</TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                              <TableCell sx={{ fontWeight: 700, width: 140 }}>Output (MW)</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {unitOutputs.map((u, idx) => (
                              <TableRow key={u.unitCode}>
                                <TableCell>
                                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                    <Chip label={u.unitCode} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: 11 }} />
                                    <Typography variant="body2">{u.unitName}</Typography>
                                  </Stack>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" color="text.secondary">{u.unitStatus}</Typography>
                                </TableCell>
                                 <TableCell>
                                   {headerEditing ? (
                                     <TextField size="small" type="number" fullWidth
                                       value={u.outputMW ?? ''}
                                       onChange={(e) => {
                                         const updated = [...unitOutputs];
                                         updated[idx] = { ...updated[idx], outputMW: e.target.value ? Number(e.target.value) : null };
                                         setUnitOutputs(updated);
                                         setUnitOutputsSaved(false);
                                         // Auto-sum into main output field
                                         const total = updated.reduce((sum, u) => sum + (u.outputMW ?? 0), 0);
                                         setCurrentOutputMw(total > 0 ? total.toFixed(1) : '');
                                       }}
                                       slotProps={{ htmlInput: { min: 0, step: 0.1 } }} />
                                   ) : (
                                     <Typography variant="body2" sx={{ fontWeight: 600, color: '#1B5E20' }}>
                                       {u.outputMW != null ? `${u.outputMW} MW` : <span style={{ color: '#999', fontStyle: 'italic' }}>—</span>}
                                     </Typography>
                                   )}
                                 </TableCell>
                              </TableRow>
                            ))}
                            <TableRow sx={{ backgroundColor: '#F1F8E9' }}>
                              <TableCell colSpan={2}>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>Total Output</Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: '#1B5E20' }}>
                                  {unitOutputs.reduce((sum, u) => sum + (u.outputMW ?? 0), 0).toFixed(1)} MW
                                </Typography>
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                        {canEdit && headerEditing && (
                          <Stack direction="row" spacing={1.5} sx={{ mt: 1.5 }}>
                            <Box sx={{ flex: 1 }} />
                            {unitOutputsSaved ? (
                              <Chip label="Outputs Saved" color="success" size="small" icon={<CheckCircle />} />
                            ) : (
                              <Button size="small" variant="contained" sx={{ backgroundColor: '#1B5E20' }}
                                onClick={handleSaveUnitOutputs} disabled={savingUnitOutputs}
                                startIcon={savingUnitOutputs ? <CircularProgress size={14} color="inherit" /> : <Save />}>
                                {savingUnitOutputs ? 'Saving...' : 'Save Outputs'}
                              </Button>
                            )}
                          </Stack>
                        )}
                      </Box>
                    </Grid>
                  )}

                  {TEXT_FIELDS.slice(0, 1).map((field) => (
                    <Grid key={field.key} size={{ xs: 12, sm: 6 }}>
                      {headerEditing
                        ? <TextField label={field.label} fullWidth multiline maxRows={4} size="small" value={headerTextForm[field.key]} onChange={(e) => setHeaderTextForm((p) => ({ ...p, [field.key]: e.target.value }))} />
                        : (
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{field.label}</Typography>
                            <Typography variant="body2" sx={{ mt: 0.25, whiteSpace: 'pre-wrap' }}>
                              {(log as unknown as Record<string, string>)[field.key] || <span style={{ color: '#999', fontStyle: 'italic' }}>Not specified</span>}
                            </Typography>
                          </Box>
                        )}
                    </Grid>
                  ))}

                  <Grid size={{ xs: 12, sm: 6 }}>
                    {headerEditing ? renderMultiSelect(
                      'Lines in Service',
                      plantBuses.map((b) => ({ value: b.busCode, label: `${b.busName} (${b.busCode})` })),
                      selectedBuses, setSelectedBuses, plantBuses.length === 0,
                    ) : (
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Lines in Service
                        </Typography>
                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap' }} useFlexGap>
                          {toArray(log.linesInService).length > 0
                            ? toArray(log.linesInService).map((code) => (
                              <Chip key={code} label={getBusName(code)} size="small" color="error" variant="outlined" />
                            ))
                            : <Typography variant="body2" sx={{ fontStyle: 'italic', color: '#999' }}>Not specified</Typography>}
                        </Stack>
                      </Box>
                    )}
                  </Grid>

                  {TEXT_FIELDS.slice(1).map((field) => (
                    <Grid key={field.key} size={{ xs: 12, sm: 6 }}>
                      {headerEditing
                        ? <TextField label={field.label} fullWidth multiline maxRows={4} size="small" value={headerTextForm[field.key]} onChange={(e) => setHeaderTextForm((p) => ({ ...p, [field.key]: e.target.value }))} />
                        : (
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{field.label}</Typography>
                            <Typography variant="body2" sx={{ mt: 0.25, whiteSpace: 'pre-wrap' }}>
                              {(log as unknown as Record<string, string>)[field.key] || <span style={{ color: '#999', fontStyle: 'italic' }}>Not specified</span>}
                            </Typography>
                          </Box>
                        )}
                    </Grid>
                  ))}
                </Grid>
                {headerEditing && (
                  <Stack direction="row" spacing={1.5} sx={{ mt: 2.5 }}>
                    <Button variant="outlined" size="small" onClick={() => { setHeaderEditing(false); populateHeader(log); }} disabled={savingHeader}>Cancel</Button>
                    <Button variant="contained" color="error" size="small" onClick={handleSaveHeader} disabled={savingHeader}
                      startIcon={savingHeader ? <CircularProgress size={14} color="inherit" /> : <Save />}>
                      {savingHeader ? 'Saving...' : 'Save Header'}
                    </Button>
                  </Stack>
                )}
              </CardContent>
            </Collapse>
          </Card>

          {/* ── Pumps Status ── */}
          <Card sx={{ mb: 2 }}>
            <Box sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', backgroundColor: '#1B5E2014', borderBottom: pumpsCollapsed ? 'none' : '1px solid', borderColor: 'divider' }} onClick={() => setPumpsCollapsed((p) => !p)}>
              <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#1B5E20' }}>Pumps Status</Typography>
              <IconButton size="small">{pumpsCollapsed ? <ExpandMore fontSize="small" /> : <ExpandLess fontSize="small" />}</IconButton>
            </Box>
            <Collapse in={!pumpsCollapsed}>
              <CardContent>
                {pumpsSaved && <Alert severity="success" onClose={() => setPumpsSaved(false)} sx={{ mb: 2 }}>Pump statuses saved successfully.</Alert>}
                {pumpsError && <Alert severity="error" onClose={() => setPumpsError(null)} sx={{ mb: 2 }}>{pumpsError}</Alert>}
                {pumpRows.length === 0
                  ? <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2, fontStyle: 'italic' }}>No pump equipment configured for this plant.</Typography>
                  : (
                    <>
                      <Table size="small" sx={{ mb: 1.5 }}>
                        <TableHead>
                          <TableRow sx={{ backgroundColor: '#E8F5E9' }}>
                            <TableCell sx={{ fontWeight: 700 }}>Equipment</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
                            <TableCell sx={{ fontWeight: 700, width: 160 }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Remarks</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {pumpRows.map((row, idx) => (
                            <TableRow key={`${row.equipmentCode}-${idx}`}>
                              <TableCell>
                                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                  <Chip label={row.equipmentCode} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: 11 }} />
                                  <Typography variant="body2">{row.equipmentName}</Typography>
                                </Stack>
                              </TableCell>
                              <TableCell><Typography variant="body2" color="text.secondary">{row.location}</Typography></TableCell>
                              <TableCell>
                                <FormControl size="small" fullWidth disabled={!canEdit}>
                                  <Select displayEmpty value={row.status} onChange={(e) => { const r = [...pumpRows]; r[idx] = { ...r[idx], status: e.target.value }; setPumpRows(r); }}>
                                    <MenuItem value=""><em>Select…</em></MenuItem>
                                    {PUMP_STATUS_OPTIONS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                                  </Select>
                                </FormControl>
                              </TableCell>
                              <TableCell><TextField size="small" fullWidth placeholder="Optional remarks" value={row.remarks} disabled={!canEdit} onChange={(e) => { const r = [...pumpRows]; r[idx] = { ...r[idx], remarks: e.target.value }; setPumpRows(r); }} /></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {canEdit && (
                        <Button size="small" variant="contained" sx={{ backgroundColor: '#1B5E20' }} onClick={handleSavePumps} disabled={savingPumps}
                          startIcon={savingPumps ? <CircularProgress size={14} color="inherit" /> : <Save />}>
                          {savingPumps ? 'Saving...' : 'Save All'}
                        </Button>
                      )}
                    </>
                  )}
              </CardContent>
            </Collapse>
          </Card>

          {/* ── Station Service Transformer Status ── */}
          <Card sx={{ mb: 2 }}>
            <Box sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', backgroundColor: '#E6510014', borderBottom: transformersCollapsed ? 'none' : '1px solid', borderColor: 'divider' }} onClick={() => setTransformersCollapsed((p) => !p)}>
              <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#E65100' }}>Station Service Transformer Status</Typography>
              <IconButton size="small">{transformersCollapsed ? <ExpandMore fontSize="small" /> : <ExpandLess fontSize="small" />}</IconButton>
            </Box>
            <Collapse in={!transformersCollapsed}>
              <CardContent>
                {transformersSaved && <Alert severity="success" onClose={() => setTransformersSaved(false)} sx={{ mb: 2 }}>Transformer statuses saved successfully.</Alert>}
                {transformersError && <Alert severity="error" onClose={() => setTransformersError(null)} sx={{ mb: 2 }}>{transformersError}</Alert>}
                {transformerRows.length === 0
                  ? <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2, fontStyle: 'italic' }}>No transformer equipment configured for this plant.</Typography>
                  : (
                    <>
                      <Table size="small" sx={{ mb: 1.5 }}>
                        <TableHead>
                          <TableRow sx={{ backgroundColor: '#FFF3E0' }}>
                            <TableCell sx={{ fontWeight: 700 }}>Equipment</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
                            <TableCell sx={{ fontWeight: 700, width: 170 }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Remarks</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {transformerRows.map((row, idx) => (
                            <TableRow key={`${row.equipmentCode}-${idx}`}>
                              <TableCell>
                                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                  <Chip label={row.equipmentCode} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: 11 }} />
                                  <Typography variant="body2">{row.equipmentName}</Typography>
                                </Stack>
                              </TableCell>
                              <TableCell><Typography variant="body2" color="text.secondary">{row.location}</Typography></TableCell>
                              <TableCell>
                                <FormControl size="small" fullWidth disabled={!canEdit}>
                                  <Select displayEmpty value={row.status} onChange={(e) => { const r = [...transformerRows]; r[idx] = { ...r[idx], status: e.target.value }; setTransformerRows(r); }}>
                                    <MenuItem value=""><em>Select…</em></MenuItem>
                                    {TRANSFORMER_STATUS_OPTIONS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                                  </Select>
                                </FormControl>
                              </TableCell>
                              <TableCell><TextField size="small" fullWidth placeholder="Optional remarks" value={row.remarks} disabled={!canEdit} onChange={(e) => { const r = [...transformerRows]; r[idx] = { ...r[idx], remarks: e.target.value }; setTransformerRows(r); }} /></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {canEdit && (
                        <Button size="small" variant="contained" sx={{ backgroundColor: '#E65100' }} onClick={handleSaveTransformers} disabled={savingTransformers}
                          startIcon={savingTransformers ? <CircularProgress size={14} color="inherit" /> : <Save />}>
                          {savingTransformers ? 'Saving...' : 'Save All'}
                        </Button>
                      )}
                    </>
                  )}
              </CardContent>
            </Collapse>
          </Card>

          {/* Safety Documents */}
          <Card sx={{ mb: 2 }}>
            <Box sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', backgroundColor: '#E6510014', borderBottom: safetyDocsCollapsed ? 'none' : '1px solid', borderColor: 'divider' }} onClick={() => setSafetyDocsCollapsed((p) => !p)}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#E65100' }}>Safety Documents in Effect</Typography>
                <Chip label={`${log.safetyDocs.length}`} size="small" variant="outlined" sx={{ color: '#E65100', borderColor: '#E65100' }} />
              </Stack>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                {canCreate && (<Tooltip title="Add safety document"><IconButton size="small" onClick={(e) => { e.stopPropagation(); setEditingSafetyDoc(null); setSafetyDocForm(emptySafetyDoc); setShowSafetyDocForm(true); }}><Add fontSize="small" /></IconButton></Tooltip>)}
                <IconButton size="small">{safetyDocsCollapsed ? <ExpandMore fontSize="small" /> : <ExpandLess fontSize="small" />}</IconButton>
              </Stack>
            </Box>
            <Collapse in={!safetyDocsCollapsed}>
              <CardContent>
                {safetyDocError && <Alert severity="error" onClose={() => setSafetyDocError(null)} sx={{ mb: 2 }}>{safetyDocError}</Alert>}
                {showSafetyDocForm && (
                  <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2, borderColor: '#E65100', backgroundColor: '#FFF3E0' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#E65100', mb: 1.5 }}>{editingSafetyDoc ? 'Edit Safety Document' : 'New Safety Document'}</Typography>
                    <Grid container spacing={1.5}>
                      <Grid size={{ xs: 12 }}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Safety Document Type</InputLabel>
                          <Select
                            label="Safety Document Type"
                            value={safetyDocForm.safetyDocTypeCode}
                            onChange={(e) => {
                              const selected = safetyDocTypes.find((t) => t.code === e.target.value);
                              setSafetyDocForm((p) => ({
                                ...p,
                                safetyDocTypeCode: selected?.code ?? '',
                                safetyDocTypeName: selected?.name ?? '',
                              }));
                            }}
                          >
                            <MenuItem value=""><em>Select type…</em></MenuItem>
                            {safetyDocTypes.map((t) => (
                              <MenuItem key={t.id} value={t.code}>
                                <Chip label={t.code} size="small" variant="outlined" sx={{ mr: 1, fontFamily: 'monospace', fontSize: 11 }} />
                                {t.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}><TextField label="Doc #" size="small" fullWidth value={safetyDocForm.docNumber} onChange={(e) => setSafetyDocForm((p) => ({ ...p, docNumber: e.target.value }))} placeholder="LWC #1864" /></Grid>
                      <Grid size={{ xs: 6, sm: 3 }}><TextField label="Work Order #" size="small" fullWidth value={safetyDocForm.workOrderNumber} onChange={(e) => setSafetyDocForm((p) => ({ ...p, workOrderNumber: e.target.value }))} /></Grid>
                      <Grid size={{ xs: 12, sm: 6 }}><TextField label="Permit Holder" size="small" fullWidth value={safetyDocForm.permitHolder} onChange={(e) => setSafetyDocForm((p) => ({ ...p, permitHolder: e.target.value }))} placeholder="e.g. C&I/Siameh" /></Grid>
                      <Grid size={{ xs: 12 }}><TextField label="Work Description" size="small" fullWidth multiline rows={2} value={safetyDocForm.workDescription} onChange={(e) => setSafetyDocForm((p) => ({ ...p, workDescription: e.target.value }))} /></Grid>
                      <Grid size={{ xs: 6, sm: 3 }}><TextField label="Start Date" type="date" size="small" fullWidth value={safetyDocForm.startDate} onChange={(e) => setSafetyDocForm((p) => ({ ...p, startDate: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
                      <Grid size={{ xs: 6, sm: 9 }}><TextField label="Completion Date / Status" size="small" fullWidth value={safetyDocForm.completionDate} onChange={(e) => setSafetyDocForm((p) => ({ ...p, completionDate: e.target.value }))} placeholder="e.g. Till work is completed" /></Grid>
                    </Grid>
                    <Stack direction="row" spacing={1.5} sx={{ mt: 1.5 }}>
                      <Button size="small" variant="outlined" onClick={() => { setShowSafetyDocForm(false); setEditingSafetyDoc(null); }} disabled={savingSafetyDoc}>Cancel</Button>
                      <Button size="small" variant="contained" sx={{ backgroundColor: '#E65100' }} onClick={handleSaveSafetyDoc} disabled={savingSafetyDoc}
                        startIcon={savingSafetyDoc ? <CircularProgress size={14} color="inherit" /> : <Save />}>
                        {savingSafetyDoc ? 'Saving...' : 'Save'}
                      </Button>
                    </Stack>
                  </Paper>
                )}
                {log.safetyDocs.length === 0 && !showSafetyDocForm
                  ? <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2, fontStyle: 'italic' }}>No safety documents in effect.</Typography>
                  : (
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#FFF3E0' }}>
                          <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Type</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Doc #</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Work Order</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Permit Holder</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Description</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Start</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Completion</TableCell>
                          <TableCell align="right" sx={{ width: 80 }} />
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {log.safetyDocs.map((doc) => (
                          <TableRow key={doc.id} hover>
                            <TableCell sx={{ fontSize: 12 }}>
                              {doc.safetyDocTypeCode
                                ? <Chip label={doc.safetyDocTypeCode} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: 11 }} />
                                : <Typography variant="caption" color="text.disabled">—</Typography>}
                            </TableCell>
                            <TableCell sx={{ fontSize: 12 }}>{doc.docNumber ?? '—'}</TableCell>
                            <TableCell sx={{ fontSize: 12 }}>{doc.workOrderNumber ?? '—'}</TableCell>
                            <TableCell sx={{ fontSize: 12 }}>{doc.permitHolder ?? '—'}</TableCell>
                            <TableCell sx={{ fontSize: 12, maxWidth: 200 }}>{doc.workDescription ?? '—'}</TableCell>
                            <TableCell sx={{ fontSize: 12 }}>{doc.startDate ? new Date(doc.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</TableCell>
                            <TableCell sx={{ fontSize: 12 }}>{doc.completionDate ?? '—'}</TableCell>
                            <TableCell align="right">
                              {canEdit && (<Tooltip title="Edit"><IconButton size="small" onClick={() => { setEditingSafetyDoc(doc); setSafetyDocForm({ safetyDocTypeCode: doc.safetyDocTypeCode ?? '', safetyDocTypeName: doc.safetyDocTypeName ?? '', docNumber: doc.docNumber ?? '', workOrderNumber: doc.workOrderNumber ?? '', permitHolder: doc.permitHolder ?? '', workDescription: doc.workDescription ?? '', startDate: doc.startDate?.split('T')[0] ?? '', completionDate: doc.completionDate ?? '', sortOrder: doc.sortOrder }); setShowSafetyDocForm(true); }}><Edit sx={{ fontSize: 14 }} /></IconButton></Tooltip>)}
                              {canDelete && (<Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setDeleteSafetyDoc(doc)}><Delete sx={{ fontSize: 14 }} /></IconButton></Tooltip>)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
              </CardContent>
            </Collapse>
          </Card>

          {/* Running Log */}
          <Card sx={{ mb: 2 }}>
            <CardHeader title={<Stack direction="row" sx={{ alignItems: 'center' }} spacing={1.5}><Typography sx={{ fontWeight: 700 }}>Station Log</Typography><Chip label={`${totalItems} items`} size="small" variant="outlined" /></Stack>} />
            <Divider />
            <CardContent>
              {entryError && <Alert severity="error" onClose={() => setEntryError(null)} sx={{ mb: 2 }}>{entryError}</Alert>}
              {conditionError && <Alert severity="error" onClose={() => setConditionError(null)} sx={{ mb: 2 }}>{conditionError}</Alert>}
              {gasReadingError && <Alert severity="error" onClose={() => setGasReadingError(null)} sx={{ mb: 2 }}>{gasReadingError}</Alert>}

              {canCreate && (
                <Stack spacing={1.5} sx={{ mb: 2.5 }}>
                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, backgroundColor: '#F8F9FA' }}>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
                      <TextField label="Time" type="time" size="small" sx={{ width: 120 }} value={entryForm.entryTime} onChange={(e) => setEntryForm((p) => ({ ...p, entryTime: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
                      <TextField label="Entry" size="small" fullWidth multiline maxRows={4} value={entryForm.entryText} onChange={(e) => setEntryForm((p) => ({ ...p, entryText: e.target.value }))} placeholder="Record an observation, action or event…" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddEntry(); } }} />
                      <Button variant="contained" size="small" sx={{ minWidth: 80, mt: 0.5 }} startIcon={addingEntry ? <CircularProgress size={14} color="inherit" /> : <Add />} onClick={handleAddEntry} disabled={addingEntry || !entryForm.entryTime || !entryForm.entryText.trim()}>{addingEntry ? '...' : 'Add'}</Button>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>Press Enter to add · Shift+Enter for new line</Typography>
                  </Paper>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="outlined" startIcon={<TableChart />} onClick={() => { setEditingCondition(null); setConditionForm(emptyCondition); setShowConditionForm(true); }}>Add System Conditions</Button>
                    <Button size="small" variant="outlined" startIcon={<GasMeter />} color="warning" onClick={() => { setEditingGasReading(null); setGasReadingForm(emptyGasReading); setShowGasReadingForm(true); }}>Add Gas Reading</Button>
                  </Stack>
                </Stack>
              )}

              {/* Condition Form */}
              {showConditionForm && (
                <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2, borderColor: '#1B5E20', backgroundColor: '#F1F8F1' }}>
                  <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#1B5E20' }}>{editingCondition ? 'Edit System Conditions' : 'New System Conditions Snapshot'}</Typography>
                    <IconButton size="small" onClick={() => { setShowConditionForm(false); setEditingCondition(null); setPasteMode(false); setPasteText(''); }}><ExpandLess fontSize="small" /></IconButton>
                  </Stack>
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid size={{ xs: 12, sm: 4 }}><TextField label="Time" type="time" size="small" fullWidth required value={conditionForm.snapshotTime} onChange={(e) => setConditionForm((p) => ({ ...p, snapshotTime: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
                    <Grid size={{ xs: 12, sm: 4 }}><TextField label="Source" size="small" fullWidth value={conditionForm.source} onChange={(e) => setConditionForm((p) => ({ ...p, source: e.target.value }))} placeholder="e.g. GRIDCo/Nyamekye" /></Grid>
                    <Grid size={{ xs: 12, sm: 4 }}><TextField label="System Voltage (kV)" type="number" size="small" fullWidth value={conditionForm.systemVoltageKv} onChange={(e) => setConditionForm((p) => ({ ...p, systemVoltageKv: e.target.value }))} slotProps={{ htmlInput: { min: 0, step: 0.1 } }} /></Grid>
                    <Grid size={{ xs: 12 }}><TextField label="Remarks" size="small" fullWidth value={conditionForm.remarks} onChange={(e) => setConditionForm((p) => ({ ...p, remarks: e.target.value }))} placeholder="e.g. All transmission lines in service except AW1K line" /></Grid>
                  </Grid>
                  <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#1B5E20' }}>Station Readings</Typography>
                    <Button size="small" variant={pasteMode ? 'contained' : 'outlined'} onClick={() => { setPasteMode((p) => !p); setPasteText(''); }}
                      sx={{ fontSize: 11, color: pasteMode ? 'white' : '#1B5E20', borderColor: '#1B5E20', backgroundColor: pasteMode ? '#1B5E20' : 'transparent' }}>
                      {pasteMode ? 'Cancel Paste' : '📋 Paste from Excel'}
                    </Button>
                  </Stack>
                  {pasteMode && (
                    <Box sx={{ mb: 1.5 }}>
                      <TextField fullWidth multiline rows={6} size="small" value={pasteText} onChange={(e) => setPasteText(e.target.value)}
                        onPaste={(e) => { const text = e.clipboardData.getData('text'); setPasteText(text); setTimeout(() => parsePasteText(text), 50); }}
                        placeholder={'Copy the station readings table from Excel and paste here.\nExpected columns: Station Name | Units | Load (MW)'} sx={{ fontFamily: 'monospace', fontSize: 12 }} />
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        <Button size="small" variant="contained" onClick={() => parsePasteText(pasteText)} disabled={!pasteText.trim()} sx={{ backgroundColor: '#1B5E20' }}>Parse & Fill Rows</Button>
                        <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>Paste automatically fills matched rows only.</Typography>
                      </Stack>
                    </Box>
                  )}
                  <Table size="small" sx={{ mt: 1, mb: 1.5 }}>
                    <TableHead><TableRow sx={{ backgroundColor: '#E8F5E9' }}><TableCell sx={{ fontWeight: 700 }}>Station</TableCell><TableCell sx={{ fontWeight: 700, width: 120 }}>Units</TableCell><TableCell sx={{ fontWeight: 700, width: 140 }}>Load (MW)</TableCell><TableCell sx={{ width: 40 }} /></TableRow></TableHead>
                    <TableBody>
                      {conditionForm.rows.map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <FormControl fullWidth size="small">
                              <Select value={row.plantCode} displayEmpty
                                onChange={(e) => { const plant = allPlants.find((p) => p.plantCode === e.target.value); const r = [...conditionForm.rows]; r[idx] = { ...r[idx], plantCode: e.target.value, plantName: plant?.plantName ?? e.target.value }; setConditionForm((p) => ({ ...p, rows: r })); }}>
                                <MenuItem value="" disabled><em>Select plant…</em></MenuItem>
                                {allPlants.filter((p) => p.plantCode === row.plantCode || !conditionForm.rows.some((r, ri) => ri !== idx && r.plantCode === p.plantCode)).map((p) => <MenuItem key={p.id} value={p.plantCode}>{p.plantName}</MenuItem>)}
                              </Select>
                            </FormControl>
                          </TableCell>
                          <TableCell><TextField size="small" type="number" fullWidth value={row.numberOfUnits} onChange={(e) => { const r = [...conditionForm.rows]; r[idx] = { ...r[idx], numberOfUnits: e.target.value }; setConditionForm((p) => ({ ...p, rows: r })); }} slotProps={{ htmlInput: { min: 0 } }} /></TableCell>
                          <TableCell><TextField size="small" type="number" fullWidth value={row.totalLoadMw} onChange={(e) => { const r = [...conditionForm.rows]; r[idx] = { ...r[idx], totalLoadMw: e.target.value }; setConditionForm((p) => ({ ...p, rows: r })); }} slotProps={{ htmlInput: { min: 0, step: 0.01 } }} /></TableCell>
                          <TableCell><IconButton size="small" color="error" onClick={() => setConditionForm((p) => ({ ...p, rows: p.rows.filter((_, i) => i !== idx) }))}><Delete sx={{ fontSize: 16 }} /></IconButton></TableCell>
                        </TableRow>
                      ))}
                      {conditionForm.rows.length === 0 && <TableRow><TableCell colSpan={4} align="center" sx={{ py: 2, color: '#999', fontStyle: 'italic' }}>No stations added yet</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    <Button size="small" variant="outlined" startIcon={<Add />} onClick={() => setConditionForm((p) => ({ ...p, rows: [...p.rows, { plantCode: '', plantName: '', numberOfUnits: '', totalLoadMw: '', sortOrder: p.rows.length }] }))} sx={{ color: '#1B5E20', borderColor: '#1B5E20' }}>Add Row</Button>
                    <Box sx={{ flex: 1 }} />
                    <Button size="small" variant="outlined" onClick={() => { setShowConditionForm(false); setEditingCondition(null); }} disabled={savingCondition}>Cancel</Button>
                    <Button size="small" variant="contained" onClick={handleSaveCondition} disabled={savingCondition || !conditionForm.snapshotTime}
                      startIcon={savingCondition ? <CircularProgress size={14} color="inherit" /> : <Save />} sx={{ backgroundColor: '#1B5E20' }}>
                      {savingCondition ? 'Saving...' : 'Save Snapshot'}
                    </Button>
                  </Stack>
                </Paper>
              )}

              {/* Gas Reading Form */}
              {showGasReadingForm && (
                <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2, borderColor: '#E65100', backgroundColor: '#FFF3E0' }}>
                  <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#E65100' }}>{editingGasReading ? 'Edit Gas Reading' : 'New Gas Reading'}</Typography>
                    <IconButton size="small" onClick={() => { setShowGasReadingForm(false); setEditingGasReading(null); }}><ExpandLess fontSize="small" /></IconButton>
                  </Stack>
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid size={{ xs: 12, sm: 6 }}><TextField label="Reading Time" type="time" size="small" fullWidth required value={gasReadingForm.readingTime} onChange={(e) => setGasReadingForm((p) => ({ ...p, readingTime: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
                    <Grid size={{ xs: 12, sm: 6 }}><TextField label="Source" size="small" fullWidth value={gasReadingForm.source} onChange={(e) => setGasReadingForm((p) => ({ ...p, source: e.target.value }))} placeholder="e.g. WAGPCo/Prince Adusei" /></Grid>
                  </Grid>
                  <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#E65100' }}>Terminal Readings</Typography>
                  <Table size="small" sx={{ mt: 1, mb: 1.5 }}>
                    <TableHead><TableRow sx={{ backgroundColor: '#FFF3E0' }}><TableCell sx={{ fontWeight: 700 }}>Terminal</TableCell><TableCell sx={{ fontWeight: 700, width: 130 }}>Inlet (bar)</TableCell><TableCell sx={{ fontWeight: 700, width: 130 }}>Outlet (bar)</TableCell><TableCell sx={{ fontWeight: 700, width: 140 }}>Flow (MMScf/D)</TableCell><TableCell sx={{ width: 40 }} /></TableRow></TableHead>
                    <TableBody>
                      {gasReadingForm.rows.map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell><TextField size="small" fullWidth value={row.terminal} onChange={(e) => { const r = [...gasReadingForm.rows]; r[idx] = { ...r[idx], terminal: e.target.value }; setGasReadingForm((p) => ({ ...p, rows: r })); }} placeholder="e.g. Itoki, Tema" /></TableCell>
                          <TableCell><TextField size="small" type="number" fullWidth value={row.inletPressureBar} onChange={(e) => { const r = [...gasReadingForm.rows]; r[idx] = { ...r[idx], inletPressureBar: e.target.value }; setGasReadingForm((p) => ({ ...p, rows: r })); }} slotProps={{ htmlInput: { step: 0.01 } }} /></TableCell>
                          <TableCell><TextField size="small" type="number" fullWidth value={row.outletPressureBar} onChange={(e) => { const r = [...gasReadingForm.rows]; r[idx] = { ...r[idx], outletPressureBar: e.target.value }; setGasReadingForm((p) => ({ ...p, rows: r })); }} slotProps={{ htmlInput: { step: 0.01 } }} /></TableCell>
                          <TableCell><TextField size="small" type="number" fullWidth value={row.flowRateMmscf} onChange={(e) => { const r = [...gasReadingForm.rows]; r[idx] = { ...r[idx], flowRateMmscf: e.target.value }; setGasReadingForm((p) => ({ ...p, rows: r })); }} slotProps={{ htmlInput: { step: 0.001 } }} /></TableCell>
                          <TableCell><IconButton size="small" color="error" onClick={() => setGasReadingForm((p) => ({ ...p, rows: p.rows.filter((_, i) => i !== idx) }))}><Delete sx={{ fontSize: 16 }} /></IconButton></TableCell>
                        </TableRow>
                      ))}
                      {gasReadingForm.rows.length === 0 && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 2, color: '#999', fontStyle: 'italic' }}>No terminals added yet</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                  <Stack direction="row" spacing={1.5}>
                    <Button size="small" variant="outlined" startIcon={<Add />} onClick={() => setGasReadingForm((p) => ({ ...p, rows: [...p.rows, { terminal: '', inletPressureBar: '', outletPressureBar: '', flowRateMmscf: '', sortOrder: p.rows.length }] }))} sx={{ color: '#E65100', borderColor: '#E65100' }}>Add Terminal</Button>
                    <Box sx={{ flex: 1 }} />
                    <Button size="small" variant="outlined" onClick={() => { setShowGasReadingForm(false); setEditingGasReading(null); }} disabled={savingGasReading}>Cancel</Button>
                    <Button size="small" variant="contained" onClick={handleSaveGasReading} disabled={savingGasReading || !gasReadingForm.readingTime}
                      startIcon={savingGasReading ? <CircularProgress size={14} color="inherit" /> : <Save />} sx={{ backgroundColor: '#E65100' }}>
                      {savingGasReading ? 'Saving...' : 'Save Reading'}
                    </Button>
                  </Stack>
                </Paper>
              )}

              {/* Timeline */}
              {timeline.length === 0
                ? <Box sx={{ textAlign: 'center', py: 4 }}><Typography variant="body2" color="text.secondary">No entries yet. Add the first log entry above.</Typography></Box>
                : (
                  <Stack spacing={0}>
                    {timeline.map((item, idx) => {
                      const isLast = idx === timeline.length - 1;

                      if (item.type === 'entry' && item.entry) {
                        const entry = item.entry;
                        return (
                          <Box key={item.id}>
                            {editingEntry?.id === entry.id ? (
                              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, my: 0.5 }}>
                                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
                                  <TextField label="Time" type="time" size="small" sx={{ width: 120 }} value={editEntryForm.entryTime} onChange={(e) => setEditEntryForm((p) => ({ ...p, entryTime: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
                                  <TextField size="small" fullWidth multiline maxRows={6} value={editEntryForm.entryText} onChange={(e) => setEditEntryForm((p) => ({ ...p, entryText: e.target.value }))} />
                                  <Stack spacing={0.5}>
                                    <Button size="small" variant="contained" onClick={handleSaveEntry} disabled={savingEntry} startIcon={savingEntry ? <CircularProgress size={12} color="inherit" /> : <Save />}>Save</Button>
                                    <Button size="small" variant="outlined" onClick={() => setEditingEntry(null)} disabled={savingEntry}>Cancel</Button>
                                  </Stack>
                                </Stack>
                              </Paper>
                            ) : (
                              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, py: 1, px: 0.5, borderBottom: isLast ? 'none' : '1px solid', borderColor: 'divider', '&:hover .entry-actions': { opacity: 1 } }}>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#B71C1C', minWidth: 50, pt: 0.1, fontSize: 13 }}>{entry.entryTime}</Typography>
                                <Typography variant="body2" sx={{ flex: 1, lineHeight: 1.6 }}>{entry.entryText}</Typography>
                                <Stack direction="row" className="entry-actions" sx={{ opacity: 0, transition: 'opacity 0.15s', alignItems: 'center' }}>
                                  <Typography variant="caption" color="text.disabled" sx={{ mr: 0.5 }}>{entry.createdByName}</Typography>
                                  {canEdit && <Tooltip title="Edit"><IconButton size="small" onClick={() => { setEditingEntry(entry); setEditEntryForm({ entryTime: entry.entryTime, entryText: entry.entryText }); }}><Edit sx={{ fontSize: 14 }} /></IconButton></Tooltip>}
                                  {canDelete && <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setDeleteEntry(entry)}><Delete sx={{ fontSize: 14 }} /></IconButton></Tooltip>}
                                </Stack>
                              </Box>
                            )}
                          </Box>
                        );
                      }

                      if (item.type === 'condition' && item.condition) {
                        const cond = item.condition;
                        const expanded = expandedConditions.has(cond.id);
                        const totalUnits = cond.rows.reduce((s, r) => s + (r.numberOfUnits ?? 0), 0);
                        const totalLoad = cond.rows.reduce((s, r) => s + (r.totalLoadMw ?? 0), 0);
                        return (
                          <Box key={item.id} sx={{ borderBottom: isLast ? 'none' : '1px solid', borderColor: 'divider', py: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 0.5, py: 0.5, cursor: 'pointer', '&:hover .cond-actions': { opacity: 1 } }}
                              onClick={() => setExpandedConditions((prev) => { const next = new Set(prev); next.has(cond.id) ? next.delete(cond.id) : next.add(cond.id); return next; })}>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#1B5E20', minWidth: 50, fontSize: 13 }}>{cond.snapshotTime}</Typography>
                              <Chip label="System Conditions" size="small" color="success" variant="outlined" sx={{ fontWeight: 700, fontSize: 11 }} />
                              {cond.source && <Typography variant="caption" color="text.secondary">from {cond.source}</Typography>}
                              <Typography variant="caption" sx={{ color: '#1B5E20', fontWeight: 600 }}>{totalUnits} units · {totalLoad.toFixed(1)} MW</Typography>
                              {cond.systemVoltageKv && <Typography variant="caption" color="text.secondary">· {cond.systemVoltageKv}kV</Typography>}
                              <Box sx={{ flex: 1 }} />
                              <Stack direction="row" className="cond-actions" sx={{ opacity: 0, transition: 'opacity 0.15s' }} onClick={(e) => e.stopPropagation()}>
                                {canEdit && <Tooltip title="Edit"><IconButton size="small" onClick={() => { setEditingCondition(cond); setConditionForm({ snapshotTime: cond.snapshotTime, source: cond.source ?? '', systemVoltageKv: cond.systemVoltageKv?.toString() ?? '', remarks: cond.remarks ?? '', rows: cond.rows.map((r) => ({ plantCode: r.plantCode ?? '', plantName: r.plantName, numberOfUnits: r.numberOfUnits?.toString() ?? '', totalLoadMw: r.totalLoadMw?.toString() ?? '', sortOrder: r.sortOrder })) }); setShowConditionForm(true); }}><Edit sx={{ fontSize: 14 }} /></IconButton></Tooltip>}
                                {canDelete && <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setDeleteCondition(cond)}><Delete sx={{ fontSize: 14 }} /></IconButton></Tooltip>}
                              </Stack>
                              <IconButton size="small">{expanded ? <ExpandLess sx={{ fontSize: 16 }} /> : <ExpandMore sx={{ fontSize: 16 }} />}</IconButton>
                            </Box>
                            <Collapse in={expanded}>
                              <Box sx={{ ml: 8, mb: 1 }}>
                                {cond.remarks && <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>{cond.remarks}</Typography>}
                                <Table size="small">
                                  <TableHead><TableRow sx={{ backgroundColor: '#E8F5E9' }}><TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Station</TableCell><TableCell align="center" sx={{ fontWeight: 700, fontSize: 12 }}>Units</TableCell><TableCell align="right" sx={{ fontWeight: 700, fontSize: 12 }}>Load (MW)</TableCell></TableRow></TableHead>
                                  <TableBody>
                                    {cond.rows.map((row) => (<TableRow key={row.id}><TableCell sx={{ fontSize: 12 }}>{row.plantName}</TableCell><TableCell align="center" sx={{ fontSize: 12 }}>{row.numberOfUnits ?? '—'}</TableCell><TableCell align="right" sx={{ fontSize: 12 }}>{row.totalLoadMw?.toFixed(1) ?? '—'}</TableCell></TableRow>))}
                                    <TableRow sx={{ backgroundColor: '#E8F5E9' }}><TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Total</TableCell><TableCell align="center" sx={{ fontWeight: 700, fontSize: 12 }}>{totalUnits}</TableCell><TableCell align="right" sx={{ fontWeight: 700, fontSize: 12 }}>{totalLoad.toFixed(1)}</TableCell></TableRow>
                                  </TableBody>
                                </Table>
                              </Box>
                            </Collapse>
                          </Box>
                        );
                      }

                      if (item.type === 'gasreading' && item.gasReading) {
                        const reading = item.gasReading;
                        const expanded = expandedGasReadings.has(reading.id);
                        return (
                          <Box key={item.id} sx={{ borderBottom: isLast ? 'none' : '1px solid', borderColor: 'divider', py: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 0.5, py: 0.5, cursor: 'pointer', '&:hover .gas-actions': { opacity: 1 } }}
                              onClick={() => setExpandedGasReadings((prev) => { const next = new Set(prev); next.has(reading.id) ? next.delete(reading.id) : next.add(reading.id); return next; })}>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#E65100', minWidth: 50, fontSize: 13 }}>{reading.readingTime}</Typography>
                              <Chip label="Gas Reading" size="small" sx={{ fontWeight: 700, fontSize: 11, color: '#E65100', borderColor: '#E65100' }} variant="outlined" />
                              {reading.source && <Typography variant="caption" color="text.secondary">from {reading.source}</Typography>}
                              <Typography variant="caption" sx={{ color: '#E65100', fontWeight: 600 }}>{reading.rows.length} terminals</Typography>
                              <Box sx={{ flex: 1 }} />
                              <Stack direction="row" className="gas-actions" sx={{ opacity: 0, transition: 'opacity 0.15s' }} onClick={(e) => e.stopPropagation()}>
                                {canEdit && <Tooltip title="Edit"><IconButton size="small" onClick={() => { setEditingGasReading(reading); setGasReadingForm({ readingTime: reading.readingTime, source: reading.source ?? '', rows: reading.rows.map((r) => ({ terminal: r.terminal, inletPressureBar: r.inletPressureBar?.toString() ?? '', outletPressureBar: r.outletPressureBar?.toString() ?? '', flowRateMmscf: r.flowRateMmscf?.toString() ?? '', sortOrder: r.sortOrder })) }); setShowGasReadingForm(true); }}><Edit sx={{ fontSize: 14 }} /></IconButton></Tooltip>}
                                {canDelete && <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setDeleteGasReading(reading)}><Delete sx={{ fontSize: 14 }} /></IconButton></Tooltip>}
                              </Stack>
                              <IconButton size="small">{expanded ? <ExpandLess sx={{ fontSize: 16 }} /> : <ExpandMore sx={{ fontSize: 16 }} />}</IconButton>
                            </Box>
                            <Collapse in={expanded}>
                              <Box sx={{ ml: 8, mb: 1 }}>
                                <Table size="small">
                                  <TableHead><TableRow sx={{ backgroundColor: '#FFF3E0' }}><TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Terminal</TableCell><TableCell align="right" sx={{ fontWeight: 700, fontSize: 12 }}>Inlet (bar)</TableCell><TableCell align="right" sx={{ fontWeight: 700, fontSize: 12 }}>Outlet (bar)</TableCell><TableCell align="right" sx={{ fontWeight: 700, fontSize: 12 }}>Flow (MMScf/D)</TableCell></TableRow></TableHead>
                                  <TableBody>
                                    {reading.rows.map((row) => (<TableRow key={row.id}><TableCell sx={{ fontSize: 12 }}>{row.terminal}</TableCell><TableCell align="right" sx={{ fontSize: 12 }}>{row.inletPressureBar?.toFixed(1) ?? '—'}</TableCell><TableCell align="right" sx={{ fontSize: 12 }}>{row.outletPressureBar?.toFixed(1) ?? '—'}</TableCell><TableCell align="right" sx={{ fontSize: 12 }}>{row.flowRateMmscf?.toFixed(2) ?? '—'}</TableCell></TableRow>))}
                                  </TableBody>
                                </Table>
                              </Box>
                            </Collapse>
                          </Box>
                        );
                      }

                      if (item.type === 'handover') {
                        return (
                          <Box key={item.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, py: 1, px: 0.5, borderBottom: isLast ? 'none' : '1px solid', borderColor: 'divider', backgroundColor: '#F3F6FF' }}>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#1565C0', minWidth: 50, pt: 0.1, fontSize: 13 }}>{item.time}</Typography>
                            <Chip label="Handover" size="small" color="primary" variant="outlined" sx={{ fontWeight: 700, fontSize: 11 }} />
                            <Typography variant="body2" sx={{ flex: 1, lineHeight: 1.6, color: item.handoverType === 'incoming' ? '#1B5E20' : '#B71C1C', fontStyle: 'italic' }}>{item.handoverText}</Typography>
                          </Box>
                        );
                      }
                      return null;
                    })}
                  </Stack>
                )}
            </CardContent>
          </Card>

          {/* ── End of Day Summary ── */}
          <Card sx={{ mb: 2 }}>
            <Box sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', backgroundColor: '#1B5E2014', borderBottom: summaryCollapsed ? 'none' : '1px solid', borderColor: 'divider' }} onClick={() => setSummaryCollapsed((p) => !p)}>
              <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#1B5E20' }}>End of Day Summary</Typography>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                {canEdit && !summaryEditing && (<Tooltip title="Edit summary"><IconButton size="small" onClick={(e) => { e.stopPropagation(); setSummaryEditing(true); }}><Edit fontSize="small" /></IconButton></Tooltip>)}
                <IconButton size="small">{summaryCollapsed ? <ExpandMore fontSize="small" /> : <ExpandLess fontSize="small" />}</IconButton>
              </Stack>
            </Box>
            <Collapse in={!summaryCollapsed}>
              <CardContent>
                {summarySaveSuccess && <Alert severity="success" onClose={() => setSummarySaveSuccess(false)} sx={{ mb: 2 }}>Summary saved successfully.</Alert>}
                {summarySaveError && <Alert severity="error" onClose={() => setSummarySaveError(null)} sx={{ mb: 2 }}>{summarySaveError}</Alert>}

                {/* Fixed top-level fields */}
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#1B5E20', mb: 1.5, display: 'block' }}>Generation Totals</Typography>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField label="Total Generation" type="number" fullWidth size="small" value={totalGenerationMwh} onChange={(e) => setTotalGenerationMwh(e.target.value)} disabled={!canEdit || !summaryEditing} slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">MWh</Typography> } }} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField label="Station Service" type="number" fullWidth size="small" value={totalStationServiceMwh} onChange={(e) => setTotalStationServiceMwh(e.target.value)} disabled={!canEdit || !summaryEditing} slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">MWh</Typography> } }} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField label="Net Generation" type="number" fullWidth size="small" value={netGenerationMwh} onChange={(e) => setNetGenerationMwh(e.target.value)} disabled={!canEdit || !summaryEditing} slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">MWh</Typography> } }} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 5 }}>
                    <TextField label="Total Gas Consumed" type="number" fullWidth size="small" value={totalGasConsumed} onChange={(e) => setTotalGasConsumed(e.target.value)} disabled={!canEdit || !summaryEditing} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <FormControl fullWidth size="small" disabled={!canEdit || !summaryEditing}>
                      <InputLabel>Gas Unit</InputLabel>
                      <Select label="Gas Unit" value={totalGasConsumedUnit} onChange={(e) => setTotalGasConsumedUnit(e.target.value)}>
                        <MenuItem value="MMScf">MMScf</MenuItem>
                        <MenuItem value="MMScfd">MMScfd</MenuItem>
                        <MenuItem value="Sm³">Sm³</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField label="Liquid Fuel Consumed" type="number" fullWidth size="small" value={totalLiquidFuelConsumedMt} onChange={(e) => setTotalLiquidFuelConsumedMt(e.target.value)} disabled={!canEdit || !summaryEditing} slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">MT</Typography> } }} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField label="Reactive Energy Generated" type="number" fullWidth size="small" value={reactiveEnergyGeneratedVarh} onChange={(e) => setReactiveEnergyGeneratedVarh(e.target.value)} disabled={!canEdit || !summaryEditing} slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">VARh</Typography> } }} />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField label="Notes" fullWidth size="small" multiline maxRows={3} value={generationNotes} onChange={(e) => setGenerationNotes(e.target.value)} disabled={!canEdit || !summaryEditing} placeholder="Any additional generation notes..." />
                  </Grid>
                </Grid>
                {summaryEditing && canEdit && (
                  <Stack direction="row" spacing={1.5} sx={{ mb: 3 }}>
                    <Button variant="outlined" size="small" onClick={() => { setSummaryEditing(false); populateHeader(log); }} disabled={savingSummary}>Cancel</Button>
                    <Button variant="contained" size="small" onClick={handleSaveSummary} disabled={savingSummary} startIcon={savingSummary ? <CircularProgress size={14} color="inherit" /> : <Save />} sx={{ backgroundColor: '#1B5E20' }}>
                      {savingSummary ? 'Saving...' : 'Save Totals'}
                    </Button>
                  </Stack>
                )}

                <Divider sx={{ mb: 2 }} />

                {/* Per-unit breakdown rows */}
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#1B5E20', mb: 1.5, display: 'block' }}>Per-Unit Breakdown</Typography>
                {generationRowsSaveSuccess && <Alert severity="success" onClose={() => setGenerationRowsSaveSuccess(false)} sx={{ mb: 1.5 }}>Breakdown saved.</Alert>}
                {generationRowsSaveError && <Alert severity="error" onClose={() => setGenerationRowsSaveError(null)} sx={{ mb: 1.5 }}>{generationRowsSaveError}</Alert>}
                <Table size="small" sx={{ mb: 1.5 }}>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#E8F5E9' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                      <TableCell sx={{ fontWeight: 700, width: 160 }}>Value</TableCell>
                      <TableCell sx={{ fontWeight: 700, width: 120 }}>Unit</TableCell>
                      {canEdit && <TableCell sx={{ width: 40 }} />}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {generationRows.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <FormControl size="small" fullWidth disabled={!canEdit}>
                            <Select
                              value={row.description}
                              displayEmpty
                              onChange={(e) => { const r = [...generationRows]; r[idx] = { ...r[idx], description: e.target.value }; setGenerationRows(r); }}
                              renderValue={(val) => val || <em style={{ color: '#999' }}>Select unit or enter description…</em>}
                            >
                              {plantUnits.length > 0 && (
                                <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 0.5, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>
                                  Plant Units
                                </Typography>
                              )}
                              {plantUnits.map((u) => (
                                <MenuItem key={u.unitCode} value={u.unitName}>
                                  <Chip label={u.unitCode} size="small" variant="outlined" sx={{ mr: 1, fontFamily: 'monospace', fontSize: 11 }} />
                                  {u.unitName}
                                </MenuItem>
                              ))}

                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell><TextField size="small" type="number" fullWidth value={row.value} disabled={!canEdit} onChange={(e) => { const r = [...generationRows]; r[idx] = { ...r[idx], value: e.target.value }; setGenerationRows(r); }} /></TableCell>
                        <TableCell>
                          <FormControl size="small" fullWidth disabled={!canEdit}>
                            <Select value={row.unit} onChange={(e) => { const r = [...generationRows]; r[idx] = { ...r[idx], unit: e.target.value }; setGenerationRows(r); }}>
                              <MenuItem value="kWh">kWh</MenuItem>
                              <MenuItem value="MWh">MWh</MenuItem>
                            </Select>
                          </FormControl>
                        </TableCell>
                        {canEdit && <TableCell><IconButton size="small" color="error" onClick={() => setGenerationRows((p) => p.filter((_, i) => i !== idx))}><Delete sx={{ fontSize: 16 }} /></IconButton></TableCell>}
                      </TableRow>
                    ))}
                    {generationRows.length === 0 && <TableRow><TableCell colSpan={4} align="center" sx={{ py: 2, color: '#999', fontStyle: 'italic' }}>No per-unit breakdown rows yet</TableCell></TableRow>}
                  </TableBody>
                </Table>
                {canEdit && (
                  <Stack direction="row" spacing={1.5}>
                    <Button size="small" variant="outlined" startIcon={<Add />} sx={{ color: '#1B5E20', borderColor: '#1B5E20' }} onClick={() => setGenerationRows((p) => [...p, { ...emptyGenerationRow, sortOrder: p.length }])}>Add Row</Button>
                    <Box sx={{ flex: 1 }} />
                    <Button size="small" variant="contained" sx={{ backgroundColor: '#1B5E20' }} onClick={handleSaveGenerationRows} disabled={savingGenerationRows} startIcon={savingGenerationRows ? <CircularProgress size={14} color="inherit" /> : <Save />}>
                      {savingGenerationRows ? 'Saving...' : 'Save Breakdown'}
                    </Button>
                  </Stack>
                )}
              </CardContent>
            </Collapse>
          </Card>

          {/* ── Ambient Conditions ── */}
          {log.showAmbientConditions && (
            <Card sx={{ mb: 2 }}>
              <Box sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', backgroundColor: '#0277BD14', borderBottom: ambientCollapsed ? 'none' : '1px solid', borderColor: 'divider' }} onClick={() => setAmbientCollapsed((p) => !p)}>
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#0277BD' }}>Ambient Conditions</Typography>
                <IconButton size="small">{ambientCollapsed ? <ExpandMore fontSize="small" /> : <ExpandLess fontSize="small" />}</IconButton>
              </Box>
              <Collapse in={!ambientCollapsed}>
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField label="Air Temperature" type="number" fullWidth size="small" value={ambientTempC} onChange={(e) => setAmbientTempC(e.target.value)} disabled={!canEdit} slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">°C</Typography> } }} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField label="Air Pressure" type="number" fullWidth size="small" value={ambientPressureMbar} onChange={(e) => setAmbientPressureMbar(e.target.value)} disabled={!canEdit} slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">mbar</Typography> } }} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField label="Relative Humidity" type="number" fullWidth size="small" value={relativeHumidityPct} onChange={(e) => setRelativeHumidityPct(e.target.value)} disabled={!canEdit} slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">%RH</Typography> } }} />
                    </Grid>
                  </Grid>
                  {headerError && <Alert severity="error" onClose={() => setHeaderError(null)} sx={{ mt: 1.5 }}>{headerError}</Alert>}
                  {canEdit && (
                    <Button size="small" variant="contained" sx={{ mt: 2, backgroundColor: '#0277BD' }} onClick={handleSaveAmbientConditions} disabled={savingHeader} startIcon={savingHeader ? <CircularProgress size={14} color="inherit" /> : <Save />}>
                      {savingHeader ? 'Saving...' : 'Save Ambient Conditions'}
                    </Button>
                  )}
                </CardContent>
              </Collapse>
            </Card>
          )}

          {/* ── HSE Entries ── */}
          {log.showHseEntries && (
            <Card sx={{ mb: 2 }}>
              <Box sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', backgroundColor: '#2E7D3214', borderBottom: hseCollapsed ? 'none' : '1px solid', borderColor: 'divider' }} onClick={() => setHseCollapsed((p) => !p)}>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#2E7D32' }}>HSE Entries</Typography>
                  <Chip label={`${log.hseEntries.length}`} size="small" variant="outlined" sx={{ color: '#2E7D32', borderColor: '#2E7D32' }} />
                </Stack>
                <IconButton size="small">{hseCollapsed ? <ExpandMore fontSize="small" /> : <ExpandLess fontSize="small" />}</IconButton>
              </Box>
              <Collapse in={!hseCollapsed}>
                <CardContent>
                  {hseEntryError && <Alert severity="error" onClose={() => setHseEntryError(null)} sx={{ mb: 2 }}>{hseEntryError}</Alert>}
                  {canCreate && (
                    <Paper variant="outlined" sx={{ p: 1.5, mb: 2, borderRadius: 2, backgroundColor: '#F8F9FA' }}>
                      <Grid container spacing={1.5} sx={{ mb: 1 }}>
                        <Grid size={{ xs: 6, sm: 3 }}>
                          <TextField label="Date" type="date" size="small" fullWidth value={hseEntryForm.entryDate} onChange={(e) => setHseEntryForm((p) => ({ ...p, entryDate: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 2 }}>
                          <TextField label="Time" type="time" size="small" fullWidth value={hseEntryForm.entryTime} onChange={(e) => setHseEntryForm((p) => ({ ...p, entryTime: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 5 }}>
                          <TextField label="Description" size="small" fullWidth value={hseEntryForm.description} onChange={(e) => setHseEntryForm((p) => ({ ...p, description: e.target.value }))} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 2 }}>
                          <TextField label="WO Raised" size="small" fullWidth value={hseEntryForm.workOrderRaised} onChange={(e) => setHseEntryForm((p) => ({ ...p, workOrderRaised: e.target.value }))} />
                        </Grid>
                      </Grid>
                      <Button size="small" variant="contained" sx={{ backgroundColor: '#2E7D32' }} startIcon={addingHseEntry ? <CircularProgress size={14} color="inherit" /> : <Add />} onClick={handleAddHseEntry} disabled={addingHseEntry || !hseEntryForm.description.trim()}>
                        {addingHseEntry ? '...' : 'Add HSE Entry'}
                      </Button>
                    </Paper>
                  )}
                  {log.hseEntries.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2, fontStyle: 'italic' }}>No HSE entries recorded.</Typography>
                  ) : (
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#E8F5E9' }}>
                          <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Date</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Time</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Description</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>WO Raised</TableCell>
                          <TableCell align="right" sx={{ width: 80 }} />
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {log.hseEntries.map((entry) => (
                          <TableRow key={entry.id} hover>
                            {editingHseEntry?.id === entry.id ? (
                              <>
                                <TableCell><TextField size="small" type="date" value={editHseEntryForm.entryDate} onChange={(e) => setEditHseEntryForm((p) => ({ ...p, entryDate: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} /></TableCell>
                                <TableCell><TextField size="small" type="time" value={editHseEntryForm.entryTime} onChange={(e) => setEditHseEntryForm((p) => ({ ...p, entryTime: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} /></TableCell>
                                <TableCell><TextField size="small" fullWidth value={editHseEntryForm.description} onChange={(e) => setEditHseEntryForm((p) => ({ ...p, description: e.target.value }))} /></TableCell>
                                <TableCell><TextField size="small" value={editHseEntryForm.workOrderRaised} onChange={(e) => setEditHseEntryForm((p) => ({ ...p, workOrderRaised: e.target.value }))} /></TableCell>
                                <TableCell align="right">
                                  <Button size="small" variant="contained" onClick={handleSaveHseEntry} disabled={savingHseEntry} sx={{ mr: 0.5 }}>Save</Button>
                                  <Button size="small" variant="outlined" onClick={() => setEditingHseEntry(null)}>Cancel</Button>
                                </TableCell>
                              </>
                            ) : (
                              <>
                                <TableCell sx={{ fontSize: 12 }}>{entry.entryDate ?? '—'}</TableCell>
                                <TableCell sx={{ fontSize: 12 }}>{entry.entryTime ?? '—'}</TableCell>
                                <TableCell sx={{ fontSize: 12 }}>{entry.description}</TableCell>
                                <TableCell sx={{ fontSize: 12 }}>{entry.workOrderRaised ?? '—'}</TableCell>
                                <TableCell align="right">
                                  {canEdit && <Tooltip title="Edit"><IconButton size="small" onClick={() => { setEditingHseEntry(entry); setEditHseEntryForm({ entryDate: entry.entryDate ?? '', entryTime: entry.entryTime ?? '', description: entry.description, workOrderRaised: entry.workOrderRaised ?? '' }); }}><Edit sx={{ fontSize: 14 }} /></IconButton></Tooltip>}
                                  {canDelete && <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setDeleteHseEntry(entry)}><Delete sx={{ fontSize: 14 }} /></IconButton></Tooltip>}
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Collapse>
            </Card>
          )}

          {/* ── Fuel Oil Tanks ── */}
          {log.showFuelOilTanks && (
            <Card sx={{ mb: 2 }}>
              <Box sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', backgroundColor: '#E6510014', borderBottom: fuelOilCollapsed ? 'none' : '1px solid', borderColor: 'divider' }} onClick={() => setFuelOilCollapsed((p) => !p)}>
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#E65100' }}>Fuel Oil Tank Levels</Typography>
                <IconButton size="small">{fuelOilCollapsed ? <ExpandMore fontSize="small" /> : <ExpandLess fontSize="small" />}</IconButton>
              </Box>
              <Collapse in={!fuelOilCollapsed}>
                <CardContent>
                  {fuelOilSaveSuccess && <Alert severity="success" onClose={() => setFuelOilSaveSuccess(false)} sx={{ mb: 2 }}>Fuel oil tanks saved successfully.</Alert>}
                  {fuelOilSaveError && <Alert severity="error" onClose={() => setFuelOilSaveError(null)} sx={{ mb: 2 }}>{fuelOilSaveError}</Alert>}
                  <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center' }}>
                    <TextField label="Reading Time" type="time" size="small" sx={{ width: 150 }}
                      value={fuelOilReadingTime} onChange={(e) => setFuelOilReadingTime(e.target.value)}
                      disabled={!canEdit} slotProps={{ inputLabel: { shrink: true } }} />
                    <Typography variant="caption" color="text.secondary">Time this reading was taken</Typography>
                  </Stack>
                  <Table size="small" sx={{ mb: 1.5 }}>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#FFF3E0' }}>
                        <TableCell sx={{ fontWeight: 700 }}>Tank Name</TableCell>
                        <TableCell sx={{ fontWeight: 700, width: 130 }}>DCS Reading (m)</TableCell>
                        <TableCell sx={{ fontWeight: 700, width: 130 }}>Actual Dip (m)</TableCell>
                        <TableCell sx={{ fontWeight: 700, width: 130 }}>Days of Stock</TableCell>
                        {canEdit && <TableCell sx={{ width: 40 }} />}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {fuelOilTankRows.map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell><TextField size="small" fullWidth value={row.tankName} disabled={!canEdit} onChange={(e) => { const r = [...fuelOilTankRows]; r[idx] = { ...r[idx], tankName: e.target.value }; setFuelOilTankRows(r); }} placeholder="e.g. Treated Tank 1" /></TableCell>
                          <TableCell><TextField size="small" type="number" fullWidth value={row.dcsReadingM} disabled={!canEdit} onChange={(e) => { const r = [...fuelOilTankRows]; r[idx] = { ...r[idx], dcsReadingM: e.target.value }; setFuelOilTankRows(r); }} slotProps={{ htmlInput: { step: 0.001 } }} /></TableCell>
                          <TableCell><TextField size="small" type="number" fullWidth value={row.actualDipM} disabled={!canEdit} onChange={(e) => { const r = [...fuelOilTankRows]; r[idx] = { ...r[idx], actualDipM: e.target.value }; setFuelOilTankRows(r); }} slotProps={{ htmlInput: { step: 0.001 } }} /></TableCell>
                          <TableCell><TextField size="small" type="number" fullWidth value={row.daysOfStock} disabled={!canEdit} onChange={(e) => { const r = [...fuelOilTankRows]; r[idx] = { ...r[idx], daysOfStock: e.target.value }; setFuelOilTankRows(r); }} slotProps={{ htmlInput: { step: 0.01 } }} /></TableCell>
                          {canEdit && <TableCell><IconButton size="small" color="error" onClick={() => setFuelOilTankRows((p) => p.filter((_, i) => i !== idx))}><Delete sx={{ fontSize: 16 }} /></IconButton></TableCell>}
                        </TableRow>
                      ))}
                      {fuelOilTankRows.length === 0 && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 2, color: '#999', fontStyle: 'italic' }}>No tanks added yet</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                  {canEdit && (
                    <Stack direction="row" spacing={1.5}>
                      <Button size="small" variant="outlined" startIcon={<Add />} sx={{ color: '#E65100', borderColor: '#E65100' }} onClick={() => setFuelOilTankRows((p) => [...p, { ...emptyFuelOilTankRow, sortOrder: p.length }])}>Add Tank</Button>
                      <Box sx={{ flex: 1 }} />
                      <Button size="small" variant="contained" sx={{ backgroundColor: '#E65100' }} onClick={handleSaveFuelOilTanks} disabled={savingFuelOilTanks} startIcon={savingFuelOilTanks ? <CircularProgress size={14} color="inherit" /> : <Save />}>
                        {savingFuelOilTanks ? 'Saving...' : 'Save Tanks'}
                      </Button>
                    </Stack>
                  )}
                </CardContent>
              </Collapse>
            </Card>
          )}

          {/* ── Gas Conditioning ── */}
          {log.showGasConditioning && (
            <Card sx={{ mb: 2 }}>
              <Box sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', backgroundColor: '#4A148C14', borderBottom: gasConditioningCollapsed ? 'none' : '1px solid', borderColor: 'divider' }} onClick={() => setGasConditioningCollapsed((p) => !p)}>
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#4A148C' }}>Gas Conditioning System</Typography>
                <IconButton size="small">{gasConditioningCollapsed ? <ExpandMore fontSize="small" /> : <ExpandLess fontSize="small" />}</IconButton>
              </Box>
              <Collapse in={!gasConditioningCollapsed}>
                <CardContent>
                  {gasCondSaveSuccess && <Alert severity="success" onClose={() => setGasCondSaveSuccess(false)} sx={{ mb: 2 }}>Gas conditioning saved successfully.</Alert>}
                  {gasCondSaveError && <Alert severity="error" onClose={() => setGasCondSaveError(null)} sx={{ mb: 2 }}>{gasCondSaveError}</Alert>}
                  <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center' }}>
                    <TextField label="Reading Time" type="time" size="small" sx={{ width: 150 }}
                      value={gasCondReadingTime} onChange={(e) => setGasCondReadingTime(e.target.value)}
                      disabled={!canEdit} slotProps={{ inputLabel: { shrink: true } }} />
                    <Typography variant="caption" color="text.secondary">Time this reading was taken</Typography>
                  </Stack>
                  <Table size="small" sx={{ mb: 1.5 }}>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#F3E5F5' }}>
                        <TableCell sx={{ fontWeight: 700 }}>Component</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 700, width: 110 }}>Inlet Temp (°C)</TableCell>
                        <TableCell sx={{ fontWeight: 700, width: 110 }}>On-Base Temp (°C)</TableCell>
                        <TableCell sx={{ fontWeight: 700, width: 110 }}>Inlet P (bar)</TableCell>
                        <TableCell sx={{ fontWeight: 700, width: 110 }}>On-Base P (bar)</TableCell>
                        {canEdit && <TableCell sx={{ width: 40 }} />}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {gasConditioningRows.map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell><TextField size="small" fullWidth value={row.componentName} disabled={!canEdit} onChange={(e) => { const r = [...gasConditioningRows]; r[idx] = { ...r[idx], componentName: e.target.value }; setGasConditioningRows(r); }} placeholder="e.g. Separator" /></TableCell>
                          <TableCell><TextField size="small" fullWidth value={row.status} disabled={!canEdit} onChange={(e) => { const r = [...gasConditioningRows]; r[idx] = { ...r[idx], status: e.target.value }; setGasConditioningRows(r); }} placeholder="e.g. In service" /></TableCell>
                          <TableCell><TextField size="small" type="number" fullWidth value={row.inletTempC} disabled={!canEdit} onChange={(e) => { const r = [...gasConditioningRows]; r[idx] = { ...r[idx], inletTempC: e.target.value }; setGasConditioningRows(r); }} /></TableCell>
                          <TableCell><TextField size="small" type="number" fullWidth value={row.onBaseTempC} disabled={!canEdit} onChange={(e) => { const r = [...gasConditioningRows]; r[idx] = { ...r[idx], onBaseTempC: e.target.value }; setGasConditioningRows(r); }} /></TableCell>
                          <TableCell><TextField size="small" type="number" fullWidth value={row.inletPressureBar} disabled={!canEdit} onChange={(e) => { const r = [...gasConditioningRows]; r[idx] = { ...r[idx], inletPressureBar: e.target.value }; setGasConditioningRows(r); }} /></TableCell>
                          <TableCell><TextField size="small" type="number" fullWidth value={row.onBasePressureBar} disabled={!canEdit} onChange={(e) => { const r = [...gasConditioningRows]; r[idx] = { ...r[idx], onBasePressureBar: e.target.value }; setGasConditioningRows(r); }} /></TableCell>
                          {canEdit && <TableCell><IconButton size="small" color="error" onClick={() => setGasConditioningRows((p) => p.filter((_, i) => i !== idx))}><Delete sx={{ fontSize: 16 }} /></IconButton></TableCell>}
                        </TableRow>
                      ))}
                      {gasConditioningRows.length === 0 && <TableRow><TableCell colSpan={7} align="center" sx={{ py: 2, color: '#999', fontStyle: 'italic' }}>No components added yet</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                  {canEdit && (
                    <Stack direction="row" spacing={1.5}>
                      <Button size="small" variant="outlined" startIcon={<Add />} sx={{ color: '#4A148C', borderColor: '#4A148C' }} onClick={() => setGasConditioningRows((p) => [...p, { ...emptyGasConditioningRow, sortOrder: p.length }])}>Add Component</Button>
                      <Box sx={{ flex: 1 }} />
                      <Button size="small" variant="contained" sx={{ backgroundColor: '#4A148C' }} onClick={handleSaveGasConditioning} disabled={savingGasConditioning} startIcon={savingGasConditioning ? <CircularProgress size={14} color="inherit" /> : <Save />}>
                        {savingGasConditioning ? 'Saving...' : 'Save Gas Conditioning'}
                      </Button>
                    </Stack>
                  )}
                </CardContent>
              </Collapse>
            </Card>
          )}

          {/* ── Water Treatment ── */}
          {log.showWaterTreatment && (
            <Card sx={{ mb: 2 }}>
              <Box sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', backgroundColor: '#01579B14', borderBottom: waterTreatmentCollapsed ? 'none' : '1px solid', borderColor: 'divider' }} onClick={() => setWaterTreatmentCollapsed((p) => !p)}>
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#01579B' }}>Water Storage & Treatment</Typography>
                <IconButton size="small">{waterTreatmentCollapsed ? <ExpandMore fontSize="small" /> : <ExpandLess fontSize="small" />}</IconButton>
              </Box>
              <Collapse in={!waterTreatmentCollapsed}>
                <CardContent>
                  {waterSaveSuccess && <Alert severity="success" onClose={() => setWaterSaveSuccess(false)} sx={{ mb: 2 }}>Water treatment saved successfully.</Alert>}
                  {waterSaveError && <Alert severity="error" onClose={() => setWaterSaveError(null)} sx={{ mb: 2 }}>{waterSaveError}</Alert>}
                  <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center' }}>
                    <TextField label="Reading Time" type="time" size="small" sx={{ width: 150 }}
                      value={waterReadingTime} onChange={(e) => setWaterReadingTime(e.target.value)}
                      disabled={!canEdit} slotProps={{ inputLabel: { shrink: true } }} />
                    <Typography variant="caption" color="text.secondary">Time this reading was taken</Typography>
                  </Stack>
                  <Table size="small" sx={{ mb: 1.5 }}>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#E1F5FE' }}>
                        <TableCell sx={{ fontWeight: 700 }}>Tank / System</TableCell>
                        <TableCell sx={{ fontWeight: 700, width: 120 }}>Level</TableCell>
                        <TableCell sx={{ fontWeight: 700, width: 90 }}>Unit</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                        {canEdit && <TableCell sx={{ width: 40 }} />}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {waterTreatmentRows.map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell><TextField size="small" fullWidth value={row.tankOrSystem} disabled={!canEdit} onChange={(e) => { const r = [...waterTreatmentRows]; r[idx] = { ...r[idx], tankOrSystem: e.target.value }; setWaterTreatmentRows(r); }} placeholder="e.g. Fresh Water Tank" /></TableCell>
                          <TableCell><TextField size="small" type="number" fullWidth value={row.level} disabled={!canEdit} onChange={(e) => { const r = [...waterTreatmentRows]; r[idx] = { ...r[idx], level: e.target.value }; setWaterTreatmentRows(r); }} slotProps={{ htmlInput: { step: 0.001 } }} /></TableCell>
                          <TableCell>
                            <FormControl size="small" fullWidth disabled={!canEdit}>
                              <Select value={row.unit} onChange={(e) => { const r = [...waterTreatmentRows]; r[idx] = { ...r[idx], unit: e.target.value }; setWaterTreatmentRows(r); }}>
                                <MenuItem value="m">m</MenuItem>
                                <MenuItem value="%">%</MenuItem>
                              </Select>
                            </FormControl>
                          </TableCell>
                          <TableCell><TextField size="small" fullWidth value={row.status} disabled={!canEdit} onChange={(e) => { const r = [...waterTreatmentRows]; r[idx] = { ...r[idx], status: e.target.value }; setWaterTreatmentRows(r); }} placeholder="e.g. Normal" /></TableCell>
                          {canEdit && <TableCell><IconButton size="small" color="error" onClick={() => setWaterTreatmentRows((p) => p.filter((_, i) => i !== idx))}><Delete sx={{ fontSize: 16 }} /></IconButton></TableCell>}
                        </TableRow>
                      ))}
                      {waterTreatmentRows.length === 0 && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 2, color: '#999', fontStyle: 'italic' }}>No tanks/systems added yet</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                  {canEdit && (
                    <Stack direction="row" spacing={1.5}>
                      <Button size="small" variant="outlined" startIcon={<Add />} sx={{ color: '#01579B', borderColor: '#01579B' }} onClick={() => setWaterTreatmentRows((p) => [...p, { ...emptyWaterTreatmentRow, sortOrder: p.length }])}>Add Row</Button>
                      <Box sx={{ flex: 1 }} />
                      <Button size="small" variant="contained" sx={{ backgroundColor: '#01579B' }} onClick={handleSaveWaterTreatment} disabled={savingWaterTreatment} startIcon={savingWaterTreatment ? <CircularProgress size={14} color="inherit" /> : <Save />}>
                        {savingWaterTreatment ? 'Saving...' : 'Save Water Treatment'}
                      </Button>
                    </Stack>
                  )}
                </CardContent>
              </Collapse>
            </Card>
          )}

          {/* ── Shift Information ── */}
          <Card sx={{ mb: 2 }}>
            <Box sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', backgroundColor: '#1565C014', borderBottom: shiftCollapsed ? 'none' : '1px solid', borderColor: 'divider' }} onClick={() => setShiftCollapsed((p) => !p)}>
              <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#1565C0' }}>Shift Information</Typography>
              <IconButton size="small">{shiftCollapsed ? <ExpandMore fontSize="small" /> : <ExpandLess fontSize="small" />}</IconButton>
            </Box>
            <Collapse in={!shiftCollapsed}>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>{renderShiftCard('DAY', dayShiftForm, setDayShiftForm, savingDayShift, dayShiftError, () => setDayShiftError(null))}</Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>{renderShiftCard('NIGHT', nightShiftForm, setNightShiftForm, savingNightShift, nightShiftError, () => setNightShiftError(null))}</Grid>
                </Grid>
              </CardContent>
            </Collapse>
          </Card>

          {/* ── Critical Issues ── */}
          <Card sx={{ mb: 2 }}>
            <Box sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', backgroundColor: '#B71C1C14', borderBottom: criticalIssuesCollapsed ? 'none' : '1px solid', borderColor: 'divider' }} onClick={() => setCriticalIssuesCollapsed((p) => !p)}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#B71C1C' }}>Critical Issues ({criticalIssues.length})</Typography>
                {criticalIssues.some((i) => i.status === 'Open') && (
                  <Chip label={`${criticalIssues.filter((i) => i.status === 'Open').length} Open`} size="small" color="error" />
                )}
              </Stack>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                {canCreate && (<Tooltip title="Add issue"><IconButton size="small" onClick={(e) => { e.stopPropagation(); setEditingCriticalIssue(null); setCriticalIssueForm(emptyCriticalIssueForm); setShowCriticalIssueForm(true); }}><Add fontSize="small" /></IconButton></Tooltip>)}
                <IconButton size="small">{criticalIssuesCollapsed ? <ExpandMore fontSize="small" /> : <ExpandLess fontSize="small" />}</IconButton>
              </Stack>
            </Box>
            <Collapse in={!criticalIssuesCollapsed}>
              <CardContent>
                {criticalIssueError && <Alert severity="error" onClose={() => setCriticalIssueError(null)} sx={{ mb: 2 }}>{criticalIssueError}</Alert>}
                {showCriticalIssueForm && (
                  <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2, borderColor: '#B71C1C', backgroundColor: '#FFEBEE' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#B71C1C', mb: 1.5 }}>{editingCriticalIssue ? 'Edit Critical Issue' : 'New Critical Issue'}</Typography>
                    <Grid container spacing={1.5}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Autocomplete freeSolo options={[...allPumpEquipments, ...allTransformerEquipments]}
                          getOptionLabel={(opt) => typeof opt === 'string' ? opt : `${opt.equipmentName} (${opt.equipmentCode})`}
                          value={criticalIssueForm.equipmentName}
                          onChange={(_, newValue) => { if (newValue && typeof newValue !== 'string') setCriticalIssueForm((p) => ({ ...p, equipmentCode: newValue.equipmentCode, equipmentName: newValue.equipmentName })); }}
                          onInputChange={(_, newInputValue, reason) => setCriticalIssueForm((p) => ({ ...p, equipmentName: newInputValue, ...(reason === 'input' ? { equipmentCode: '' } : {}) }))}
                          renderInput={(params) => <TextField {...params} label="Equipment" size="small" fullWidth />} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField label="Date Observed" type="date" size="small" fullWidth value={criticalIssueForm.dateObserved} onChange={(e) => setCriticalIssueForm((p) => ({ ...p, dateObserved: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField label="Description of Fault" size="small" fullWidth required multiline rows={2} value={criticalIssueForm.descriptionOfFault} onChange={(e) => setCriticalIssueForm((p) => ({ ...p, descriptionOfFault: e.target.value }))} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Risk Involved</InputLabel>
                          <Select label="Risk Involved" value={criticalIssueForm.riskInvolved} onChange={(e) => setCriticalIssueForm((p) => ({ ...p, riskInvolved: e.target.value }))}>
                            <MenuItem value=""><em>Not specified</em></MenuItem>
                            <MenuItem value="Low">Low</MenuItem>
                            <MenuItem value="Medium">Medium</MenuItem>
                            <MenuItem value="High">High</MenuItem>
                            <MenuItem value="Severe">Severe</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 8 }}>
                        <TextField label="Impact" size="small" fullWidth multiline rows={2} value={criticalIssueForm.impact} onChange={(e) => setCriticalIssueForm((p) => ({ ...p, impact: e.target.value }))} />
                      </Grid>
                    </Grid>
                    <Stack direction="row" spacing={1.5} sx={{ mt: 1.5 }}>
                      <Button size="small" variant="outlined" onClick={() => { setShowCriticalIssueForm(false); setEditingCriticalIssue(null); }} disabled={savingCriticalIssue}>Cancel</Button>
                      <Button size="small" variant="contained" sx={{ backgroundColor: '#B71C1C' }} onClick={handleSaveCriticalIssue} disabled={savingCriticalIssue || !criticalIssueForm.descriptionOfFault.trim()}
                        startIcon={savingCriticalIssue ? <CircularProgress size={14} color="inherit" /> : <Save />}>
                        {savingCriticalIssue ? 'Saving...' : 'Save'}
                      </Button>
                    </Stack>
                  </Paper>
                )}
                {criticalIssues.length === 0 && !showCriticalIssueForm
                  ? <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2, fontStyle: 'italic' }}>No critical issues recorded.</Typography>
                  : (
                    <Stack spacing={1.5}>
                      {criticalIssues.map((issue) => (
                        <Paper key={issue.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                          <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start', flexWrap: 'wrap' }} useFlexGap>
                            {/* Left: equipment */}
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 160 }}>
                              <Chip label={issue.equipmentCode} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: 11 }} />
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>{issue.equipmentName}</Typography>
                            </Stack>
                            {/* Middle: date / description / risk / impact */}
                            <Box sx={{ flex: 1, minWidth: 220 }}>
                              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5, flexWrap: 'wrap' }} useFlexGap>
                                {issue.dateObserved && <Typography variant="caption" color="text.secondary">{new Date(issue.dateObserved).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</Typography>}
                                {issue.riskInvolved && (
                                  <Chip label={issue.riskInvolved} size="small" sx={{ ...(RISK_STYLES[issue.riskInvolved] ?? {}), fontWeight: 700 }} />
                                )}
                              </Stack>
                              <Typography variant="body2" sx={{ mb: 0.5 }}>{issue.descriptionOfFault}</Typography>
                              {issue.impact && <Typography variant="caption" color="text.secondary">Impact: {issue.impact}</Typography>}
                            </Box>
                            {/* Right: status + actions */}
                            <Stack spacing={1} sx={{ alignItems: 'flex-end', minWidth: 140 }}>
                              <Chip label={issue.status} size="small" color={issue.status === 'Open' ? 'error' : 'success'} />
                              {issue.status === 'Resolved' && issue.resolvedOn && (
                                <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right' }}>
                                  {new Date(issue.resolvedOn).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} by {issue.resolvedBy}
                                </Typography>
                              )}
                              <Stack direction="row" spacing={1}>
                                {canEdit && (
                                  <Button size="small" onClick={() => { setEditingCriticalIssue(issue); setCriticalIssueForm({ equipmentCode: issue.equipmentCode, equipmentName: issue.equipmentName, dateObserved: issue.dateObserved?.split('T')[0] ?? '', descriptionOfFault: issue.descriptionOfFault, riskInvolved: issue.riskInvolved ?? '', impact: issue.impact ?? '', status: issue.status, resolvedOn: issue.resolvedOn ?? '', resolvedBy: issue.resolvedBy ?? '' }); setShowCriticalIssueForm(true); }}>Edit</Button>
                                )}
                                {canEdit && issue.status === 'Open' && (
                                  <Button size="small" color="success" onClick={() => handleMarkIssueResolved(issue)}>Mark Resolved</Button>
                                )}
                                {canDelete && (
                                  <Button size="small" color="error" onClick={() => setDeleteCriticalIssue(issue)}>Delete</Button>
                                )}
                              </Stack>
                            </Stack>
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>
                  )}
              </CardContent>
            </Collapse>
          </Card>

          {/* ── Oversight Conditions ── */}
          {currentPlant?.oversightPlantCode && (
            <Card sx={{ mb: 2 }}>
              <Box sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', backgroundColor: '#4A148C14', borderBottom: oversightCollapsed ? 'none' : '1px solid', borderColor: 'divider' }} onClick={() => setOversightCollapsed((p) => !p)}>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#4A148C' }}>
                    {currentPlant.oversightPlantName || currentPlant.oversightPlantCode} Conditions
                  </Typography>
                  <Chip label={`${oversightEntries.length}`} size="small" variant="outlined" sx={{ color: '#4A148C', borderColor: '#4A148C' }} />
                </Stack>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  {canCreate && (<Tooltip title="Add entry"><IconButton size="small" onClick={(e) => { e.stopPropagation(); setEditingOversightEntry(null); setOversightForm({ entryDate: new Date().toISOString().split('T')[0], entryTime: new Date().toTimeString().slice(0, 5), entryText: '' }); setShowOversightForm(true); }}><Add fontSize="small" /></IconButton></Tooltip>)}
                  <IconButton size="small">{oversightCollapsed ? <ExpandMore fontSize="small" /> : <ExpandLess fontSize="small" />}</IconButton>
                </Stack>
              </Box>
              <Collapse in={!oversightCollapsed}>
                <CardContent>
                  {oversightError && <Alert severity="error" onClose={() => setOversightError(null)} sx={{ mb: 2 }}>{oversightError}</Alert>}
                  {showOversightForm && (
                    <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2, borderColor: '#4A148C', backgroundColor: '#F3E5F5' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#4A148C', mb: 1.5 }}>{editingOversightEntry ? 'Edit Entry' : 'New Entry'}</Typography>
                      <Grid container spacing={1.5}>
                        <Grid size={{ xs: 6, sm: 3 }}><TextField label="Date" type="date" size="small" fullWidth value={oversightForm.entryDate} onChange={(e) => setOversightForm((p) => ({ ...p, entryDate: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
                        <Grid size={{ xs: 6, sm: 3 }}><TextField label="Time" type="time" size="small" fullWidth value={oversightForm.entryTime} onChange={(e) => setOversightForm((p) => ({ ...p, entryTime: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
                        <Grid size={{ xs: 12, sm: 6 }}><TextField label="Condition / Observation" size="small" fullWidth required multiline rows={2} value={oversightForm.entryText} onChange={(e) => setOversightForm((p) => ({ ...p, entryText: e.target.value }))} /></Grid>
                      </Grid>
                      <Stack direction="row" spacing={1.5} sx={{ mt: 1.5 }}>
                        <Button size="small" variant="outlined" onClick={() => { setShowOversightForm(false); setEditingOversightEntry(null); }} disabled={savingOversightEntry}>Cancel</Button>
                        <Button size="small" variant="contained" sx={{ backgroundColor: '#4A148C' }} onClick={handleSaveOversightEntry} disabled={savingOversightEntry || !oversightForm.entryText.trim()}
                          startIcon={savingOversightEntry ? <CircularProgress size={14} color="inherit" /> : <Save />}>
                          {savingOversightEntry ? 'Saving...' : 'Save'}
                        </Button>
                      </Stack>
                    </Paper>
                  )}
                  {oversightEntries.length === 0 && !showOversightForm
                    ? <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2, fontStyle: 'italic' }}>No entries recorded.</Typography>
                    : (
                      <Stack spacing={0}>
                        {oversightEntries.map((entry, idx) => (
                          <Box key={entry.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, py: 1, px: 0.5, borderBottom: idx === oversightEntries.length - 1 ? 'none' : '1px solid', borderColor: 'divider', '&:hover .oversight-actions': { opacity: 1 } }}>
                            <Chip label={new Date(entry.entryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} size="small" variant="outlined" sx={{ minWidth: 72 }} />
                            <Chip label={entry.entryTime} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#4A148C', borderColor: '#4A148C' }} />
                            <Typography variant="body2" sx={{ flex: 1, lineHeight: 1.6 }}>{entry.entryText}</Typography>
                            <Stack direction="row" className="oversight-actions" sx={{ opacity: 0, transition: 'opacity 0.15s' }}>
                              {canEdit && <Tooltip title="Edit"><IconButton size="small" onClick={() => { setEditingOversightEntry(entry); setOversightForm({ entryDate: entry.entryDate.split('T')[0], entryTime: entry.entryTime, entryText: entry.entryText }); setShowOversightForm(true); }}><Edit sx={{ fontSize: 14 }} /></IconButton></Tooltip>}
                              {canDelete && <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setDeleteOversightEntry(entry)}><Delete sx={{ fontSize: 14 }} /></IconButton></Tooltip>}
                            </Stack>
                          </Box>
                        ))}
                      </Stack>
                    )}
                </CardContent>
              </Collapse>
            </Card>
          )}

          {/* ── Optional Sections Enabler ── */}
          {canEdit && (
            <Card sx={{ mb: 2 }}>
              <CardContent sx={{ py: '14px !important' }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
                  <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', mr: 1 }}>
                    Enable sections:
                  </Typography>
                  {!log.showAmbientConditions && (
                    <Button size="small" variant="outlined" onClick={() => handleToggleSection('showAmbientConditions')}>+ Ambient Conditions</Button>
                  )}
                  {!log.showHseEntries && (
                    <Button size="small" variant="outlined" onClick={() => handleToggleSection('showHseEntries')}>+ HSE Entries</Button>
                  )}
                  {!log.showFuelOilTanks && (
                    <Button size="small" variant="outlined" onClick={() => handleToggleSection('showFuelOilTanks')}>+ Fuel Oil Tanks</Button>
                  )}
                  {!log.showGasConditioning && (
                    <Button size="small" variant="outlined" onClick={() => handleToggleSection('showGasConditioning')}>+ Gas Conditioning</Button>
                  )}
                  {!log.showWaterTreatment && (
                    <Button size="small" variant="outlined" onClick={() => handleToggleSection('showWaterTreatment')}>+ Water Treatment</Button>
                  )}
                  {log.showAmbientConditions && log.showHseEntries && log.showFuelOilTanks && log.showGasConditioning && log.showWaterTreatment && (
                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>All sections enabled</Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          )}

        </>
      )}

      <ConfirmDialog open={!!deleteEntry} title="Delete Log Entry" message={`Delete the entry at ${deleteEntry?.entryTime}?`} confirmLabel="Delete" loading={deletingEntry} onConfirm={handleDeleteEntry} onCancel={() => setDeleteEntry(null)} />
      <ConfirmDialog open={!!deleteSafetyDoc} title="Delete Safety Document" message={`Delete safety document ${deleteSafetyDoc?.docNumber ?? ''}?`} confirmLabel="Delete" loading={deletingSafetyDoc} onConfirm={handleDeleteSafetyDoc} onCancel={() => setDeleteSafetyDoc(null)} />
      <ConfirmDialog open={!!deleteCondition} title="Delete System Conditions Snapshot" message={`Delete the snapshot at ${deleteCondition?.snapshotTime}?`} confirmLabel="Delete" loading={deletingCondition} onConfirm={handleDeleteCondition} onCancel={() => setDeleteCondition(null)} />
      <ConfirmDialog open={!!deleteHseEntry} title="Delete HSE Entry"
        message={`Delete this HSE entry?`}
        confirmLabel="Delete" loading={deletingHseEntry}
        onConfirm={handleDeleteHseEntry} onCancel={() => setDeleteHseEntry(null)} />
      <ConfirmDialog open={!!deleteGasReading} title="Delete Gas Reading" message={`Delete the gas reading at ${deleteGasReading?.readingTime}?`} confirmLabel="Delete" loading={deletingGasReading} onConfirm={handleDeleteGasReading} onCancel={() => setDeleteGasReading(null)} />
      <ConfirmDialog open={!!deleteCriticalIssue} title="Delete Critical Issue" message={`Delete this critical issue for ${deleteCriticalIssue?.equipmentName}?`} confirmLabel="Delete" loading={deletingCriticalIssue} onConfirm={handleDeleteCriticalIssue} onCancel={() => setDeleteCriticalIssue(null)} />
      <ConfirmDialog open={!!deleteOversightEntry} title="Delete Entry" message={`Delete this entry at ${deleteOversightEntry?.entryTime}?`} confirmLabel="Delete" loading={deletingOversightEntry} onConfirm={handleDeleteOversightEntry} onCancel={() => setDeleteOversightEntry(null)} />
    </Box>
  );
}
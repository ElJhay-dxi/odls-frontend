import {
  Box, Card, CardContent, CardHeader, TextField, Button, CircularProgress,
  Alert, Typography, MenuItem, FormControl, InputLabel, Select,
  Grid, Divider, Chip, Stack, Paper, IconButton, Tooltip, Collapse,
  OutlinedInput, Checkbox, ListItemText, Table, TableBody, TableCell,
  TableHead, TableRow,
} from '@mui/material';
import {
  Save, Edit, Delete, Add, WaterDrop, ExpandMore, ExpandLess,
  Assignment, CheckCircle, TableChart,
} from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { plantUnitApi } from '../../api/masterData/plantUnitApi';
import { plantBusApi } from '../../api/hourly/hourlyBusVoltageApi';
import { hydroStationLogApi } from '../../api/stationLog/hydroStationLogApi';
import { safetyDocumentTypeApi } from '../../api/masterData/safetyDocumentTypeApi';
import { shiftLogApi } from '../../api/stationLog/shiftLogApi';
import type { PowerPlant, PlantUnit } from '../../types/masterData';
import type { PlantBus } from '../../types/plantBus';
import type {
  HydroStationLog, HydroStationLogEntry, HydroStationLogCondition,
  HydroStationLogPermit, HydroStationLogPermitForm,
  HydroGenerationRowForm,
  UpdateHydroStationLogForm, CreateHydroStationLogEntryForm,
  UpdateHydroStationLogEntryForm, CreateConditionForm, ConditionRowForm,
  SaveStationLogUnitOutputItem,
} from '../../types/hydroStationLog';
import type { SafetyDocumentType } from '../../types/safetyDocumentType';
import type { ShiftLog } from '../../types/shiftLog';
import { useSectionPermissions, usePlantFilter } from '../../hooks/usePermission';
import { useUser } from '../../context/UserContext';

const emptyEntry = (): CreateHydroStationLogEntryForm => ({
  entryTime: new Date().toTimeString().slice(0, 5),
  entryText: '',
});

const emptyCondition = (): CreateConditionForm => ({
  snapshotTime: new Date().toTimeString().slice(0, 5),
  source: '',
  systemVoltageKv: '',
  rows: [],
});

const TEXT_HEADER_FIELDS = [
  { key: 'stationService',        label: 'Station Service' },
  { key: 'applicationsForOutage', label: 'Applications for Outage' },
  { key: 'miscNotes',             label: 'Miscellaneous Notes' },
] as const;

type TextHeaderKey = typeof TEXT_HEADER_FIELDS[number]['key'];
type TimelineItemType = 'entry' | 'condition' | 'handover';

interface TimelineItem {
  id: string;
  time: string;
  type: TimelineItemType;
  entry?: HydroStationLogEntry;
  condition?: HydroStationLogCondition;
  handoverText?: string;
  handoverType?: 'incoming' | 'outgoing';
}

const toArray = (val?: string) => val ? val.split(',').map((s) => s.trim()).filter(Boolean) : [];
const toStr = (arr: string[]) => arr.join(', ');

export default function HydroStationLogPage() {
  const { canCreate, canEdit, canDelete } = useSectionPermissions('station_logs.hydro');
  const { isPlantUser, userPlantClassifications } = useUser();
  const navigate = useNavigate();
  const isWrongPlantType = isPlantUser && userPlantClassifications.length > 0
    && !userPlantClassifications.includes('hydro');

  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const [permitTypes, setPermitTypes] = useState<SafetyDocumentType[]>([]);
  const { availablePlants, plantLocked, autoPlantCode } = usePlantFilter(plants);
  const [allPlants, setAllPlants] = useState<PowerPlant[]>([]);
  const [plantUnits, setPlantUnits] = useState<PlantUnit[]>([]);
  const [plantBuses, setPlantBuses] = useState<PlantBus[]>([]);

  const [selectedPlant, setSelectedPlant] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [log, setLog] = useState<HydroStationLog | null>(null);
  const [shiftHandovers, setShiftHandovers] = useState<ShiftLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creatingLog, setCreatingLog] = useState(false);

  // Header
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [selectedBuses, setSelectedBuses] = useState<string[]>([]);
  const [headerTextForm, setHeaderTextForm] = useState<Pick<UpdateHydroStationLogForm,
    'stationService' | 'permitsInEffect' | 'applicationsForOutage' | 'miscNotes'>>({
    stationService: '', permitsInEffect: '', applicationsForOutage: '', miscNotes: '',
  });
  const [headerEditing, setHeaderEditing] = useState(false);
  const [savingHeader, setSavingHeader] = useState(false);
  const [headerError, setHeaderError] = useState<string | null>(null);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);

  // Permits
  const emptyPermitForm: HydroStationLogPermitForm = {
    permitTypeCode: '', permitTypeName: '', permitNumber: '', workOrderNumber: '', eamNumber: '',
    permitHolder: '', workDescription: '', startDate: '', completionDate: '', sortOrder: 0,
  };
  const [permitForm, setPermitForm] = useState<HydroStationLogPermitForm>(emptyPermitForm);
  const [editingPermit, setEditingPermit] = useState<HydroStationLogPermit | null>(null);
  const [showPermitForm, setShowPermitForm] = useState(false);
  const [savingPermit, setSavingPermit] = useState(false);
  const [deletePermit, setDeletePermit] = useState<HydroStationLogPermit | null>(null);
  const [deletingPermit, setDeletingPermit] = useState(false);
  const [permitError, setPermitError] = useState<string | null>(null);
  const [permitsCollapsed, setPermitsCollapsed] = useState(false);

  // Entry
  const [entryForm, setEntryForm] = useState<CreateHydroStationLogEntryForm>(emptyEntry());
  const [addingEntry, setAddingEntry] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<HydroStationLogEntry | null>(null);
  const [editEntryForm, setEditEntryForm] = useState<UpdateHydroStationLogEntryForm>({ entryTime: '', entryText: '' });
  const [savingEntry, setSavingEntry] = useState(false);
  const [deleteEntry, setDeleteEntry] = useState<HydroStationLogEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState(false);

  // Condition snapshot
  const [showConditionForm, setShowConditionForm] = useState(false);
  const [conditionForm, setConditionForm] = useState<CreateConditionForm>(emptyCondition());
  const [savingCondition, setSavingCondition] = useState(false);
  const [conditionError, setConditionError] = useState<string | null>(null);
  const [editingCondition, setEditingCondition] = useState<HydroStationLogCondition | null>(null);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [deleteCondition, setDeleteCondition] = useState<HydroStationLogCondition | null>(null);
  const [deletingCondition, setDeletingCondition] = useState(false);
  const [expandedConditions, setExpandedConditions] = useState<Set<string>>(new Set());

  // Summary
  const [summaryEditing, setSummaryEditing] = useState(false);
  const [summaryForm, setSummaryForm] = useState({ energyGeneratedKwh: '', shiftLeaderName: '' });
  const [savingSummary, setSavingSummary] = useState(false);
  const [summaryCollapsed, setSummaryCollapsed] = useState(false);
  const [summarySaveSuccess, setSummarySaveSuccess] = useState(false);
  const [summarySaveError, setSummarySaveError] = useState<string | null>(null);
  const [totalGenerationMwh, setTotalGenerationMwh] = useState('');
  const [totalStationServiceMwh, setTotalStationServiceMwh] = useState('');
  const [netGenerationMwh, setNetGenerationMwh] = useState('');
  const [forebayLevelM, setForebayLevelM] = useState('');
  const [tailraceLevelM, setTailraceLevelM] = useState('');
  const [netHeadM, setNetHeadM] = useState('');
  const [generationNotes, setGenerationNotes] = useState('');
  const [generationRows, setGenerationRows] = useState<HydroGenerationRowForm[]>([]);
  const [savingGenerationRows, setSavingGenerationRows] = useState(false);
  const [generationRowsSaveSuccess, setGenerationRowsSaveSuccess] = useState(false);
  const [generationRowsSaveError, setGenerationRowsSaveError] = useState<string | null>(null);

  // Per-unit output
  const [unitOutputs, setUnitOutputs] = useState<SaveStationLogUnitOutputItem[]>([]);
  const [savingUnitOutputs, setSavingUnitOutputs] = useState(false);
  const [unitOutputsSaved, setUnitOutputsSaved] = useState(false);
  const [unitOutputsError, setUnitOutputsError] = useState<string | null>(null);

  useEffect(() => {
    safetyDocumentTypeApi.getAll({ activeOnly: true, classification: 'Hydro' }).then((res) => setPermitTypes(res.data));
    powerPlantApi.getAll().then((res) => {
      setAllPlants(res.data);
      setPlants(res.data.filter((p) => p.classificationType?.toLowerCase() === 'hydro'));
    });
  }, []);

  useEffect(() => {
    if (autoPlantCode) setSelectedPlant(autoPlantCode);
  }, [autoPlantCode]);

  useEffect(() => {
    if (!selectedPlant) { setPlantUnits([]); setPlantBuses([]); return; }
    plantUnitApi.getByPlant(selectedPlant).then((res) => setPlantUnits(res.data));
    plantBusApi.getAll(selectedPlant).then((res) => setPlantBuses(res.data));
  }, [selectedPlant]);

  useEffect(() => {
    if (!selectedPlant || !selectedDate) return;
    loadLog();
  }, [selectedPlant, selectedDate]);

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

  const populateHeaderState = (data: HydroStationLog) => {
    setSelectedUnits(toArray(data.unitsInService));
    setSelectedBuses(toArray(data.linesInService));
    setHeaderTextForm({
      stationService: data.stationService ?? '',
      permitsInEffect: data.permitsInEffect ?? '',
      applicationsForOutage: data.applicationsForOutage ?? '',
      miscNotes: data.miscNotes ?? '',
    });
    setSummaryForm({
      energyGeneratedKwh: data.energyGeneratedKwh?.toString() ?? '',
      shiftLeaderName: data.shiftLeaderName ?? '',
    });
    setTotalGenerationMwh(data.totalGenerationMwh?.toString() ?? '');
    setTotalStationServiceMwh(data.totalStationServiceMwh?.toString() ?? '');
    setNetGenerationMwh(data.netGenerationMwh?.toString() ?? '');
    setForebayLevelM(data.forebayLevelM?.toString() ?? '');
    setTailraceLevelM(data.tailraceLevelM?.toString() ?? '');
    setNetHeadM(data.netHeadM?.toString() ?? '');
    setGenerationNotes(data.generationNotes ?? '');
  };

  const loadLog = async () => {
    setLoading(true); setLoadError(null); setLog(null); setShiftHandovers([]);
    setUnitOutputs([]); setUnitOutputsSaved(false);
    try {
      // Previous day date string for fetching overnight shift
      const prevDate = new Date(selectedDate + 'T12:00:00');
      prevDate.setDate(prevDate.getDate() - 1);
      const prevDateStr = prevDate.toISOString().split('T')[0];

      const [logRes, handoverRes, prevHandoverRes] = await Promise.allSettled([
        hydroStationLogApi.getByDate(selectedPlant, selectedDate),
        shiftLogApi.getAll({ plantCode: selectedPlant, date: selectedDate }),
        shiftLogApi.getAll({ plantCode: selectedPlant, date: prevDateStr }),
      ]);

      if (logRes.status === 'fulfilled') {
        setLog(logRes.value.data);
        populateHeaderState(logRes.value.data);
        hydroStationLogApi.getUnitOutputs(logRes.value.data.id).then((res) => {
          setUnitOutputs(res.data.map((u) => ({
            unitCode: u.unitCode, unitName: u.unitName, unitStatus: u.unitStatus,
            outputMW: u.outputMW, outputMVAr: u.outputMVAr,
          })));
        }).catch(() => {});
      } else {
        const status = (logRes.reason as { response?: { status?: number } })?.response?.status;
        if (status !== 404) setLoadError('Failed to load station log.');
      }

      // Combine current day handovers + previous day's overnight shift (Hydro: C, Thermal: B)
      const currentHandovers = handoverRes.status === 'fulfilled' ? handoverRes.value.data : [];
      const prevHandovers = prevHandoverRes.status === 'fulfilled' ? prevHandoverRes.value.data : [];

      // From previous day, only include the overnight shift (last shift that covers midnight)
      // Include both C (hydro) and B (thermal) overnight shifts from prev day
      const overnightHandovers = prevHandovers.filter((h) =>
        h.shiftCode === 'C' || h.shiftCode === 'B'
      );

      setShiftHandovers([...currentHandovers, ...overnightHandovers]);
    } finally {
      setLoading(false);
    }
  };

  // Build merged timeline
  const handleSavePermit = async () => {
    if (!log) return;
    setSavingPermit(true); setPermitError(null);
    try {
      if (editingPermit) {
        const res = await hydroStationLogApi.updatePermit(log.id, editingPermit.id, permitForm);
        setLog((p) => p ? { ...p, permits: p.permits.map((d) => d.id === editingPermit.id ? res.data : d) } : p);
        setEditingPermit(null);
      } else {
        const res = await hydroStationLogApi.addPermit(log.id, { ...permitForm, sortOrder: log.permits.length });
        setLog((p) => p ? { ...p, permits: [...p.permits, res.data] } : p);
      }
      setPermitForm(emptyPermitForm); setShowPermitForm(false);
    } catch { setPermitError('Failed to save permit.'); }
    finally { setSavingPermit(false); }
  };

  const handleDeletePermit = async () => {
    if (!log || !deletePermit) return;
    setDeletingPermit(true);
    try {
      await hydroStationLogApi.deletePermit(log.id, deletePermit.id);
      setLog((p) => p ? { ...p, permits: p.permits.filter((d) => d.id !== deletePermit.id) } : p);
      setDeletePermit(null);
    } catch { setPermitError('Failed to delete permit.'); }
    finally { setDeletingPermit(false); }
  };

  const handleSaveSummaryTotals = async () => {
    if (!log) return;
    setSavingSummary(true); setSummarySaveSuccess(false); setSummarySaveError(null);
    try {
      const res = await hydroStationLogApi.update(log.id, {
        ...buildHeaderPayload(),
        energyGeneratedKwh: summaryForm.energyGeneratedKwh !== '' ? summaryForm.energyGeneratedKwh : null,
        shiftLeaderName: summaryForm.shiftLeaderName,
        totalGenerationMwh: totalGenerationMwh || null,
        totalStationServiceMwh: totalStationServiceMwh || null,
        netGenerationMwh: netGenerationMwh || null,
        forebayLevelM: forebayLevelM || null,
        tailraceLevelM: tailraceLevelM || null,
        netHeadM: netHeadM || null,
        generationNotes,
      });
      setLog(res.data); setSummaryEditing(false); setSummarySaveSuccess(true);
    } catch { setSummarySaveError('Failed to save summary.'); }
    finally { setSavingSummary(false); }
  };

  const handleSaveGenerationRows = async () => {
    if (!log) return;
    setSavingGenerationRows(true); setGenerationRowsSaveSuccess(false); setGenerationRowsSaveError(null);
    try {
      const res = await hydroStationLogApi.saveGenerationRows(log.id, generationRows);
      setLog((p) => p ? { ...p, generationRows: res.data } : p);
      setGenerationRowsSaveSuccess(true);
    } catch { setGenerationRowsSaveError('Failed to save breakdown rows.'); }
    finally { setSavingGenerationRows(false); }
  };

  const handleSaveUnitOutputs = async () => {
    if (!log) return;
    setSavingUnitOutputs(true); setUnitOutputsError(null);
    try {
      await hydroStationLogApi.saveUnitOutputs(log.id, unitOutputs);
      setUnitOutputsSaved(true);
    } catch { setUnitOutputsError('Failed to save unit outputs.'); }
    finally { setSavingUnitOutputs(false); }
  };

  const buildTimeline = (): TimelineItem[] => {
    const items: TimelineItem[] = [];

    // Regular entries
    (log?.entries ?? []).forEach((e) => items.push({ id: e.id, time: e.entryTime, type: 'entry', entry: e }));

    // Condition snapshots
    (log?.conditions ?? []).forEach((c) => items.push({ id: c.id, time: c.snapshotTime, type: 'condition', condition: c }));

    // Shift handovers — current day entries + previous day overnight shift at 00:00
    shiftHandovers.forEach((h) => {
      const handoverDate = h.logDate?.split('T')[0];
      const isCurrentDay = handoverDate === selectedDate;
      const isPrevDayOvernight = !isCurrentDay && (h.shiftCode === 'C' || h.shiftCode === 'B');

      if (!isCurrentDay && !isPrevDayOvernight) return;

      if (isPrevDayOvernight) {
        // Show overnight shift as opening entry at 00:00
        if (h.officers.length > 0) {
          items.push({
            id: `${h.id}-overnight`,
            time: '00:00',
            type: 'handover',
            handoverType: 'incoming',
            handoverText: `On duty (overnight): ${h.officers.map((o) => o.officerName).join(', ')}.`,
          });
        }
        return;
      }

      // Current day handovers
      if (h.officers.length > 0) {
        items.push({
          id: `${h.id}-in`,
          time: h.handoverTime,
          type: 'handover',
          handoverType: 'incoming',
          handoverText: `On duty: ${h.officers.map((o) => o.officerName).join(', ')}.`,
        });
      }
      // Outgoing officers — 1 min after handover time to keep order
      if (h.outgoingOfficers.length > 0) {
        const [hh, mm] = h.handoverTime.split(':').map(Number);
        const outTime = `${String(hh).padStart(2, '0')}:${String(Math.min(mm + 1, 59)).padStart(2, '0')}`;
        items.push({
          id: `${h.id}-out`,
          time: outTime,
          type: 'handover',
          handoverType: 'outgoing',
          handoverText: `Off duty: ${h.outgoingOfficers.map((o) => o.officerName).join(', ')}.`,
        });
      }
    });

    return items.sort((a, b) => a.time.localeCompare(b.time));
  };

  const handleCreateLog = async () => {
    setCreatingLog(true); setLoadError(null);
    try {
      await hydroStationLogApi.create({
        plantCode: selectedPlant, logDate: selectedDate,
        unitsInService: '', linesInService: '', stationService: '',
        permitsInEffect: '', applicationsForOutage: '', miscNotes: '',
      });
      await loadLog();
      setHeaderEditing(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setLoadError(msg ?? 'Failed to create station log.');
    } finally { setCreatingLog(false); }
  };

  const buildHeaderPayload = (): UpdateHydroStationLogForm => ({
    unitsInService: toStr(selectedUnits), linesInService: toStr(selectedBuses),
    ...headerTextForm,
    energyGeneratedKwh: log?.energyGeneratedKwh != null ? log.energyGeneratedKwh.toString() : null,
    shiftLeaderName: log?.shiftLeaderName ?? '',
    totalGenerationMwh: totalGenerationMwh || null,
    totalStationServiceMwh: totalStationServiceMwh || null,
    netGenerationMwh: netGenerationMwh || null,
    forebayLevelM: forebayLevelM || null,
    tailraceLevelM: tailraceLevelM || null,
    netHeadM: netHeadM || null,
    generationNotes,
  });

  const handleSaveHeader = async () => {
    if (!log) return;
    setSavingHeader(true); setHeaderError(null);
    try {
      const res = await hydroStationLogApi.update(log.id, buildHeaderPayload());
      setLog(res.data); populateHeaderState(res.data); setHeaderEditing(false);
    } catch { setHeaderError('Failed to save header.'); }
    finally { setSavingHeader(false); }
  };

  const handleAddEntry = async () => {
    if (!log || !entryForm.entryTime || !entryForm.entryText.trim()) return;
    setAddingEntry(true); setEntryError(null);
    try {
      const res = await hydroStationLogApi.addEntry(log.id, entryForm);
      setLog((prev) => prev ? {
        ...prev,
        entries: [...prev.entries, res.data].sort((a, b) => a.entryTime.localeCompare(b.entryTime)),
      } : prev);
      setEntryForm({ entryTime: new Date().toTimeString().slice(0, 5), entryText: '' });
    } catch { setEntryError('Failed to add entry.'); }
    finally { setAddingEntry(false); }
  };

  const handleSaveEntry = async () => {
    if (!log || !editingEntry) return;
    setSavingEntry(true);
    try {
      const res = await hydroStationLogApi.updateEntry(log.id, editingEntry.id, editEntryForm);
      setLog((prev) => prev ? {
        ...prev,
        entries: prev.entries.map((e) => e.id === editingEntry.id ? res.data : e)
          .sort((a, b) => a.entryTime.localeCompare(b.entryTime)),
      } : prev);
      setEditingEntry(null);
    } catch { setEntryError('Failed to update entry.'); }
    finally { setSavingEntry(false); }
  };

  const handleDeleteEntry = async () => {
    if (!log || !deleteEntry) return;
    setDeletingEntry(true);
    try {
      await hydroStationLogApi.deleteEntry(log.id, deleteEntry.id);
      setLog((prev) => prev ? { ...prev, entries: prev.entries.filter((e) => e.id !== deleteEntry.id) } : prev);
      setDeleteEntry(null);
    } catch { setEntryError('Failed to delete entry.'); }
    finally { setDeletingEntry(false); }
  };

  // Condition row helpers
  const addConditionRow = () => {
    setConditionForm((prev) => ({
      ...prev,
      rows: [...prev.rows, { plantCode: '', plantName: '', numberOfUnits: '', totalLoadMw: '', sortOrder: prev.rows.length }],
    }));
  };

  const removeConditionRow = (idx: number) => {
    setConditionForm((prev) => ({ ...prev, rows: prev.rows.filter((_, i) => i !== idx) }));
  };

  const updateConditionRow = (idx: number, field: keyof ConditionRowForm, value: string) => {
    setConditionForm((prev) => ({
      ...prev,
      rows: prev.rows.map((r, i) => i === idx ? { ...r, [field]: value } : r),
    }));
  };

  const openEditCondition = (c: HydroStationLogCondition) => {
    setEditingCondition(c);
    setConditionForm({
      snapshotTime: c.snapshotTime,
      source: c.source ?? '',
      systemVoltageKv: c.systemVoltageKv?.toString() ?? '',
      rows: c.rows.map((r) => ({
        plantCode: r.plantCode,
        plantName: r.plantName,
        numberOfUnits: r.numberOfUnits?.toString() ?? '',
        totalLoadMw: r.totalLoadMw?.toString() ?? '',
        sortOrder: r.sortOrder,
      })),
    });
    setShowConditionForm(true);
  };

  const parsePasteText = (text: string) => {
    const lines = text.trim().split('\n').filter((l) => l.trim());
    const parsed: { plantName: string; numberOfUnits: string; totalLoadMw: string }[] = [];

    for (const line of lines) {
      // Tab-separated (Excel copy) or multiple spaces
      const parts = line.split(/\t|  +/).map((p) => p.trim()).filter(Boolean);
      if (parts.length < 2) continue;
      const plantName = parts[0];
      // Skip header rows
      if (/^(station|plant|number|units|load)/i.test(plantName)) continue;
      // Units: second column — treat non-numeric (*** G1 G4 etc.) as blank
      const rawUnits = parts[1] ?? '';
      const numberOfUnits = /^\d+$/.test(rawUnits) ? rawUnits : '';
      // Load: third column
      const rawLoad = parts[2] ?? '';
      const totalLoadMw = /^\d+(\.\d+)?$/.test(rawLoad) ? rawLoad : '';
      if (plantName) parsed.push({ plantName, numberOfUnits, totalLoadMw });
    }

    // Fuzzy match paste station name against registered plants
    const fuzzyMatch = (pasteName: string) => {
      const lower = pasteName.toLowerCase();

      // 1. Extract station code from brackets e.g. "(KT67)" "(BU54)" "(AT91)"
      // This is the most reliable match — codes are unique
      const codeMatch = pasteName.match(/\(([A-Z]{2}\d{2,})\)/i);
      if (codeMatch) {
        const code = codeMatch[1].toUpperCase();
        const byCode = allPlants.find((pl) =>
          pl.plantCode.toUpperCase() === code ||
          pl.plantCode.toUpperCase().includes(code) ||
          code.includes(pl.plantCode.toUpperCase())
        );
        if (byCode) return byCode;
      }

      // 2. Exact plant name match (case insensitive)
      const byExact = allPlants.find((pl) =>
        pl.plantName.toLowerCase() === lower
      );
      if (byExact) return byExact;

      // 3. Paste name starts with plant name (e.g. "AKOSOMBO" matches "Akosombo Power Station")
      const byPrefix = allPlants.find((pl) => {
        const plLower = pl.plantName.toLowerCase();
        // Only match if the paste name is the beginning of the plant name or vice versa
        // and the matching portion is at least 5 chars to avoid false positives
        return (lower.length >= 5 && plLower.startsWith(lower)) ||
               (plLower.length >= 5 && lower.startsWith(plLower));
      });
      if (byPrefix) return byPrefix;

      return null;
    };

    // Match and deduplicate — each registered plant can only appear once
    const usedPlantCodes = new Set<string>();
    const rows = parsed
      .map((p) => ({ match: fuzzyMatch(p.plantName), p }))
      .filter(({ match }) => {
        if (!match) return false;
        if (usedPlantCodes.has(match.plantCode)) return false;
        usedPlantCodes.add(match.plantCode);
        return true;
      })
      .map(({ match, p }, idx) => ({
        plantCode: match!.plantCode,
        plantName: match!.plantName,
        numberOfUnits: p.numberOfUnits,
        totalLoadMw: p.totalLoadMw,
        sortOrder: idx,
      }));

    setConditionForm((prev) => ({ ...prev, rows }));
    setPasteMode(false);
    setPasteText('');
  };

  const handleSaveCondition = async () => {
    if (!log || !conditionForm.snapshotTime) return;
    setSavingCondition(true); setConditionError(null);
    try {
      if (editingCondition) {
        const res = await hydroStationLogApi.updateCondition(log.id, editingCondition.id, conditionForm);
        setLog((prev) => prev ? {
          ...prev,
          conditions: prev.conditions.map((c) => c.id === editingCondition.id ? res.data : c)
            .sort((a, b) => a.snapshotTime.localeCompare(b.snapshotTime)),
        } : prev);
        setEditingCondition(null);
      } else {
        const res = await hydroStationLogApi.addCondition(log.id, conditionForm);
        setLog((prev) => prev ? {
          ...prev,
          conditions: [...prev.conditions, res.data].sort((a, b) => a.snapshotTime.localeCompare(b.snapshotTime)),
        } : prev);
      }
      setConditionForm(emptyCondition());
      setShowConditionForm(false);
      setPasteMode(false);
      setPasteText('');
    } catch { setConditionError('Failed to save condition snapshot.'); }
    finally { setSavingCondition(false); }
  };

  const handleDeleteCondition = async () => {
    if (!log || !deleteCondition) return;
    setDeletingCondition(true);
    try {
      await hydroStationLogApi.deleteCondition(log.id, deleteCondition.id);
      setLog((prev) => prev ? { ...prev, conditions: prev.conditions.filter((c) => c.id !== deleteCondition.id) } : prev);
      setDeleteCondition(null);
    } catch { setEntryError('Failed to delete condition snapshot.'); }
    finally { setDeletingCondition(false); }
  };



  const getUnitName = (code: string) => plantUnits.find((u) => u.unitCode === code)?.unitName ?? code;
  const getBusName = (code: string) => plantBuses.find((b) => b.busCode === code)?.busName ?? code;
  const plantDisplayName = availablePlants.find((p) => p.plantCode === selectedPlant)?.plantName ?? selectedPlant;

  const timeline = log ? buildTimeline() : [];
  const totalEntries = (log?.entries.length ?? 0) + (log?.conditions.length ?? 0) + shiftHandovers.length;

  const renderMultiSelect = (
    label: string, items: { value: string; label: string }[],
    selected: string[], onChange: (val: string[]) => void, disabled?: boolean,
  ) => (
    <FormControl fullWidth size="small" disabled={disabled}>
      <InputLabel>{label}</InputLabel>
      <Select multiple value={selected}
        onChange={(e) => onChange(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
        input={<OutlinedInput label={label} />}
        renderValue={(sel) => sel.map((v) => items.find((i) => i.value === v)?.label ?? v).join(', ')}>
        {items.map((item) => (
          <MenuItem key={item.value} value={item.value}>
            <Checkbox checked={selected.includes(item.value)} />
            <ListItemText primary={item.label} />
          </MenuItem>
        ))}
      </Select>
      {selected.length > 0 && (
        <Stack direction="row" spacing={0.5} sx={{ mt: 0.75, flexWrap: 'wrap' }} useFlexGap>
          {selected.map((val) => (
            <Chip key={val} size="small" label={items.find((i) => i.value === val)?.label ?? val}
              onDelete={() => onChange(selected.filter((s) => s !== val))} />
          ))}
        </Stack>
      )}
    </FormControl>
  );

  return (
    <Box>
      <PageHeader
        title="Hydro Station Log"
        subtitle="Daily operational log for hydro power stations"
        breadcrumbs={[{ label: 'Station Logs' }, { label: 'Hydro Station Log' }]}
      />

      {isWrongPlantType && (
        <Alert severity="warning" sx={{ mb: 3 }}
          action={
            <Button color="warning" size="small" variant="outlined"
              onClick={() => navigate('/station-logs/thermal')}>
              Go to Thermal Station Log
            </Button>
          }>
          Your plant assignment is for a thermal plant. You may not have the right data here.
        </Alert>
      )}

      {/* Plant + Date Selector */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ py: '14px !important' }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <WaterDrop sx={{ color: '#1565C0' }} />
            <FormControl size="small" sx={{ minWidth: 240 }} disabled={plantLocked}>
              <InputLabel>Power Plant</InputLabel>
              <Select label="Power Plant" value={selectedPlant}
                onChange={(e) => setSelectedPlant(e.target.value)}>
                <MenuItem value="">Select plant…</MenuItem>
                {availablePlants.map((p: PowerPlant) => (
                  <MenuItem key={p.id} value={p.plantCode}>{p.plantName} ({p.plantCode})</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField label="Date" type="date" size="small" value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }} />
            {loading && <CircularProgress size={20} />}
            {log && !loading && (
              <Chip icon={<CheckCircle />} label="Log loaded" color="success" size="small" variant="outlined" />
            )}
          </Stack>
        </CardContent>
      </Card>

      {loadError && <Alert severity="error" onClose={() => setLoadError(null)} sx={{ mb: 2 }}>{loadError}</Alert>}

      {/* No log yet */}
      {!loading && !log && selectedPlant && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ textAlign: 'center', py: 5 }}>
            <Assignment sx={{ fontSize: '3rem', color: 'text.disabled', mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
              No station log for {plantDisplayName} on {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              Start the log for this date to begin recording entries.
            </Typography>
            {canCreate && (
              <Button variant="contained"
                startIcon={creatingLog ? <CircularProgress size={16} color="inherit" /> : <Add />}
                onClick={handleCreateLog} disabled={creatingLog}>
                {creatingLog ? 'Creating...' : 'Start Station Log'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {log && (
        <>
          {/* Opening Conditions Header */}
          <Card sx={{ mb: 2 }}>
            <Box sx={{
              px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer', backgroundColor: '#1565C014',
              borderBottom: headerCollapsed ? 'none' : '1px solid', borderColor: 'divider',
            }} onClick={() => setHeaderCollapsed((p) => !p)}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Typography variant="caption"
                  sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#1565C0' }}>
                  Opening Conditions — {new Date(log.logDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                </Typography>
                <Chip label={log.plantName} size="small" color="primary" variant="outlined" />
              </Stack>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                {canEdit && !headerEditing && (
                  <Tooltip title="Edit header">
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); setHeaderEditing(true); }}>
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                <IconButton size="small">
                  {headerCollapsed ? <ExpandMore fontSize="small" /> : <ExpandLess fontSize="small" />}
                </IconButton>
              </Stack>
            </Box>
            <Collapse in={!headerCollapsed}>
              <CardContent>
                {headerError && <Alert severity="error" onClose={() => setHeaderError(null)} sx={{ mb: 2 }}>{headerError}</Alert>}
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    {headerEditing ? renderMultiSelect(
                      'Units in Service',
                      plantUnits.map((u) => ({ value: u.unitCode, label: `${u.unitName} (${u.unitCode})` })),
                      selectedUnits, setSelectedUnits, plantUnits.length === 0,
                    ) : (
                      <Box>
                        <Typography variant="caption" color="text.secondary"
                          sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Units in Service
                        </Typography>
                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap' }} useFlexGap>
                          {toArray(log.unitsInService).length > 0
                            ? toArray(log.unitsInService).map((code) => (
                              <Chip key={code} label={getUnitName(code)} size="small" color="primary" variant="outlined" />
                            ))
                            : <Typography variant="body2" sx={{ fontStyle: 'italic', color: '#999' }}>Not specified</Typography>}
                        </Stack>
                      </Box>
                    )}
                  </Grid>

                  {unitOutputs.length > 0 && (
                    <Grid size={{ xs: 12 }}>
                      <Box sx={{ mt: 0 }}>
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

                  <Grid size={{ xs: 12, sm: 6 }}>
                    {headerEditing ? renderMultiSelect(
                      'Lines in Service',
                      plantBuses.map((b) => ({ value: b.busCode, label: `${b.busName} (${b.busCode})` })),
                      selectedBuses, setSelectedBuses, plantBuses.length === 0,
                    ) : (
                      <Box>
                        <Typography variant="caption" color="text.secondary"
                          sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Lines in Service
                        </Typography>
                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap' }} useFlexGap>
                          {toArray(log.linesInService).length > 0
                            ? toArray(log.linesInService).map((code) => (
                              <Chip key={code} label={getBusName(code)} size="small" color="secondary" variant="outlined" />
                            ))
                            : <Typography variant="body2" sx={{ fontStyle: 'italic', color: '#999' }}>Not specified</Typography>}
                        </Stack>
                      </Box>
                    )}
                  </Grid>
                  {TEXT_HEADER_FIELDS.map((field) => (
                    <Grid key={field.key} size={{ xs: 12, sm: 6 }}>
                      {headerEditing ? (
                        <TextField label={field.label} fullWidth multiline maxRows={3} size="small"
                          value={headerTextForm[field.key as TextHeaderKey]}
                          onChange={(e) => setHeaderTextForm((prev) => ({ ...prev, [field.key]: e.target.value }))} />
                      ) : (
                        <Box>
                          <Typography variant="caption" color="text.secondary"
                            sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            {field.label}
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 0.25 }}>
                            {(log as unknown as Record<string, string>)[field.key] ||
                              <span style={{ color: '#999', fontStyle: 'italic' }}>Not specified</span>}
                          </Typography>
                        </Box>
                      )}
                    </Grid>
                  ))}
                </Grid>
                {headerEditing && (
                  <Stack direction="row" spacing={1.5} sx={{ mt: 2.5 }}>
                    <Button variant="outlined" size="small"
                      onClick={() => { setHeaderEditing(false); populateHeaderState(log); }} disabled={savingHeader}>
                      Cancel
                    </Button>
                    <Button variant="contained" size="small" onClick={handleSaveHeader} disabled={savingHeader}
                      startIcon={savingHeader ? <CircularProgress size={14} color="inherit" /> : <Save />}>
                      {savingHeader ? 'Saving...' : 'Save Header'}
                    </Button>
                  </Stack>
                )}
              </CardContent>
            </Collapse>
          </Card>


          {/* ── Permits in Effect ── */}
          <Card sx={{ mb: 2 }}>
            <Box sx={{
              px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer', backgroundColor: '#E6510014',
              borderBottom: permitsCollapsed ? 'none' : '1px solid', borderColor: 'divider',
            }} onClick={() => setPermitsCollapsed((p) => !p)}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#E65100' }}>
                  Permits in Effect
                </Typography>
                <Chip label={`${log.permits.length}`} size="small" variant="outlined" sx={{ color: '#E65100', borderColor: '#E65100' }} />
              </Stack>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                {canCreate && (
                  <Tooltip title="Add permit">
                    <IconButton size="small" onClick={(e) => {
                      e.stopPropagation();
                      setEditingPermit(null); setPermitForm(emptyPermitForm); setShowPermitForm(true);
                    }}><Add fontSize="small" /></IconButton>
                  </Tooltip>
                )}
                <IconButton size="small">{permitsCollapsed ? <ExpandMore fontSize="small" /> : <ExpandLess fontSize="small" />}</IconButton>
              </Stack>
            </Box>
            <Collapse in={!permitsCollapsed}>
              <CardContent>
                {permitError && <Alert severity="error" onClose={() => setPermitError(null)} sx={{ mb: 2 }}>{permitError}</Alert>}
                {showPermitForm && (
                  <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2, borderColor: '#E65100', backgroundColor: '#FFF3E0' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#E65100', mb: 1.5 }}>
                      {editingPermit ? 'Edit Permit' : 'New Permit'}
                    </Typography>
                    <Grid container spacing={1.5}>
                      <Grid size={{ xs: 12 }}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Permit Type</InputLabel>
                          <Select label="Permit Type" value={permitForm.permitTypeCode}
                            onChange={(e) => {
                              const selected = permitTypes.find((t) => t.code === e.target.value);
                              setPermitForm((p) => ({ ...p, permitTypeCode: selected?.code ?? '', permitTypeName: selected?.name ?? '' }));
                            }}>
                            <MenuItem value=""><em>Select type…</em></MenuItem>
                            {permitTypes.map((t) => (
                              <MenuItem key={t.id} value={t.code}>
                                <Chip label={t.code} size="small" variant="outlined" sx={{ mr: 1, fontFamily: 'monospace', fontSize: 11 }} />
                                {t.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <TextField label="Permit #" size="small" fullWidth value={permitForm.permitNumber}
                          onChange={(e) => setPermitForm((p) => ({ ...p, permitNumber: e.target.value }))} placeholder="e.g. LWC #1864" />
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <TextField label="Work Order #" size="small" fullWidth value={permitForm.workOrderNumber}
                          onChange={(e) => setPermitForm((p) => ({ ...p, workOrderNumber: e.target.value }))} />
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <TextField label="EAM #" size="small" fullWidth value={permitForm.eamNumber}
                          onChange={(e) => setPermitForm((p) => ({ ...p, eamNumber: e.target.value }))} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField label="Permit Holder" size="small" fullWidth value={permitForm.permitHolder}
                          onChange={(e) => setPermitForm((p) => ({ ...p, permitHolder: e.target.value }))} />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField label="Description of Work" size="small" fullWidth multiline rows={2}
                          value={permitForm.workDescription}
                          onChange={(e) => setPermitForm((p) => ({ ...p, workDescription: e.target.value }))} />
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <TextField label="Start Date" type="date" size="small" fullWidth value={permitForm.startDate}
                          onChange={(e) => setPermitForm((p) => ({ ...p, startDate: e.target.value }))}
                          slotProps={{ inputLabel: { shrink: true } }} />
                      </Grid>
                      <Grid size={{ xs: 6, sm: 9 }}>
                        <TextField label="Completion Date / Status" size="small" fullWidth value={permitForm.completionDate}
                          onChange={(e) => setPermitForm((p) => ({ ...p, completionDate: e.target.value }))}
                          placeholder="e.g. Till work is completed" />
                      </Grid>
                    </Grid>
                    <Stack direction="row" spacing={1.5} sx={{ mt: 1.5 }}>
                      <Button size="small" variant="outlined" onClick={() => { setShowPermitForm(false); setEditingPermit(null); }} disabled={savingPermit}>Cancel</Button>
                      <Button size="small" variant="contained" sx={{ backgroundColor: '#E65100' }} onClick={handleSavePermit}
                        disabled={savingPermit} startIcon={savingPermit ? <CircularProgress size={14} color="inherit" /> : <Save />}>
                        {savingPermit ? 'Saving...' : 'Save'}
                      </Button>
                    </Stack>
                  </Paper>
                )}
                {log.permits.length === 0 && !showPermitForm ? (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2, fontStyle: 'italic' }}>
                    No permits in effect.
                  </Typography>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#FFF3E0' }}>
                        <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Permit #</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Work Order</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>EAM #</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Permit Holder</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Description</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Start</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Completion</TableCell>
                        <TableCell align="right" sx={{ width: 80 }} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {log.permits.map((permit) => (
                        <TableRow key={permit.id} hover>
                          <TableCell sx={{ fontSize: 12 }}>
                            {permit.permitTypeCode
                              ? <Chip label={permit.permitTypeCode} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: 11 }} />
                              : <Typography variant="caption" color="text.disabled">—</Typography>}
                          </TableCell>
                          <TableCell sx={{ fontSize: 12 }}>{permit.permitNumber ?? '—'}</TableCell>
                          <TableCell sx={{ fontSize: 12 }}>{permit.workOrderNumber ?? '—'}</TableCell>
                          <TableCell sx={{ fontSize: 12 }}>{permit.eamNumber ?? '—'}</TableCell>
                          <TableCell sx={{ fontSize: 12 }}>{permit.permitHolder ?? '—'}</TableCell>
                          <TableCell sx={{ fontSize: 12, maxWidth: 200 }}>{permit.workDescription ?? '—'}</TableCell>
                          <TableCell sx={{ fontSize: 12 }}>
                            {permit.startDate ? new Date(permit.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                          </TableCell>
                          <TableCell sx={{ fontSize: 12 }}>{permit.completionDate ?? '—'}</TableCell>
                          <TableCell align="right">
                            {canEdit && (
                              <Tooltip title="Edit"><IconButton size="small" onClick={() => {
                                setEditingPermit(permit);
                                setPermitForm({ permitTypeCode: permit.permitTypeCode ?? '', permitTypeName: permit.permitTypeName ?? '', permitNumber: permit.permitNumber ?? '', workOrderNumber: permit.workOrderNumber ?? '', eamNumber: permit.eamNumber ?? '', permitHolder: permit.permitHolder ?? '', workDescription: permit.workDescription ?? '', startDate: permit.startDate?.split('T')[0] ?? '', completionDate: permit.completionDate ?? '', sortOrder: permit.sortOrder });
                                setShowPermitForm(true);
                              }}><Edit sx={{ fontSize: 14 }} /></IconButton></Tooltip>
                            )}
                            {canDelete && (
                              <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setDeletePermit(permit)}><Delete sx={{ fontSize: 14 }} /></IconButton></Tooltip>
                            )}
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
            <CardHeader
              title={
                <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1.5}>
                  <Typography sx={{ fontWeight: 700 }}>Station Log</Typography>
                  <Chip label={`${totalEntries} items`} size="small" variant="outlined" />
                </Stack>
              }
            />
            <Divider />
            <CardContent>
              {entryError && <Alert severity="error" onClose={() => setEntryError(null)} sx={{ mb: 2 }}>{entryError}</Alert>}
              {conditionError && <Alert severity="error" onClose={() => setConditionError(null)} sx={{ mb: 2 }}>{conditionError}</Alert>}

              {/* Add Entry + Add Condition buttons */}
              {canCreate && (
                <Stack spacing={1.5} sx={{ mb: 2.5 }}>
                  {/* Regular entry bar */}
                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, backgroundColor: '#F8F9FA' }}>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
                      <TextField label="Time" type="time" size="small" sx={{ width: 120 }}
                        value={entryForm.entryTime}
                        onChange={(e) => setEntryForm((prev) => ({ ...prev, entryTime: e.target.value }))}
                        slotProps={{ inputLabel: { shrink: true } }} />
                      <TextField label="Entry" size="small" fullWidth multiline maxRows={4}
                        value={entryForm.entryText}
                        onChange={(e) => setEntryForm((prev) => ({ ...prev, entryText: e.target.value }))}
                        placeholder="Record an observation, action or event…"
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddEntry(); } }} />
                      <Button variant="contained" size="small" sx={{ minWidth: 80, mt: 0.5 }}
                        startIcon={addingEntry ? <CircularProgress size={14} color="inherit" /> : <Add />}
                        onClick={handleAddEntry}
                        disabled={addingEntry || !entryForm.entryTime || !entryForm.entryText.trim()}>
                        {addingEntry ? '...' : 'Add'}
                      </Button>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      Press Enter to add · Shift+Enter for new line
                    </Typography>
                  </Paper>

                  {/* System conditions button */}
                  <Button variant="outlined" size="small" startIcon={<TableChart />}
                    onClick={() => { setEditingCondition(null); setConditionForm(emptyCondition()); setShowConditionForm(true); }}
                    sx={{ alignSelf: 'flex-start' }}>
                    Add System Conditions Snapshot
                  </Button>
                </Stack>
              )}

              {/* Condition Snapshot Form */}
              {showConditionForm && (
                <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2, borderColor: '#1B5E20', backgroundColor: '#F1F8F1' }}>
                  <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#1B5E20' }}>
                      {editingCondition ? 'Edit System Conditions Snapshot' : 'New System Conditions Snapshot'}
                    </Typography>
                    <IconButton size="small" onClick={() => { setShowConditionForm(false); setEditingCondition(null); setPasteMode(false); setPasteText(''); }}>
                      <ExpandLess fontSize="small" />
                    </IconButton>
                  </Stack>
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField label="Time" type="time" size="small" fullWidth required
                        value={conditionForm.snapshotTime}
                        onChange={(e) => setConditionForm((prev) => ({ ...prev, snapshotTime: e.target.value }))}
                        slotProps={{ inputLabel: { shrink: true } }} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField label="Source" size="small" fullWidth
                        value={conditionForm.source}
                        onChange={(e) => setConditionForm((prev) => ({ ...prev, source: e.target.value }))}
                        placeholder="e.g. SCC/Doffour" />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField label="System Voltage (kV)" type="number" size="small" fullWidth
                        value={conditionForm.systemVoltageKv}
                        onChange={(e) => setConditionForm((prev) => ({ ...prev, systemVoltageKv: e.target.value }))}
                        slotProps={{ htmlInput: { min: 0, step: 0.1 } }} />
                    </Grid>
                  </Grid>

                  {/* Station rows */}
                  <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#1B5E20' }}>
                      Station Readings
                    </Typography>
                    <Button size="small" variant={pasteMode ? 'contained' : 'outlined'}
                      onClick={() => { setPasteMode((p) => !p); setPasteText(''); }}
                      sx={{ fontSize: 11, color: pasteMode ? 'white' : '#1B5E20', borderColor: '#1B5E20',
                        backgroundColor: pasteMode ? '#1B5E20' : 'transparent' }}>
                      {pasteMode ? 'Cancel Paste' : '📋 Paste from Excel'}
                    </Button>
                  </Stack>

                  {pasteMode && (
                    <Box sx={{ mb: 1.5 }}>
                      <TextField
                        fullWidth multiline rows={6} size="small"
                        value={pasteText}
                        onChange={(e) => setPasteText(e.target.value)}
                        onPaste={(e) => {
                          const text = e.clipboardData.getData('text');
                          setPasteText(text);
                          setTimeout(() => parsePasteText(text), 50);
                        }}
                        placeholder={"Copy the station readings table from Excel and paste here.\nExpected columns: Station Name | Units | Load (MW)"}
                        sx={{ fontFamily: 'monospace', fontSize: 12 }}
                      />
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        <Button size="small" variant="contained"
                          onClick={() => parsePasteText(pasteText)}
                          disabled={!pasteText.trim()}
                          sx={{ backgroundColor: '#1B5E20' }}>
                          Parse & Fill Rows
                        </Button>
                        <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
                          Paste automatically fills rows — review and adjust before saving.
                        </Typography>
                      </Stack>
                    </Box>
                  )}

                  <Table size="small" sx={{ mt: 1, mb: 1.5 }}>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#E8F5E9' }}>
                        <TableCell sx={{ fontWeight: 700 }}>Station</TableCell>
                        <TableCell sx={{ fontWeight: 700, width: 120 }}>No. of Units</TableCell>
                        <TableCell sx={{ fontWeight: 700, width: 140 }}>Total Load (MW)</TableCell>
                        <TableCell sx={{ width: 40 }} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {conditionForm.rows.map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <FormControl fullWidth size="small">
                              <Select value={row.plantCode} displayEmpty
                                onChange={(e) => {
                                  const plant = allPlants.find((p) => p.plantCode === e.target.value);
                                  updateConditionRow(idx, 'plantCode', e.target.value);
                                  updateConditionRow(idx, 'plantName', plant?.plantName ?? e.target.value);
                                }}>
                                <MenuItem value="" disabled><em>Select plant…</em></MenuItem>
                                {allPlants
                                  .filter((p) => p.plantCode === row.plantCode || !conditionForm.rows.some((r, ri) => ri !== idx && r.plantCode === p.plantCode))
                                  .map((p) => (
                                    <MenuItem key={p.id} value={p.plantCode}>{p.plantName}</MenuItem>
                                  ))}
                              </Select>
                            </FormControl>
                          </TableCell>
                          <TableCell>
                            <TextField size="small" type="number" fullWidth value={row.numberOfUnits}
                              onChange={(e) => updateConditionRow(idx, 'numberOfUnits', e.target.value)}
                              slotProps={{ htmlInput: { min: 0 } }} />
                          </TableCell>
                          <TableCell>
                            <TextField size="small" type="number" fullWidth value={row.totalLoadMw}
                              onChange={(e) => updateConditionRow(idx, 'totalLoadMw', e.target.value)}
                              slotProps={{ htmlInput: { min: 0, step: 0.01 } }} />
                          </TableCell>
                          <TableCell>
                            <IconButton size="small" color="error" onClick={() => removeConditionRow(idx)}>
                              <Delete sx={{ fontSize: 16 }} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                      {conditionForm.rows.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} align="center" sx={{ py: 2, color: '#999', fontStyle: 'italic' }}>
                            No stations added yet
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    <Button size="small" variant="outlined" startIcon={<Add />} onClick={addConditionRow}
                      sx={{ color: '#1B5E20', borderColor: '#1B5E20' }}>
                      Add Station Row
                    </Button>
                    <Box sx={{ flex: 1 }} />
                    <Button size="small" variant="outlined"
                      onClick={() => { setShowConditionForm(false); setEditingCondition(null); setPasteMode(false); setPasteText(''); }} disabled={savingCondition}>
                      Cancel
                    </Button>
                    <Button size="small" variant="contained" onClick={handleSaveCondition}
                      disabled={savingCondition || !conditionForm.snapshotTime}
                      startIcon={savingCondition ? <CircularProgress size={14} color="inherit" /> : <Save />}
                      sx={{ backgroundColor: '#1B5E20' }}>
                      {savingCondition ? 'Saving...' : 'Save Snapshot'}
                    </Button>
                  </Stack>
                </Paper>
              )}

              {/* Timeline */}
              {timeline.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No entries yet. Add the first log entry above.
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={0}>
                  {timeline.map((item, idx) => {
                    const isLast = idx === timeline.length - 1;

                    // Regular entry
                    if (item.type === 'entry' && item.entry) {
                      const entry = item.entry;
                      return (
                        <Box key={item.id}>
                          {editingEntry?.id === entry.id ? (
                            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, my: 0.5 }}>
                              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
                                <TextField label="Time" type="time" size="small" sx={{ width: 120 }}
                                  value={editEntryForm.entryTime}
                                  onChange={(e) => setEditEntryForm((prev) => ({ ...prev, entryTime: e.target.value }))}
                                  slotProps={{ inputLabel: { shrink: true } }} />
                                <TextField size="small" fullWidth multiline maxRows={6}
                                  value={editEntryForm.entryText}
                                  onChange={(e) => setEditEntryForm((prev) => ({ ...prev, entryText: e.target.value }))} />
                                <Stack spacing={0.5}>
                                  <Button size="small" variant="contained" onClick={handleSaveEntry}
                                    disabled={savingEntry}
                                    startIcon={savingEntry ? <CircularProgress size={12} color="inherit" /> : <Save />}>
                                    Save
                                  </Button>
                                  <Button size="small" variant="outlined"
                                    onClick={() => setEditingEntry(null)} disabled={savingEntry}>
                                    Cancel
                                  </Button>
                                </Stack>
                              </Stack>
                            </Paper>
                          ) : (
                            <Box sx={{
                              display: 'flex', alignItems: 'flex-start', gap: 1.5, py: 1, px: 0.5,
                              borderBottom: isLast ? 'none' : '1px solid', borderColor: 'divider',
                              '&:hover .entry-actions': { opacity: 1 },
                            }}>
                              <Typography variant="body2"
                                sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#1565C0', minWidth: 50, pt: 0.1, fontSize: 13 }}>
                                {entry.entryTime}
                              </Typography>
                              <Typography variant="body2" sx={{ flex: 1, lineHeight: 1.6 }}>{entry.entryText}</Typography>
                              <Stack direction="row" className="entry-actions"
                                sx={{ opacity: 0, transition: 'opacity 0.15s', alignItems: 'center' }}>
                                <Typography variant="caption" color="text.disabled" sx={{ mr: 0.5 }}>{entry.createdByName}</Typography>
                                {canEdit && (
                                  <Tooltip title="Edit">
                                    <IconButton size="small" onClick={() => { setEditingEntry(entry); setEditEntryForm({ entryTime: entry.entryTime, entryText: entry.entryText }); }}>
                                      <Edit sx={{ fontSize: 14 }} />
                                    </IconButton>
                                  </Tooltip>
                                )}
                                {canDelete && (
                                  <Tooltip title="Delete">
                                    <IconButton size="small" color="error" onClick={() => setDeleteEntry(entry)}>
                                      <Delete sx={{ fontSize: 14 }} />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </Stack>
                            </Box>
                          )}
                        </Box>
                      );
                    }

                    // Condition snapshot
                    if (item.type === 'condition' && item.condition) {
                      const cond = item.condition;
                      const expanded = expandedConditions.has(cond.id);
                      const totalUnits = cond.rows.reduce((s, r) => s + (r.numberOfUnits ?? 0), 0);
                      const totalLoad = cond.rows.reduce((s, r) => s + (r.totalLoadMw ?? 0), 0);

                      return (
                        <Box key={item.id} sx={{ borderBottom: isLast ? 'none' : '1px solid', borderColor: 'divider', py: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 0.5, py: 0.5,
                            cursor: 'pointer', '&:hover .cond-actions': { opacity: 1 } }}
                            onClick={() => setExpandedConditions((prev) => {
                              const next = new Set(prev);
                              next.has(cond.id) ? next.delete(cond.id) : next.add(cond.id);
                              return next;
                            })}>
                            <Typography variant="body2"
                              sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#1B5E20', minWidth: 50, fontSize: 13 }}>
                              {cond.snapshotTime}
                            </Typography>
                            <Chip label="System Conditions" size="small" color="success" variant="outlined"
                              sx={{ fontWeight: 700, fontSize: 11 }} />
                            {cond.source && (
                              <Typography variant="caption" color="text.secondary">from {cond.source}</Typography>
                            )}
                            <Typography variant="caption" sx={{ color: '#1B5E20', fontWeight: 600 }}>
                              {totalUnits} units · {totalLoad.toFixed(1)} MW total
                            </Typography>
                            {cond.systemVoltageKv && (
                              <Typography variant="caption" color="text.secondary">
                                · {cond.systemVoltageKv}kV
                              </Typography>
                            )}
                            <Box sx={{ flex: 1 }} />
                            <Stack direction="row" className="cond-actions"
                              sx={{ opacity: 0, transition: 'opacity 0.15s', alignItems: 'center' }}
                              onClick={(e) => e.stopPropagation()}>
                              {canEdit && (
                                <Tooltip title="Edit">
                                  <IconButton size="small" onClick={() => openEditCondition(cond)}>
                                    <Edit sx={{ fontSize: 14 }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                              {canDelete && (
                                <Tooltip title="Delete">
                                  <IconButton size="small" color="error" onClick={() => setDeleteCondition(cond)}>
                                    <Delete sx={{ fontSize: 14 }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Stack>
                            <IconButton size="small">
                              {expanded ? <ExpandLess sx={{ fontSize: 16 }} /> : <ExpandMore sx={{ fontSize: 16 }} />}
                            </IconButton>
                          </Box>
                          <Collapse in={expanded}>
                            <Box sx={{ ml: 8, mb: 1 }}>
                              <Table size="small">
                                <TableHead>
                                  <TableRow sx={{ backgroundColor: '#E8F5E9' }}>
                                    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Station</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: 12 }}>Units</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12 }}>Load (MW)</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {cond.rows.map((row) => (
                                    <TableRow key={row.id}>
                                      <TableCell sx={{ fontSize: 12 }}>{row.plantName}</TableCell>
                                      <TableCell align="center" sx={{ fontSize: 12 }}>{row.numberOfUnits ?? '—'}</TableCell>
                                      <TableCell align="right" sx={{ fontSize: 12 }}>{row.totalLoadMw?.toFixed(1) ?? '—'}</TableCell>
                                    </TableRow>
                                  ))}
                                  <TableRow sx={{ backgroundColor: '#E8F5E9' }}>
                                    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Total</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: 12 }}>{totalUnits}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12 }}>{totalLoad.toFixed(1)}</TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </Box>
                          </Collapse>
                        </Box>
                      );
                    }

                    // Shift handover
                    if (item.type === 'handover') {
                      const isIncoming = item.handoverType === 'incoming';
                      return (
                        <Box key={item.id} sx={{
                          display: 'flex', alignItems: 'flex-start', gap: 1.5, py: 1, px: 0.5,
                          borderBottom: isLast ? 'none' : '1px solid', borderColor: 'divider',
                          backgroundColor: '#F3F6FF',
                        }}>
                          <Typography variant="body2"
                            sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#1565C0', minWidth: 50, pt: 0.1, fontSize: 13 }}>
                            {item.time}
                          </Typography>
                          <Chip label="Handover" size="small" color="primary" variant="outlined"
                            sx={{ fontWeight: 700, fontSize: 11 }} />
                          <Typography variant="body2" sx={{ flex: 1, lineHeight: 1.6,
                            color: isIncoming ? '#1B5E20' : '#B71C1C', fontStyle: 'italic' }}>
                            {item.handoverText}
                          </Typography>
                        </Box>
                      );
                    }

                    return null;
                  })}
                </Stack>
              )}
            </CardContent>
          </Card>

          {/* Energy Summary */}
          <Card sx={{ mb: 2 }}>
            <Box sx={{
              px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer', backgroundColor: '#1B5E2014',
              borderBottom: summaryCollapsed ? 'none' : '1px solid', borderColor: 'divider',
            }} onClick={() => setSummaryCollapsed((p) => !p)}>
              <Typography variant="caption"
                sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#1B5E20' }}>
                End of Day Summary
              </Typography>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                {canEdit && !summaryEditing && (
                  <Tooltip title="Edit summary">
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); setSummaryEditing(true); }}>
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                <IconButton size="small">
                  {summaryCollapsed ? <ExpandMore fontSize="small" /> : <ExpandLess fontSize="small" />}
                </IconButton>
              </Stack>
            </Box>
            <Collapse in={!summaryCollapsed}>
              <CardContent>
                {summarySaveSuccess && <Alert severity="success" onClose={() => setSummarySaveSuccess(false)} sx={{ mb: 2 }}>Summary saved successfully.</Alert>}
                {summarySaveError && <Alert severity="error" onClose={() => setSummarySaveError(null)} sx={{ mb: 2 }}>{summarySaveError}</Alert>}

                {/* Fixed top-level fields */}
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#1B5E20', mb: 1.5, display: 'block' }}>Generation Totals</Typography>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Energy Generated" type="number" fullWidth size="small"
                      value={summaryForm.energyGeneratedKwh}
                      onChange={(e) => setSummaryForm((prev) => ({ ...prev, energyGeneratedKwh: e.target.value }))}
                      disabled={!canEdit || !summaryEditing}
                      slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">kWh</Typography> } }} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Total Generation" type="number" fullWidth size="small"
                      value={totalGenerationMwh} onChange={(e) => setTotalGenerationMwh(e.target.value)}
                      disabled={!canEdit || !summaryEditing}
                      slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">MWh</Typography> } }} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField label="Station Service" type="number" fullWidth size="small"
                      value={totalStationServiceMwh} onChange={(e) => setTotalStationServiceMwh(e.target.value)}
                      disabled={!canEdit || !summaryEditing}
                      slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">MWh</Typography> } }} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField label="Net Generation" type="number" fullWidth size="small"
                      value={netGenerationMwh} onChange={(e) => setNetGenerationMwh(e.target.value)}
                      disabled={!canEdit || !summaryEditing}
                      slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">MWh</Typography> } }} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField label="Shift Leader" fullWidth size="small"
                      value={summaryForm.shiftLeaderName}
                      onChange={(e) => setSummaryForm((prev) => ({ ...prev, shiftLeaderName: e.target.value }))}
                      disabled={!canEdit || !summaryEditing}
                      placeholder="Name of shift leader" />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField label="Forebay Level" type="number" fullWidth size="small"
                      value={forebayLevelM} onChange={(e) => setForebayLevelM(e.target.value)}
                      disabled={!canEdit || !summaryEditing}
                      slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">m</Typography> } }} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField label="Tailrace Level" type="number" fullWidth size="small"
                      value={tailraceLevelM} onChange={(e) => setTailraceLevelM(e.target.value)}
                      disabled={!canEdit || !summaryEditing}
                      slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">m</Typography> } }} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField label="Net Head" type="number" fullWidth size="small"
                      value={netHeadM} onChange={(e) => setNetHeadM(e.target.value)}
                      disabled={!canEdit || !summaryEditing}
                      slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">m</Typography> } }} />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField label="Notes" fullWidth size="small" multiline maxRows={3}
                      value={generationNotes} onChange={(e) => setGenerationNotes(e.target.value)}
                      disabled={!canEdit || !summaryEditing}
                      placeholder="Any additional generation notes..." />
                  </Grid>
                </Grid>
                {summaryEditing && canEdit && (
                  <Stack direction="row" spacing={1.5} sx={{ mb: 3 }}>
                    <Button variant="outlined" size="small" onClick={() => setSummaryEditing(false)} disabled={savingSummary}>Cancel</Button>
                    <Button variant="contained" size="small" onClick={handleSaveSummaryTotals} disabled={savingSummary}
                      startIcon={savingSummary ? <CircularProgress size={14} color="inherit" /> : <Save />}
                      sx={{ backgroundColor: '#1B5E20' }}>
                      {savingSummary ? 'Saving...' : 'Save Totals'}
                    </Button>
                  </Stack>
                )}
                {!summaryEditing && canEdit && (
                  <Button size="small" variant="outlined" startIcon={<Edit />} sx={{ mb: 2, color: '#1B5E20', borderColor: '#1B5E20' }}
                    onClick={() => setSummaryEditing(true)}>
                    Edit Totals
                  </Button>
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
                      <TableCell sx={{ fontWeight: 700, width: 100 }}>Unit</TableCell>
                      {canEdit && <TableCell sx={{ width: 40 }} />}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {generationRows.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <FormControl size="small" fullWidth disabled={!canEdit}>
                            <Select value={row.description} displayEmpty
                              onChange={(e) => { const r = [...generationRows]; r[idx] = { ...r[idx], description: e.target.value }; setGenerationRows(r); }}
                              renderValue={(val) => val || <em style={{ color: '#999' }}>Select unit…</em>}>
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
                        <TableCell>
                          <TextField size="small" type="number" fullWidth value={row.value} disabled={!canEdit}
                            onChange={(e) => { const r = [...generationRows]; r[idx] = { ...r[idx], value: e.target.value }; setGenerationRows(r); }} />
                        </TableCell>
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
                    <Button size="small" variant="outlined" startIcon={<Add />} sx={{ color: '#1B5E20', borderColor: '#1B5E20' }}
                      onClick={() => setGenerationRows((p) => [...p, { description: '', value: '', unit: 'MWh', sortOrder: p.length }])}>
                      Add Row
                    </Button>
                    <Box sx={{ flex: 1 }} />
                    <Button size="small" variant="contained" sx={{ backgroundColor: '#1B5E20' }}
                      onClick={handleSaveGenerationRows} disabled={savingGenerationRows}
                      startIcon={savingGenerationRows ? <CircularProgress size={14} color="inherit" /> : <Save />}>
                      {savingGenerationRows ? 'Saving...' : 'Save Breakdown'}
                    </Button>
                  </Stack>
                )}
              </CardContent>
            </Collapse>
          </Card>
        </>
      )}

      <ConfirmDialog
        open={!!deleteEntry}
        title="Delete Log Entry"
        message={`Delete the entry at ${deleteEntry?.entryTime}?`}
        confirmLabel="Delete" loading={deletingEntry}
        onConfirm={handleDeleteEntry} onCancel={() => setDeleteEntry(null)}
      />
      <ConfirmDialog
        open={!!deleteCondition}
        title="Delete System Conditions Snapshot"
        message={`Delete the system conditions snapshot at ${deleteCondition?.snapshotTime}?`}
        confirmLabel="Delete" loading={deletingCondition}
        onConfirm={handleDeleteCondition} onCancel={() => setDeleteCondition(null)}
      />
      <ConfirmDialog open={!!deletePermit} title="Delete Permit"
        message={`Delete permit ${deletePermit?.permitNumber ?? ''}?`}
        confirmLabel="Delete" loading={deletingPermit}
        onConfirm={handleDeletePermit} onCancel={() => setDeletePermit(null)} />
    </Box>
  );
}
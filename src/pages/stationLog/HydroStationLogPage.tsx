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
import { shiftLogApi } from '../../api/stationLog/shiftLogApi';
import type { PowerPlant, PlantUnit } from '../../types/masterData';
import type { PlantBus } from '../../types/plantBus';
import type {
  HydroStationLog, HydroStationLogEntry, HydroStationLogCondition,
  UpdateHydroStationLogForm, CreateHydroStationLogEntryForm,
  UpdateHydroStationLogEntryForm, CreateConditionForm, ConditionRowForm,
} from '../../types/hydroStationLog';
import type { ShiftLog } from '../../types/shiftLog';
import { useSectionPermissions, usePlantFilter } from '../../hooks/usePermission';
import { useUser } from '../../context/UserContext';

const emptyEntry: CreateHydroStationLogEntryForm = {
  entryTime: new Date().toTimeString().slice(0, 5),
  entryText: '',
};

const emptyCondition: CreateConditionForm = {
  snapshotTime: new Date().toTimeString().slice(0, 5),
  source: '',
  systemVoltageKv: '',
  rows: [],
};

const TEXT_HEADER_FIELDS = [
  { key: 'stationService',        label: 'Station Service' },
  { key: 'permitsInEffect',       label: 'Permits in Effect' },
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

  // Entry
  const [entryForm, setEntryForm] = useState<CreateHydroStationLogEntryForm>(emptyEntry);
  const [addingEntry, setAddingEntry] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<HydroStationLogEntry | null>(null);
  const [editEntryForm, setEditEntryForm] = useState<UpdateHydroStationLogEntryForm>({ entryTime: '', entryText: '' });
  const [savingEntry, setSavingEntry] = useState(false);
  const [deleteEntry, setDeleteEntry] = useState<HydroStationLogEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState(false);

  // Condition snapshot
  const [showConditionForm, setShowConditionForm] = useState(false);
  const [conditionForm, setConditionForm] = useState<CreateConditionForm>(emptyCondition);
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

  useEffect(() => {
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
  };

  const loadLog = async () => {
    setLoading(true); setLoadError(null); setLog(null); setShiftHandovers([]);
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
      setConditionForm(emptyCondition);
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

  const handleSaveSummary = async () => {
    if (!log) return;
    setSavingSummary(true);
    try {
      const res = await hydroStationLogApi.update(log.id, {
        unitsInService: log.unitsInService ?? '', linesInService: log.linesInService ?? '',
        stationService: log.stationService ?? '', permitsInEffect: log.permitsInEffect ?? '',
        applicationsForOutage: log.applicationsForOutage ?? '', miscNotes: log.miscNotes ?? '',
        energyGeneratedKwh: summaryForm.energyGeneratedKwh !== '' ? summaryForm.energyGeneratedKwh : null,
        shiftLeaderName: summaryForm.shiftLeaderName,
      });
      setLog(res.data); setSummaryEditing(false);
    } catch { setEntryError('Failed to save summary.'); }
    finally { setSavingSummary(false); }
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
          <Card sx={{ mb: 3 }}>
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

          {/* Running Log */}
          <Card sx={{ mb: 3 }}>
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
                    onClick={() => { setEditingCondition(null); setConditionForm(emptyCondition); setShowConditionForm(true); }}
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
          <Card>
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
                {summaryEditing ? (
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField label="Energy Generated (kWh)" type="number" fullWidth size="small"
                        value={summaryForm.energyGeneratedKwh}
                        onChange={(e) => setSummaryForm((prev) => ({ ...prev, energyGeneratedKwh: e.target.value }))}
                        slotProps={{ htmlInput: { min: 0, step: 0.001 } }} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField label="Shift Leader" fullWidth size="small"
                        value={summaryForm.shiftLeaderName}
                        onChange={(e) => setSummaryForm((prev) => ({ ...prev, shiftLeaderName: e.target.value }))}
                        placeholder="Name of shift leader" />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Stack direction="row" spacing={1.5}>
                        <Button variant="outlined" size="small" onClick={() => setSummaryEditing(false)} disabled={savingSummary}>Cancel</Button>
                        <Button variant="contained" size="small" onClick={handleSaveSummary} disabled={savingSummary}
                          startIcon={savingSummary ? <CircularProgress size={14} color="inherit" /> : <Save />}>
                          {savingSummary ? 'Saving...' : 'Save Summary'}
                        </Button>
                      </Stack>
                    </Grid>
                  </Grid>
                ) : (
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="caption" color="text.secondary"
                        sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Energy Generated
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: '#1B5E20', mt: 0.5 }}>
                        {log.energyGeneratedKwh != null
                          ? `${log.energyGeneratedKwh.toLocaleString()} kWh`
                          : <span style={{ color: '#999', fontSize: 16, fontWeight: 400, fontStyle: 'italic' }}>Not recorded</span>}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="caption" color="text.secondary"
                        sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Shift Leader
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.5 }}>
                        {log.shiftLeaderName || <span style={{ color: '#999', fontStyle: 'italic' }}>Not recorded</span>}
                      </Typography>
                    </Grid>
                  </Grid>
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
    </Box>
  );
}
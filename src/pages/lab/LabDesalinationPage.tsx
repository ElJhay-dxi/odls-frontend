import { useSearchDeepLink } from '../../hooks/useSearchDeepLink';
import {
  Box, Card, CardContent, TextField, Button, CircularProgress, Alert, Typography,
  MenuItem, FormControl, InputLabel, Select, Grid, Chip, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Collapse, Tab, Tabs,
} from '@mui/material';
import { Save, Add, FilterAlt, History, ExpandMore, ExpandLess, FiberManualRecord, Edit, Delete, Close, Timeline } from '@mui/icons-material';
import { Tooltip, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import { Fragment, useEffect, useState, useCallback, type SyntheticEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import PageHeader from '../../components/shared/PageHeader';
import PersonAutocomplete from '../../components/lab/PersonAutocomplete';
import SuggestAutocomplete from '../../components/lab/SuggestAutocomplete';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { labDesalinationApi, type DesalSection } from '../../api/lab/labDesalinationApi';
import type { PowerPlant } from '../../types/masterData';
import type { LabDesalinationLog, LabDesalinationLogEntry } from '../../types/lab';
import { DESAL_SECTIONS, type DesalField, type DesalSectionConfig, type DesalSectionKey } from './desalinationConfig';
import { computeField } from './desalinationCalcs';
import { useSectionPermissions, usePlantFilter } from '../../hooks/usePermission';
import { usePlantTypeGuard } from '../../hooks/usePlantTypeGuard';

const ACCENT = '#00695C';

type TabKey = DesalSectionKey;
type TabConfig = DesalSectionConfig;
const TABS = DESAL_SECTIONS;
const fieldsOf = (tab: TabConfig): DesalField[] => tab.groups.flatMap((g) => g.fields);

const DESAL_CATEGORIES = [
  'Observation', 'Action', 'Maintenance', 'Backwash', 'CIP (Clean in Place)', 'Membrane Cleaning',
  'Chemical Dosing', 'Alarm / Trip', 'Start-up', 'Shutdown', 'Sample Taken', 'Incident',
];

const SHIFTS = [
  { code: 'DAY', label: 'Day Shift (07:00–19:00)' },
  { code: 'NIGHT', label: 'Night Shift (19:00–07:00)' },
];

const SHIFT_CHIP_STYLE: Record<string, { backgroundColor: string; color: string }> = {
  DAY: { backgroundColor: '#E3F2FD', color: '#1565C0' },
  NIGHT: { backgroundColor: '#EDE7F6', color: '#4A148C' },
};

const TIME_RX = /^([01]\d|2[0-3]):[0-5]\d$/;

const nowTime = () => dayjs().format('HH:mm');

const shiftForTime = (time: string): 'DAY' | 'NIGHT' => {
  const hour = parseInt(time.split(':')[0] ?? '', 10);
  return Number.isNaN(hour) ? 'DAY' : hour >= 7 && hour < 19 ? 'DAY' : 'NIGHT';
};

const errMsg = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

const fmtTime = (t?: string | null) => (t ? t.slice(0, 5) : '—');

type TabForm = Record<string, string>;

const emptyTabForm = (tab: TabConfig): TabForm => {
  const f: TabForm = { readingTime: nowTime(), remarks: '' };
  fieldsOf(tab).forEach((field) => { f[field.key] = ''; });
  return f;
};

const formFromReading = (tab: TabConfig, r: Record<string, unknown>): TabForm => {
  const f: TabForm = {
    readingTime: r.readingTime ? fmtTime(r.readingTime as string) : '',
    remarks: (r.remarks as string) ?? '',
  };
  fieldsOf(tab).forEach((field) => {
    const v = r[field.key];
    f[field.key] = v != null ? String(v) : '';
  });
  return f;
};

const buildEmptyForms = (): Record<TabKey, TabForm> => {
  const result = {} as Record<TabKey, TabForm>;
  TABS.forEach((tab) => { result[tab.key] = emptyTabForm(tab); });
  return result;
};

const NO_EDIT: Record<TabKey, string | null> = { uf: null, swro: null, bwro: null, clarifier: null, px: null, productWater: null };
const NO_MSG: Record<TabKey, string | null> = { uf: null, swro: null, bwro: null, clarifier: null, px: null, productWater: null };

type DeleteItem =
  | { kind: 'reading'; tab: TabConfig; id: string; label: string }
  | { kind: 'entry'; id: string; label: string };

export default function LabDesalinationPage() {
  const { canCreate, canEdit, canDelete } = useSectionPermissions('lab.desalination');
  const canSave = canCreate || canEdit;
  const isWrongPlantType = usePlantTypeGuard('thermal');
  const navigate = useNavigate();

  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const { availablePlants, plantLocked, autoPlantCode } = usePlantFilter(plants);

  const deepLink = useSearchDeepLink();

  const [selectedPlant, setSelectedPlant] = useState(deepLink.plant ?? '');
  const [selectedDate, setSelectedDate] = useState(deepLink.date ?? new Date().toISOString().split('T')[0]);

  const [log, setLog] = useState<LabDesalinationLog | null>(null);
  const [loadingLog, setLoadingLog] = useState(false);
  const [creatingLog, setCreatingLog] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [headerForm, setHeaderForm] = useState({ operator: '', remarks: '' });
  const [savingHeader, setSavingHeader] = useState(false);
  const [headerError, setHeaderError] = useState<string | null>(null);

  const [tabIndex, setTabIndex] = useState(0);
  const [tabForms, setTabForms] = useState<Record<TabKey, TabForm>>(buildEmptyForms());
  const [editingId, setEditingId] = useState<Record<TabKey, string | null>>(NO_EDIT);
  const [tabError, setTabError] = useState<Record<TabKey, string | null>>(NO_MSG);
  const [tabSaved, setTabSaved] = useState<Record<TabKey, string | null>>(NO_MSG);
  const [savingTab, setSavingTab] = useState<TabKey | null>(null);

  // Timeline
  const [entryForm, setEntryForm] = useState({ time: nowTime(), shift: shiftForTime(nowTime()) as string, category: '', text: '' });
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [savingEntry, setSavingEntry] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [learnedCategories, setLearnedCategories] = useState<string[]>([]);

  const [history, setHistory] = useState<LabDesalinationLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyCollapsed, setHistoryCollapsed] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<LabDesalinationLog | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteItem, setDeleteItem] = useState<DeleteItem | null>(null);
  const [deletingItem, setDeletingItem] = useState(false);

  useEffect(() => {
    powerPlantApi.getAll().then((res) =>
      setPlants(res.data.filter((p) => p.classificationType?.toLowerCase() === 'thermal'))
    );
  }, []);

  useEffect(() => {
    if (autoPlantCode) setSelectedPlant(autoPlantCode);
  }, [autoPlantCode]);

  const loadSuggestions = useCallback(() => {
    labDesalinationApi.getSuggestions()
      .then((res) => setLearnedCategories(res.data.categories ?? []))
      .catch(() => setLearnedCategories([]));
  }, []);

  useEffect(() => { loadSuggestions(); }, [loadSuggestions]);

  const resetEditors = () => {
    setTabForms(buildEmptyForms());
    setEditingId(NO_EDIT);
    setTabError(NO_MSG);
    setTabSaved(NO_MSG);
    const t = nowTime();
    setEntryForm({ time: t, shift: shiftForTime(t), category: '', text: '' });
    setEditingEntryId(null);
    setEntryError(null);
  };

  const applyLog = (found: LabDesalinationLog | null) => {
    setLog(found);
    setHeaderForm({ operator: found?.operator ?? '', remarks: found?.remarks ?? '' });
  };

  const loadLog = useCallback(() => {
    if (!selectedPlant || !selectedDate) { setLog(null); return; }
    setLoadingLog(true); setLoadError(null);
    labDesalinationApi.getByDate(selectedPlant, selectedDate)
      .then((res) => {
        applyLog(res.data ?? null);
        resetEditors();
      })
      .catch((err: unknown) => {
        setLog(null);
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status !== 404) setLoadError('Failed to load desalination log.');
      })
      .finally(() => setLoadingLog(false));
  }, [selectedPlant, selectedDate]);

  useEffect(() => { loadLog(); }, [loadLog]);

  const fetchHistory = useCallback(async () => {
    if (!selectedPlant) { setHistory([]); return; }
    setLoadingHistory(true);
    try {
      const res = await labDesalinationApi.getAll({ plantCode: selectedPlant });
      setHistory([...res.data].sort((a, b) => b.logDate.localeCompare(a.logDate)));
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [selectedPlant]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true); setDeleteError(null);
    try {
      await labDesalinationApi.delete(deleteTarget.id);
      if (log?.id === deleteTarget.id) {
        applyLog(null);
        resetEditors();
      }
      setDeleteTarget(null);
      fetchHistory();
    } catch {
      setDeleteError('Failed to delete log.');
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateLog = async () => {
    setCreatingLog(true); setLoadError(null);
    try {
      const res = await labDesalinationApi.create({ plantCode: selectedPlant, logDate: selectedDate });
      applyLog(res.data);
      resetEditors();
      fetchHistory();
    } catch (err: unknown) {
      setLoadError(errMsg(err, 'Failed to create desalination log.'));
    } finally {
      setCreatingLog(false);
    }
  };

  const handleSaveHeader = async () => {
    if (!log) return;
    setSavingHeader(true); setHeaderError(null);
    try {
      const res = await labDesalinationApi.update(log.id, headerForm);
      setLog(res.data);
      fetchHistory();
    } catch {
      setHeaderError('Failed to save log header.');
    } finally {
      setSavingHeader(false);
    }
  };

  const updateTabField = (tab: TabKey, field: string, value: string) => {
    setTabForms((prev) => ({ ...prev, [tab]: { ...prev[tab], [field]: value } }));
    setTabSaved((prev) => ({ ...prev, [tab]: null }));
  };

  // ── Computed fields ─────────────────────────────────────────────────────────
  const getterOf = (f: TabForm) => (k: string): number | null => {
    const v = f[k];
    if (v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  // Product water: the delta is measured against the previous reading of the day
  const prevCounterFor = (tab: TabConfig, f: TabForm): number | null => {
    if (tab.key !== 'productWater' || !f.readingTime) return null;
    const earlier = readingsOf(tab)
      .filter((r) => r.id !== editingId[tab.key] && r.readingTime && String(r.readingTime).slice(0, 5) < f.readingTime && r.plantFlowCounter != null)
      .sort((a, b) => String(a.readingTime).localeCompare(String(b.readingTime)));
    return earlier.length ? Number(earlier[earlier.length - 1].plantFlowCounter) : null;
  };

  const calcFor = (tab: TabConfig, field: DesalField, f: TabForm): number | null =>
    computeField(tab.key, field.key, getterOf(f), { prevCounter: prevCounterFor(tab, f) });

  const showCalc = (v: number | null) => (v == null ? '—' : String(Number(v.toFixed(3))));

  const handleSaveTab = async (tab: TabConfig) => {
    if (!log) return;
    const formVals = tabForms[tab.key];
    if (!TIME_RX.test(formVals.readingTime ?? '')) {
      setTabError((prev) => ({ ...prev, [tab.key]: 'Enter a reading time.' }));
      return;
    }
    setSavingTab(tab.key);
    setTabError((prev) => ({ ...prev, [tab.key]: null }));
    try {
      const payload: Record<string, unknown> = { readingTime: formVals.readingTime, remarks: formVals.remarks || null };
      fieldsOf(tab).forEach((field) => {
        const raw = formVals[field.key];
        if (field.kind === 'text') {
          payload[field.key] = raw ? raw : null;
        } else if (field.kind === 'calc') {
          const v = calcFor(tab, field, formVals);
          payload[field.key] = v == null ? null : Number(v.toFixed(3));
        } else if (raw !== '' && raw != null) {
          payload[field.key] = Number(raw);
        } else if (field.kind === 'cin') {
          const v = calcFor(tab, field, formVals);
          payload[field.key] = v == null ? null : Number(v.toFixed(3));
        } else {
          payload[field.key] = null;
        }
      });
      const id = editingId[tab.key];
      const res = id
        ? await labDesalinationApi.updateReading(log.id, tab.section, id, payload)
        : await labDesalinationApi.addReading(log.id, tab.section, payload);
      setLog(res.data);
      setTabForms((prev) => ({ ...prev, [tab.key]: emptyTabForm(tab) }));
      setEditingId((prev) => ({ ...prev, [tab.key]: null }));
      const alerts = res.data.entries.filter((e) => e.isAuto && e.entryTime === formVals.readingTime).length;
      setTabSaved((prev) => ({
        ...prev,
        [tab.key]: `${tab.label} reading ${id ? 'updated' : 'added'} at ${formVals.readingTime}.`
          + (alerts ? ` ${alerts} out-of-range ${alerts === 1 ? 'entry was' : 'entries were'} added to the timeline.` : ''),
      }));
      fetchHistory();
    } catch (err: unknown) {
      setTabError((prev) => ({ ...prev, [tab.key]: errMsg(err, `Failed to save ${tab.label} reading.`) }));
    } finally {
      setSavingTab(null);
    }
  };

  const startEditReading = (tab: TabConfig, reading: Record<string, unknown>) => {
    const f = formFromReading(tab, reading);
    fieldsOf(tab).filter((x) => x.kind === 'cin').forEach((x) => {
      const auto = calcFor(tab, x, f);
      const stored = f[x.key] !== '' ? Number(f[x.key]) : null;
      if (auto != null && stored != null && Math.abs(auto - stored) < 0.002) f[x.key] = ''; // it was auto-filled — keep it auto
    });
    setTabForms((prev) => ({ ...prev, [tab.key]: f }));
    setEditingId((prev) => ({ ...prev, [tab.key]: reading.id as string }));
    setTabError((prev) => ({ ...prev, [tab.key]: null }));
    setTabSaved((prev) => ({ ...prev, [tab.key]: null }));
  };

  const cancelEditReading = (tab: TabConfig) => {
    setTabForms((prev) => ({ ...prev, [tab.key]: emptyTabForm(tab) }));
    setEditingId((prev) => ({ ...prev, [tab.key]: null }));
    setTabError((prev) => ({ ...prev, [tab.key]: null }));
  };

  // ── Timeline entries ────────────────────────────────────────────────────────
  const handleEntryTimeChange = (time: string) =>
    setEntryForm((p) => ({ ...p, time, shift: shiftForTime(time) }));

  const resetEntryForm = () => {
    const t = nowTime();
    setEntryForm({ time: t, shift: shiftForTime(t), category: '', text: '' });
    setEditingEntryId(null);
  };

  const handleSaveEntry = async () => {
    if (!log) return;
    if (!TIME_RX.test(entryForm.time)) { setEntryError('Enter a valid time.'); return; }
    if (!entryForm.category.trim()) { setEntryError('Category is required.'); return; }
    if (!entryForm.text.trim()) { setEntryError('Entry text is required.'); return; }
    setSavingEntry(true); setEntryError(null);
    try {
      const data = { entryTime: entryForm.time, shiftCode: entryForm.shift, category: entryForm.category.trim(), entryText: entryForm.text.trim() };
      const res = editingEntryId
        ? await labDesalinationApi.updateEntry(log.id, editingEntryId, data)
        : await labDesalinationApi.addEntry(log.id, data);
      setLog(res.data);
      resetEntryForm();
      loadSuggestions();
      fetchHistory();
    } catch (err: unknown) {
      setEntryError(errMsg(err, 'Failed to save entry.'));
    } finally {
      setSavingEntry(false);
    }
  };

  const startEditEntry = (e: LabDesalinationLogEntry) => {
    setEditingEntryId(e.id);
    setEntryForm({ time: e.entryTime, shift: e.shiftCode, category: e.category, text: e.entryText });
    setEntryError(null);
  };

  const handleConfirmDeleteItem = async () => {
    if (!log || !deleteItem) return;
    setDeletingItem(true);
    try {
      const res = deleteItem.kind === 'reading'
        ? await labDesalinationApi.deleteReading(log.id, deleteItem.tab.section, deleteItem.id)
        : await labDesalinationApi.deleteEntry(log.id, deleteItem.id);
      setLog(res.data);
      if (deleteItem.kind === 'entry') {
        if (editingEntryId === deleteItem.id) resetEntryForm();
        loadSuggestions();
      } else if (editingId[deleteItem.tab.key] === deleteItem.id) {
        cancelEditReading(deleteItem.tab);
      }
      setDeleteItem(null);
      fetchHistory();
    } catch (err: unknown) {
      setLoadError(errMsg(err, 'Failed to delete.'));
      setDeleteItem(null);
    } finally {
      setDeletingItem(false);
    }
  };

  const historyGroups = history.map((h) => ({
    log: h,
    present: TABS.filter((tab) => (h[tab.key] as unknown[] | undefined)?.length),
  }));

  const showEmptyState = !selectedPlant;
  const activeTab = TABS[tabIndex];
  const readingsOf = (tab: TabConfig): Record<string, unknown>[] =>
    ((log?.[tab.key] ?? []) as unknown as Record<string, unknown>[]);

  // Open the tab that holds a record found through global search
  useEffect(() => {
    if (!log || !deepLink.record) return;
    const idx = TABS.findIndex((t) => readingsOf(t).some((r) => r.id === deepLink.record));
    if (idx >= 0) setTabIndex(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log?.id]);

  const dayEntries = log ? log.entries.filter((e) => e.shiftCode === 'DAY') : [];
  const nightEntries = log ? log.entries.filter((e) => e.shiftCode === 'NIGHT') : [];

  const renderEntry = (entry: LabDesalinationLogEntry) => (
    <Box key={entry.id} data-record-id={entry.id}
      sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', py: 1, borderBottom: '1px solid', borderColor: 'divider', ...(entry.isAuto ? { backgroundColor: '#FFF8E1', px: 1, borderRadius: 1 } : {}) }}>
      <Chip label={fmtTime(entry.entryTime)} size="small" sx={{ fontWeight: 700, backgroundColor: `${ACCENT}14`, color: ACCENT }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.25 }}>
          <Chip label={entry.category} size="small" variant="outlined" sx={{ fontSize: 11 }} />
          {entry.isAuto && <Chip label="Auto" size="small" color="warning" sx={{ fontSize: 11, height: 20 }} />}
          <Typography variant="caption" color="text.secondary">{entry.createdByName}</Typography>
        </Stack>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{entry.entryText}</Typography>
      </Box>
      <Stack direction="row" spacing={0.25}>
        {canEdit && !entry.isAuto && (
          <Tooltip title="Edit entry">
            <IconButton size="small" onClick={() => startEditEntry(entry)}><Edit sx={{ fontSize: 15, color: ACCENT }} /></IconButton>
          </Tooltip>
        )}
        {canDelete && (
          <Tooltip title="Delete entry">
            <IconButton size="small" color="error"
              onClick={() => setDeleteItem({ kind: 'entry', id: entry.id, label: `the ${fmtTime(entry.entryTime)} ${entry.category} entry` })}>
              <Delete sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
    </Box>
  );

  if (isWrongPlantType) return (
    <Alert severity="warning" sx={{ m: 3 }}>
      This section is only available for thermal plants.
      <Button size="small" onClick={() => navigate(-1)} sx={{ ml: 2 }}>Go Back</Button>
    </Alert>
  );

  const form = tabForms[activeTab.key];
  const isEditingReading = !!editingId[activeTab.key];
  const activeReadings = readingsOf(activeTab);
  const tableFields = fieldsOf(activeTab).filter((f) => f.table);

  return (
    <Box>
      <PageHeader
        title="Desalination Logs"
        subtitle="Timed desalination plant process readings and shift timeline"
        breadcrumbs={[{ label: 'Chemical Lab' }, { label: 'Desalination Logs' }]}
      />

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, sm: 5 }}>
              <FormControl fullWidth required disabled={plantLocked}>
                <InputLabel>Power Plant</InputLabel>
                <Select label="Power Plant" value={selectedPlant} onChange={(e) => setSelectedPlant(e.target.value)}>
                  {availablePlants.map((p: PowerPlant) => (
                    <MenuItem key={p.id} value={p.plantCode}>{p.plantName} ({p.plantCode})</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Log Date" type="date" fullWidth required
                value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            {loadingLog && (
              <Grid size={{ xs: 12, sm: 3 }}>
                <CircularProgress size={20} />
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {loadError && <Alert severity="error" onClose={() => setLoadError(null)} sx={{ mb: 2 }}>{loadError}</Alert>}

      {showEmptyState ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <FilterAlt sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">Select a plant to load records.</Typography>
        </Box>
      ) : !loadingLog && !log ? (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ textAlign: 'center', py: 5 }}>
            <FilterAlt sx={{ fontSize: '3rem', color: 'text.disabled', mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
              No desalination log for {dayjs(selectedDate).format('DD MMM YYYY')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              Create a log to begin recording timed process readings and timeline entries.
            </Typography>
            {canCreate && (
              <Button variant="contained" sx={{ backgroundColor: ACCENT }}
                startIcon={creatingLog ? <CircularProgress size={16} color="inherit" /> : <Add />}
                onClick={handleCreateLog} disabled={creatingLog}>
                {creatingLog ? 'Creating...' : `Create Log for ${dayjs(selectedDate).format('DD MMM YYYY')}`}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : log && (
        <>
          <Card sx={{ mb: 3 }}>
            <Box sx={{ px: 2.5, py: 1.5, backgroundColor: `${ACCENT}14`, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: ACCENT }}>
                Log Header
              </Typography>
            </Box>
            <CardContent>
              {headerError && <Alert severity="error" onClose={() => setHeaderError(null)} sx={{ mb: 2 }}>{headerError}</Alert>}
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <PersonAutocomplete label="Operator" plantCode={selectedPlant}
                    value={headerForm.operator} onChange={(v) => setHeaderForm((p) => ({ ...p, operator: v }))} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Remarks" size="small" fullWidth
                    value={headerForm.remarks} onChange={(e) => setHeaderForm((p) => ({ ...p, remarks: e.target.value }))} />
                </Grid>
              </Grid>
              {canEdit && (
                <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
                  <Button variant="contained" size="small" sx={{ backgroundColor: ACCENT }} onClick={handleSaveHeader}
                    disabled={savingHeader}
                    startIcon={savingHeader ? <CircularProgress size={14} color="inherit" /> : <Save />}>
                    {savingHeader ? 'Saving...' : 'Save'}
                  </Button>
                </Stack>
              )}
            </CardContent>
          </Card>

          <Card sx={{ mb: 3 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabIndex} onChange={(_: SyntheticEvent, v: number) => setTabIndex(v)} variant="scrollable" scrollButtons="auto">
                {TABS.map((tab, idx) => {
                  const count = readingsOf(tab).length;
                  return (
                    <Tab key={tab.key} value={idx} label={
                      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                        <span>{tab.label}</span>
                        {count > 0
                          ? <Chip label={count} size="small" sx={{ height: 18, fontSize: 11, backgroundColor: '#E8F5E9', color: '#1B5E20', fontWeight: 700 }} />
                          : <FiberManualRecord sx={{ fontSize: 10, color: '#BDBDBD' }} />}
                      </Stack>
                    } />
                  );
                })}
              </Tabs>
            </Box>
            <CardContent>
              {tabError[activeTab.key] && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setTabError((p) => ({ ...p, [activeTab.key]: null }))}>
                  {tabError[activeTab.key]}
                </Alert>
              )}
              {tabSaved[activeTab.key] && (
                <Alert severity="success" sx={{ mb: 2 }}>{tabSaved[activeTab.key]}</Alert>
              )}

              {canSave && (
                <>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: ACCENT }}>
                    {isEditingReading ? `Edit ${activeTab.label} reading` : `New ${activeTab.label} reading`}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <TextField label="Reading Time" type="time" size="small" fullWidth required
                        value={form.readingTime ?? ''}
                        onChange={(e) => updateTabField(activeTab.key, 'readingTime', e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }} />
                    </Grid>
                    {activeTab.groups.map((g) => (
                      <Fragment key={g.title}>
                        <Grid size={{ xs: 12 }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: ACCENT }}>
                            {g.title}
                          </Typography>
                        </Grid>
                        {g.fields.map((field) => {
                          const label = `${field.label}${field.unit ? ` (${field.unit})` : ''}`;
                          if (field.kind === 'calc') {
                            return (
                              <Grid key={field.key} size={{ xs: 12, sm: 6, md: 4 }}>
                                <TextField label={`${label} — Auto`} size="small" fullWidth disabled
                                  value={showCalc(calcFor(activeTab, field, form))}
                                  slotProps={{ input: { readOnly: true } }}
                                  sx={{ backgroundColor: '#F5F5F5' }} />
                              </Grid>
                            );
                          }
                          if (field.kind === 'cin') {
                            return (
                              <Grid key={field.key} size={{ xs: 12, sm: 6, md: 4 }}>
                                <TextField label={label} type="number" size="small" fullWidth
                                  value={form[field.key] ?? ''}
                                  onChange={(e) => updateTabField(activeTab.key, field.key, e.target.value)}
                                  helperText={(form[field.key] ?? '') === '' ? `Auto: ${showCalc(calcFor(activeTab, field, form))}` : (field.tag || undefined)} />
                              </Grid>
                            );
                          }
                          return (
                            <Grid key={field.key} size={{ xs: 12, sm: 6, md: 4 }}>
                              <TextField label={label} type={field.kind === 'text' ? 'text' : 'number'} size="small" fullWidth
                                value={form[field.key] ?? ''}
                                onChange={(e) => updateTabField(activeTab.key, field.key, e.target.value)}
                                helperText={field.tag || undefined} />
                            </Grid>
                          );
                        })}
                      </Fragment>
                    ))}
                    <Grid size={{ xs: 12 }}>
                      <TextField label="Remarks" size="small" fullWidth multiline rows={2}
                        value={form.remarks ?? ''}
                        onChange={(e) => updateTabField(activeTab.key, 'remarks', e.target.value)} />
                    </Grid>
                  </Grid>
                  <Stack direction="row" spacing={1.5} sx={{ mt: 2.5, mb: 3 }}>
                    <Button variant="contained" sx={{ backgroundColor: ACCENT, minWidth: 160 }}
                      onClick={() => handleSaveTab(activeTab)}
                      disabled={savingTab === activeTab.key}
                      startIcon={savingTab === activeTab.key ? <CircularProgress size={14} color="inherit" /> : isEditingReading ? <Save /> : <Add />}>
                      {savingTab === activeTab.key ? 'Saving...' : isEditingReading ? 'Update Reading' : 'Add Reading'}
                    </Button>
                    {isEditingReading && (
                      <Button onClick={() => cancelEditReading(activeTab)} startIcon={<Close />}>Cancel</Button>
                    )}
                  </Stack>
                </>
              )}

              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                {activeTab.label} readings for {dayjs(selectedDate).format('DD MMM YYYY')}
              </Typography>
              {activeReadings.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No {activeTab.label} readings recorded for this day yet.</Typography>
              ) : (
                <TableContainer sx={{ maxHeight: 360, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Time</TableCell>
                        {tableFields.map((f) => (
                          <TableCell key={f.key} sx={{ whiteSpace: 'nowrap' }}>{f.label}{f.unit ? ` (${f.unit})` : ''}</TableCell>
                        ))}
                        <TableCell>Remarks</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {activeReadings.map((r) => (
                        <TableRow key={r.id as string} data-record-id={r.id as string} hover selected={editingId[activeTab.key] === r.id}>
                          <TableCell>
                            {r.readingTime
                              ? <Chip label={fmtTime(r.readingTime as string)} size="small" sx={{ fontWeight: 700, backgroundColor: `${ACCENT}14`, color: ACCENT }} />
                              : <Tooltip title="Saved before times were introduced"><Typography variant="caption" color="text.disabled">No time</Typography></Tooltip>}
                          </TableCell>
                          {tableFields.map((f) => (
                            <TableCell key={f.key}>{r[f.key] != null ? String(r[f.key]) : '—'}</TableCell>
                          ))}
                          <TableCell sx={{ maxWidth: 220 }}>{(r.remarks as string) || '—'}</TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.25}>
                              {canEdit && (
                                <Tooltip title="Edit reading">
                                  <IconButton size="small" onClick={() => startEditReading(activeTab, r)}>
                                    <Edit sx={{ fontSize: 15, color: ACCENT }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                              {canDelete && (
                                <Tooltip title="Delete reading">
                                  <IconButton size="small" color="error"
                                    onClick={() => setDeleteItem({ kind: 'reading', tab: activeTab, id: r.id as string, label: `the ${activeTab.label} reading at ${fmtTime(r.readingTime as string)}` })}>
                                    <Delete sx={{ fontSize: 15 }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card sx={{ mb: 3 }}>
            <Box sx={{ px: 2.5, py: 1.5, backgroundColor: `${ACCENT}14`, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Timeline sx={{ color: ACCENT, fontSize: '1.1rem' }} />
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: ACCENT }}>
                  Timeline Log
                </Typography>
                <Chip label={log.entries.length} size="small" variant="outlined" />
              </Stack>
            </Box>
            <CardContent>
              {entryError && <Alert severity="error" onClose={() => setEntryError(null)} sx={{ mb: 2 }}>{entryError}</Alert>}
              {canSave && (
                <Box sx={{ mb: 3 }}>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6, md: 2 }}>
                      <TextField label="Time" type="time" size="small" fullWidth required
                        value={entryForm.time} onChange={(e) => handleEntryTimeChange(e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }} />
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <FormControl size="small" fullWidth>
                        <InputLabel>Shift</InputLabel>
                        <Select label="Shift" value={entryForm.shift} onChange={(e) => setEntryForm((p) => ({ ...p, shift: e.target.value }))}>
                          {SHIFTS.map((sh) => <MenuItem key={sh.code} value={sh.code}>{sh.label}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <SuggestAutocomplete label="Category" value={entryForm.category}
                        onChange={(v) => setEntryForm((p) => ({ ...p, category: v }))}
                        defaults={DESAL_CATEGORIES} learned={learnedCategories}
                        helperText="Pick one or type a new category" />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField label="Entry" size="small" fullWidth multiline rows={2} required
                        value={entryForm.text} onChange={(e) => setEntryForm((p) => ({ ...p, text: e.target.value }))} />
                    </Grid>
                  </Grid>
                  <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
                    <Button variant="contained" size="small" sx={{ backgroundColor: ACCENT }}
                      onClick={handleSaveEntry} disabled={savingEntry}
                      startIcon={savingEntry ? <CircularProgress size={14} color="inherit" /> : editingEntryId ? <Save /> : <Add />}>
                      {savingEntry ? 'Saving...' : editingEntryId ? 'Update Entry' : 'Add Entry'}
                    </Button>
                    {editingEntryId && <Button size="small" onClick={resetEntryForm} startIcon={<Close />}>Cancel</Button>}
                  </Stack>
                </Box>
              )}

              {log.entries.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No timeline entries for this day yet.</Typography>
              ) : (
                <Grid container spacing={3}>
                  {[{ code: 'DAY', title: 'Day Shift', items: dayEntries }, { code: 'NIGHT', title: 'Night Shift', items: nightEntries }].map((grp) => (
                    <Grid key={grp.code} size={{ xs: 12, md: 6 }}>
                      <Chip label={`${grp.title} (${grp.items.length})`} size="small"
                        sx={{ ...SHIFT_CHIP_STYLE[grp.code], fontWeight: 600, fontSize: 11, mb: 1 }} />
                      {grp.items.length === 0
                        ? <Typography variant="body2" color="text.disabled">No entries.</Typography>
                        : grp.items.map(renderEntry)}
                    </Grid>
                  ))}
                </Grid>
              )}
            </CardContent>
          </Card>

          <Card>
            <Box sx={{
              px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer', backgroundColor: `${ACCENT}14`,
              borderBottom: historyCollapsed ? 'none' : '1px solid', borderColor: 'divider',
            }} onClick={() => setHistoryCollapsed((p) => !p)}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <History sx={{ color: ACCENT, fontSize: '1.1rem' }} />
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: ACCENT }}>History</Typography>
                <Chip label={history.length} size="small" variant="outlined" />
              </Stack>
              <IconButton size="small">{historyCollapsed ? <ExpandMore fontSize="small" /> : <ExpandLess fontSize="small" />}</IconButton>
            </Box>
            <Collapse in={!historyCollapsed} timeout="auto" unmountOnExit>
              <CardContent>
                {loadingHistory ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>
                ) : historyGroups.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No desalination logs recorded for this plant yet.</Typography>
                ) : (
                  <TableContainer sx={{ maxHeight: 400 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Operator</TableCell>
                          <TableCell>Readings Recorded</TableCell>
                          <TableCell>Timeline</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {historyGroups.map((g) => (
                          <TableRow key={g.log.id} hover selected={g.log.logDate.split('T')[0] === selectedDate}>
                            <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{dayjs(g.log.logDate).format('DD MMM YYYY')}</Typography></TableCell>
                            <TableCell>{g.log.operator || '—'}</TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }} useFlexGap>
                                {g.present.length === 0
                                  ? <Typography variant="caption" color="text.disabled">None</Typography>
                                  : g.present.map((tab) => (
                                    <Chip key={tab.key} label={`${tab.label} × ${(g.log[tab.key] as unknown[]).length}`} size="small" variant="outlined"
                                      sx={{ color: ACCENT, borderColor: ACCENT, fontSize: 10 }} />
                                  ))}
                              </Stack>
                            </TableCell>
                            <TableCell>{g.log.entries?.length ? `${g.log.entries.length} entries` : '—'}</TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={0.5}>
                                <Tooltip title="Load for editing">
                                  <IconButton size="small" onClick={() => setSelectedDate(g.log.logDate.split('T')[0])}>
                                    <Edit sx={{ fontSize: 15, color: ACCENT }} />
                                  </IconButton>
                                </Tooltip>
                                {canDelete && (
                                  <Tooltip title="Delete log">
                                    <IconButton size="small" color="error" onClick={() => setDeleteTarget(g.log)}>
                                      <Delete sx={{ fontSize: 15 }} />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Collapse>
          </Card>
        </>
      )}

      {/* Delete reading / entry */}
      <Dialog open={!!deleteItem} onClose={() => !deletingItem && setDeleteItem(null)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>Delete {deleteItem?.label}? This cannot be undone.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteItem(null)} disabled={deletingItem}>Cancel</Button>
          <Button onClick={handleConfirmDeleteItem} color="error" variant="contained" disabled={deletingItem}
            startIcon={deletingItem ? <CircularProgress size={14} color="inherit" /> : <Delete />}>
            {deletingItem ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete log */}
      <Dialog open={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)}>
        <DialogTitle>Delete Desalination Log</DialogTitle>
        <DialogContent>
          {deleteError && <Alert severity="error" sx={{ mb: 2 }}>{deleteError}</Alert>}
          <DialogContentText>
            Delete the desalination log for {deleteTarget ? dayjs(deleteTarget.logDate).format('DD MMM YYYY') : ''}?
            This will remove all readings and timeline entries for that day.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={deleting}
            startIcon={deleting ? <CircularProgress size={14} color="inherit" /> : <Delete />}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

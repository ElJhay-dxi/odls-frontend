import {
  Box, Card, CardContent, TextField, Button, CircularProgress, Alert, Typography,
  MenuItem, FormControl, InputLabel, Select, Grid, Chip, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Collapse, Tab, Tabs,
} from '@mui/material';
import { Save, Add, FilterAlt, History, ExpandMore, ExpandLess, CheckCircle, FiberManualRecord, Edit, Delete } from '@mui/icons-material';
import { Tooltip, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import { useEffect, useState, useCallback, type SyntheticEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import PageHeader from '../../components/shared/PageHeader';
import PersonAutocomplete from '../../components/lab/PersonAutocomplete';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { labDesalinationApi } from '../../api/lab/labDesalinationApi';
import type { PowerPlant } from '../../types/masterData';
import type { LabDesalinationLog } from '../../types/lab';
import { useSectionPermissions, usePlantFilter } from '../../hooks/usePermission';
import { usePlantTypeGuard } from '../../hooks/usePlantTypeGuard';

const ACCENT = '#00695C';

type TabKey = 'uf' | 'swro' | 'bwro' | 'clarifier' | 'px' | 'productWater';
type LogSubKey = 'uf' | 'swro' | 'bwro' | 'clarifier' | 'px' | 'productWater';

interface TabConfig {
  key: TabKey;
  label: string;
  logKey: LogSubKey;
  saveFn: (logId: string, data: Record<string, unknown>) => Promise<{ data: LabDesalinationLog }>;
  fields: { key: string; label: string }[];
}

const TABS: TabConfig[] = [
  {
    key: 'uf', label: 'UF', logKey: 'uf', saveFn: labDesalinationApi.saveUF,
    fields: [
      { key: 'feedFlow', label: 'Feed Flow (m³/h)' },
      { key: 'permeateFlow', label: 'Permeate Flow (m³/h)' },
      { key: 'backwashFrequency', label: 'Backwash Frequency (min)' },
      { key: 'tmp', label: 'TMP (bar)' },
      { key: 'sdi', label: 'SDI' },
      { key: 'feedPressure', label: 'Feed Pressure (bar)' },
      { key: 'outletPressure', label: 'Outlet Pressure (bar)' },
      { key: 'feedTurbidity', label: 'Feed Turbidity (NTU)' },
      { key: 'filtrateTurbidity', label: 'Filtrate Turbidity (NTU)' },
    ],
  },
  {
    key: 'swro', label: 'SWRO', logKey: 'swro', saveFn: labDesalinationApi.saveSWRO,
    fields: [
      { key: 'feedPressure', label: 'Feed Pressure (bar)' },
      { key: 'permeatePressure', label: 'Permeate Pressure (bar)' },
      { key: 'recoveryRate', label: 'Recovery Rate (%)' },
      { key: 'saltRejection', label: 'Salt Rejection (%)' },
      { key: 'conductivity', label: 'Conductivity (µS/cm)' },
      { key: 'feedFlow', label: 'Feed Flow (m³/h)' },
      { key: 'rejectFlow', label: 'Reject Flow (m³/h)' },
      { key: 'feedConductivity', label: 'Feed Conductivity (µS/cm)' },
    ],
  },
  {
    key: 'bwro', label: 'BWRO', logKey: 'bwro', saveFn: labDesalinationApi.saveBWRO,
    fields: [
      { key: 'feedPressure', label: 'Feed Pressure (bar)' },
      { key: 'permeatePressure', label: 'Permeate Pressure (bar)' },
      { key: 'recoveryRate', label: 'Recovery Rate (%)' },
      { key: 'conductivity', label: 'Conductivity (µS/cm)' },
      { key: 'feedFlow', label: 'Feed Flow (m³/h)' },
      { key: 'rejectFlow', label: 'Reject Flow (m³/h)' },
    ],
  },
  {
    key: 'clarifier', label: 'Clarifier', logKey: 'clarifier', saveFn: labDesalinationApi.saveClarifier,
    fields: [
      { key: 'influentFlow', label: 'Influent Flow (m³/h)' },
      { key: 'effluentTurbidity', label: 'Effluent Turbidity (NTU)' },
      { key: 'sludgeLevel', label: 'Sludge Level (m)' },
      { key: 'chemicalDosingRate', label: 'Chemical Dosing Rate (L/h)' },
    ],
  },
  {
    key: 'px', label: 'PX', logKey: 'px', saveFn: labDesalinationApi.savePX,
    fields: [
      { key: 'efficiency', label: 'Efficiency (%)' },
      { key: 'flowRate', label: 'Flow Rate (m³/h)' },
      { key: 'pressure', label: 'Pressure (bar)' },
    ],
  },
  {
    key: 'productWater', label: 'Product Water', logKey: 'productWater', saveFn: labDesalinationApi.saveProductWater,
    fields: [
      { key: 'flowRate', label: 'Flow Rate (m³/h)' },
      { key: 'ph', label: 'pH' },
      { key: 'conductivity', label: 'Conductivity (µS/cm)' },
      { key: 'tds', label: 'TDS (mg/L)' },
      { key: 'chlorineResidual', label: 'Chlorine Residual (mg/L)' },
      { key: 'hardness', label: 'Hardness (mg/L)' },
    ],
  },
];

type TabForm = Record<string, string>;

const emptyTabForm = (tab: TabConfig): TabForm => {
  const f: TabForm = { remarks: '' };
  tab.fields.forEach((field) => { f[field.key] = ''; });
  return f;
};

const buildTabForms = (log: LabDesalinationLog | null): Record<TabKey, TabForm> => {
  const result = {} as Record<TabKey, TabForm>;
  TABS.forEach((tab) => {
    const sub = log?.[tab.logKey] as Record<string, unknown> | undefined;
    if (sub) {
      const f: TabForm = { remarks: (sub.remarks as string) ?? '' };
      tab.fields.forEach((field) => {
        const v = sub[field.key];
        f[field.key] = v != null ? String(v) : '';
      });
      result[tab.key] = f;
    } else {
      result[tab.key] = emptyTabForm(tab);
    }
  });
  return result;
};

export default function LabDesalinationPage() {
  const { canCreate, canEdit, canDelete } = useSectionPermissions('lab.desalination');
  const canSave = canCreate || canEdit;
  const isWrongPlantType = usePlantTypeGuard('thermal');
  const navigate = useNavigate();

  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const { availablePlants, plantLocked, autoPlantCode } = usePlantFilter(plants);

  const [selectedPlant, setSelectedPlant] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [log, setLog] = useState<LabDesalinationLog | null>(null);
  const [loadingLog, setLoadingLog] = useState(false);
  const [creatingLog, setCreatingLog] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [headerForm, setHeaderForm] = useState({ operator: '', remarks: '' });
  const [savingHeader, setSavingHeader] = useState(false);
  const [headerError, setHeaderError] = useState<string | null>(null);

  const [tabIndex, setTabIndex] = useState(0);
  const [tabForms, setTabForms] = useState<Record<TabKey, TabForm>>(buildTabForms(null));
  const [tabStatus, setTabStatus] = useState<Record<TabKey, 'idle' | 'saving' | 'saved' | 'error'>>({
    uf: 'idle', swro: 'idle', bwro: 'idle', clarifier: 'idle', px: 'idle', productWater: 'idle',
  });

  const [history, setHistory] = useState<LabDesalinationLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyCollapsed, setHistoryCollapsed] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<LabDesalinationLog | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    powerPlantApi.getAll().then((res) =>
      setPlants(res.data.filter((p) => p.classificationType?.toLowerCase() === 'thermal'))
    );
  }, []);

  useEffect(() => {
    if (autoPlantCode) setSelectedPlant(autoPlantCode);
  }, [autoPlantCode]);

  const loadLog = useCallback(() => {
    if (!selectedPlant || !selectedDate) { setLog(null); return; }
    setLoadingLog(true); setLoadError(null);
    labDesalinationApi.getByDate(selectedPlant, selectedDate)
      .then((res) => {
        const found = res.data ?? null;
        setLog(found);
        setHeaderForm({ operator: found?.operator ?? '', remarks: found?.remarks ?? '' });
        setTabForms(buildTabForms(found));
        setTabStatus({ uf: 'idle', swro: 'idle', bwro: 'idle', clarifier: 'idle', px: 'idle', productWater: 'idle' });
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
      // For each history entry, try to get full log with sub-sections
      const fullLogs = await Promise.allSettled(
        res.data.map((l) => labDesalinationApi.getById(l.id))
      );
      const populated = fullLogs
        .filter((r) => r.status === 'fulfilled')
        .map((r) => (r as PromiseFulfilledResult<{ data: LabDesalinationLog }>).value.data);
      setHistory(populated.sort((a, b) => b.logDate.localeCompare(a.logDate)));
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
        setLog(null);
        setTabForms(buildTabForms(null));
        setHeaderForm({ operator: '', remarks: '' });
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
      setLog(res.data);
      setHeaderForm({ operator: '', remarks: '' });
      setTabForms(buildTabForms(res.data));
      fetchHistory();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setLoadError(msg ?? 'Failed to create desalination log.');
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
    setTabStatus((prev) => ({ ...prev, [tab]: 'idle' }));
  };

  // ── Auto-computed, read-only fields ─────────────────────────────────────────
  const computeUFDiffPressure = () => {
    const feed = parseFloat(tabForms.uf.feedPressure || '0');
    const outlet = parseFloat(tabForms.uf.outletPressure || '0');
    if (!feed && !outlet) return '—';
    return (feed - outlet).toFixed(3);
  };

  const computeSWRORecovery = () => {
    const feed = parseFloat(tabForms.swro.feedFlow || '0');
    const reject = parseFloat(tabForms.swro.rejectFlow || '0');
    if (!feed || !reject) return '—';
    return (((feed - reject) / feed) * 100).toFixed(2) + ' %';
  };

  const computeSaltRejection = () => {
    const feedConductivity = parseFloat(tabForms.swro.feedConductivity || '0');
    const permeateConductivity = parseFloat(tabForms.swro.conductivity || '0');
    if (!feedConductivity || !permeateConductivity) return '—';
    return ((1 - permeateConductivity / feedConductivity) * 100).toFixed(2) + ' %';
  };

  const computeBWRORecovery = () => {
    const feed = parseFloat(tabForms.bwro.feedFlow || '0');
    const reject = parseFloat(tabForms.bwro.rejectFlow || '0');
    if (!feed || !reject) return '—';
    return (((feed - reject) / feed) * 100).toFixed(2) + ' %';
  };

  const handleSaveTab = async (tab: TabConfig) => {
    if (!log) return;
    setTabStatus((prev) => ({ ...prev, [tab.key]: 'saving' }));
    try {
      const formVals = tabForms[tab.key];
      const payload: Record<string, unknown> = { remarks: formVals.remarks || null };
      tab.fields.forEach((field) => {
        // feedConductivity is local only — used for salt rejection calc, not stored
        if (field.key === 'feedConductivity') return;
        payload[field.key] = formVals[field.key] !== '' ? Number(formVals[field.key]) : null;
      });
      if (tab.key === 'uf') {
        const feed = parseFloat(formVals.feedPressure || '0');
        const outlet = parseFloat(formVals.outletPressure || '0');
        payload.differentialPressure = (formVals.feedPressure || formVals.outletPressure) ? feed - outlet : null;
      }
      const res = await tab.saveFn(log.id, payload);
      setLog(res.data);
      setTabForms((prev) => ({ ...prev, [tab.key]: buildTabForms(res.data)[tab.key] }));
      setTabStatus((prev) => ({ ...prev, [tab.key]: 'saved' }));
      fetchHistory();
    } catch (err: unknown) {
      console.error('Save tab error:', err);
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      console.error('Error message:', msg);
      setTabStatus((prev) => ({ ...prev, [tab.key]: 'error' }));
    }
  };

  const historyGroups = history.map((h) => ({
    log: h,
    present: TABS.filter((tab) => {
      const sub = h[tab.logKey as keyof LabDesalinationLog];
      return sub != null && typeof sub === 'object';
    }),
  }));

  const showEmptyState = !selectedPlant;
  const activeTab = TABS[tabIndex];

  if (isWrongPlantType) return (
    <Alert severity="warning" sx={{ m: 3 }}>
      This section is only available for thermal plants.
      <Button size="small" onClick={() => navigate(-1)} sx={{ ml: 2 }}>Go Back</Button>
    </Alert>
  );

  return (
    <Box>
      <PageHeader
        title="Desalination Logs"
        subtitle="Daily desalination plant process readings"
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
              Create a log to begin recording process readings.
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
                  const sub = log[tab.logKey as keyof LabDesalinationLog];
                  const hasData = sub != null && typeof sub === 'object';
                  return (
                    <Tab key={tab.key} value={idx} label={
                      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                        <span>{tab.label}</span>
                        {hasData
                          ? <CheckCircle sx={{ fontSize: 14, color: '#1B5E20' }} />
                          : <FiberManualRecord sx={{ fontSize: 10, color: '#BDBDBD' }} />}
                      </Stack>
                    } />
                  );
                })}
              </Tabs>
            </Box>
            <CardContent>
              {tabStatus[activeTab.key] === 'error' && (
                <Alert severity="error" sx={{ mb: 2 }}>Failed to save {activeTab.label} readings.</Alert>
              )}
              {tabStatus[activeTab.key] === 'saved' && (
                <Alert severity="success" sx={{ mb: 2 }}>{activeTab.label} readings saved.</Alert>
              )}
              <Grid container spacing={2}>
                {activeTab.fields.map((field) => (
                  <Grid key={field.key} size={{ xs: 12, sm: 6, md: 4 }}>
                    <TextField label={field.label} type="number" size="small" fullWidth
                      value={tabForms[activeTab.key][field.key] ?? ''}
                      onChange={(e) => updateTabField(activeTab.key, field.key, e.target.value)}
                      disabled={!canSave} />
                  </Grid>
                ))}
                {activeTab.key === 'uf' && (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <TextField label="Differential Pressure (bar)" size="small" fullWidth
                      value={computeUFDiffPressure()}
                      disabled
                      slotProps={{ input: { readOnly: true } }}
                      helperText="Auto-computed: Feed − Outlet Pressure"
                      sx={{ backgroundColor: '#F5F5F5' }} />
                  </Grid>
                )}
                {activeTab.key === 'swro' && (
                  <>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <TextField label="Recovery Rate — Auto (%)" size="small" fullWidth
                        value={computeSWRORecovery()}
                        disabled
                        slotProps={{ input: { readOnly: true } }}
                        helperText="Auto-computed: ((Feed − Reject) / Feed) × 100"
                        sx={{ backgroundColor: '#F5F5F5' }} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <TextField label="Salt Rejection — Auto (%)" size="small" fullWidth
                        value={computeSaltRejection()}
                        disabled
                        slotProps={{ input: { readOnly: true } }}
                        helperText="Auto-computed: (1 − Permeate/Feed Conductivity) × 100"
                        sx={{ backgroundColor: '#F5F5F5' }} />
                    </Grid>
                  </>
                )}
                {activeTab.key === 'bwro' && (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <TextField label="Recovery Rate — Auto (%)" size="small" fullWidth
                      value={computeBWRORecovery()}
                      disabled
                      slotProps={{ input: { readOnly: true } }}
                      helperText="Auto-computed: ((Feed − Reject) / Feed) × 100"
                      sx={{ backgroundColor: '#F5F5F5' }} />
                  </Grid>
                )}
                <Grid size={{ xs: 12 }}>
                  <TextField label="Remarks" size="small" fullWidth multiline rows={2}
                    value={tabForms[activeTab.key].remarks ?? ''}
                    onChange={(e) => updateTabField(activeTab.key, 'remarks', e.target.value)}
                    disabled={!canSave} />
                </Grid>
              </Grid>
              {canSave && (
                <Button variant="contained" sx={{ mt: 2.5, backgroundColor: ACCENT, minWidth: 140 }}
                  onClick={() => handleSaveTab(activeTab)}
                  disabled={tabStatus[activeTab.key] === 'saving'}
                  startIcon={tabStatus[activeTab.key] === 'saving' ? <CircularProgress size={14} color="inherit" /> : <Save />}>
                  {tabStatus[activeTab.key] === 'saving' ? 'Saving...' : `Save ${activeTab.label}`}
                </Button>
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
                          <TableCell>Sections Recorded</TableCell>
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
                                    <Chip key={tab.key} label={tab.label} size="small" variant="outlined"
                                      sx={{ color: ACCENT, borderColor: ACCENT, fontSize: 10 }} />
                                  ))}
                              </Stack>
                            </TableCell>
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
    

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)}>
        <DialogTitle>Delete Desalination Log</DialogTitle>
        <DialogContent>
          {deleteError && <Alert severity="error" sx={{ mb: 2 }}>{deleteError}</Alert>}
          <DialogContentText>
            Delete the desalination log for {deleteTarget ? dayjs(deleteTarget.logDate).format('DD MMM YYYY') : ''}?
            This will remove all sub-section readings.
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
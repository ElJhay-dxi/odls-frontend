import {
  Box, Card, CardContent, CardHeader, TextField, Button, CircularProgress,
  Alert, Typography, MenuItem, FormControl, InputLabel, Select,
  Grid, Divider, Chip, Stack, Paper, IconButton, Tooltip, Collapse,
  OutlinedInput, Checkbox, ListItemText,
} from '@mui/material';
import {
  Save, Edit, Delete, Add, WaterDrop, ExpandMore, ExpandLess,
  Assignment, CheckCircle, Warning,
} from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { plantUnitApi } from '../../api/masterData/plantUnitApi';
import { plantBusApi } from '../../api/hourly/hourlyBusVoltageApi';
import { hydroStationLogApi } from '../../api/stationLog/hydroStationLogApi';
import type { PowerPlant, PlantUnit } from '../../types/masterData';
import type { PlantBus } from '../../types/plantBus';
import type {
  HydroStationLog,
  HydroStationLogEntry,
  UpdateHydroStationLogForm,
  CreateHydroStationLogEntryForm,
  UpdateHydroStationLogEntryForm,
} from '../../types/hydroStationLog';
import { useSectionPermissions, usePlantFilter } from '../../hooks/usePermission';
import { useUser } from '../../context/UserContext';

const emptyHeader: UpdateHydroStationLogForm = {
  unitsInService: '',
  linesInService: '',
  stationService: '',
  permitsInEffect: '',
  applicationsForOutage: '',
  miscNotes: '',
  energyGeneratedKwh: null,
  shiftLeaderName: '',
};

const emptyEntry: CreateHydroStationLogEntryForm = {
  entryTime: new Date().toTimeString().slice(0, 5),
  entryText: '',
};

const TEXT_HEADER_FIELDS = [
  { key: 'stationService',        label: 'Station Service' },
  { key: 'permitsInEffect',       label: 'Permits in Effect' },
  { key: 'applicationsForOutage', label: 'Applications for Outage' },
  { key: 'miscNotes',             label: 'Miscellaneous Notes' },
] as const;

type TextHeaderKey = typeof TEXT_HEADER_FIELDS[number]['key'];

// Parse comma-separated string to array
const toArray = (val?: string) => val ? val.split(',').map((s) => s.trim()).filter(Boolean) : [];
// Join array to comma-separated string
const toStr = (arr: string[]) => arr.join(', ');

export default function HydroStationLogPage() {
  const { canCreate, canEdit, canDelete } = useSectionPermissions('station_logs.hydro');
  const { isPlantUser, userPlantClassifications } = useUser();
  const navigate = useNavigate();
  const isWrongPlantType = isPlantUser && userPlantClassifications.length > 0 && !userPlantClassifications.includes('hydro');
  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const { availablePlants, plantLocked, autoPlantCode } = usePlantFilter(plants);
  const [plantUnits, setPlantUnits] = useState<PlantUnit[]>([]);
  const [plantBuses, setPlantBuses] = useState<PlantBus[]>([]);

  const [selectedPlant, setSelectedPlant] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [log, setLog] = useState<HydroStationLog | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Header state — split into structured (units/lines arrays) and text fields
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

  const [creatingLog, setCreatingLog] = useState(false);

  const [entryForm, setEntryForm] = useState<CreateHydroStationLogEntryForm>(emptyEntry);
  const [addingEntry, setAddingEntry] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);

  const [editingEntry, setEditingEntry] = useState<HydroStationLogEntry | null>(null);
  const [editEntryForm, setEditEntryForm] = useState<UpdateHydroStationLogEntryForm>({ entryTime: '', entryText: '' });
  const [savingEntry, setSavingEntry] = useState(false);

  const [deleteEntry, setDeleteEntry] = useState<HydroStationLogEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState(false);

  const [summaryEditing, setSummaryEditing] = useState(false);
  const [summaryForm, setSummaryForm] = useState({ energyGeneratedKwh: '', shiftLeaderName: '' });
  const [savingSummary, setSavingSummary] = useState(false);
  const [summaryCollapsed, setSummaryCollapsed] = useState(false);

  useEffect(() => {
    powerPlantApi.getAll().then((res) => {
      setPlants(res.data.filter((p) => p.classificationType?.toLowerCase() === 'hydro'));
    });
  }, []);

  useEffect(() => {
    if (autoPlantCode) setSelectedPlant(autoPlantCode);
  }, [autoPlantCode]);

  // Load units and buses when plant changes
  useEffect(() => {
    if (!selectedPlant) {
      setPlantUnits([]); setPlantBuses([]);
      return;
    }
    plantUnitApi.getByPlant(selectedPlant).then((res) => setPlantUnits(res.data));
    plantBusApi.getAll(selectedPlant).then((res) => setPlantBuses(res.data));
  }, [selectedPlant]);

  // Auto-load log when plant + date change
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
    setLoading(true);
    setLoadError(null);
    setLog(null);
    try {
      const res = await hydroStationLogApi.getByDate(selectedPlant, selectedDate);
      setLog(res.data);
      populateHeaderState(res.data);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status !== 404) setLoadError('Failed to load station log.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLog = async () => {
    setCreatingLog(true);
    setLoadError(null);
    try {
      await hydroStationLogApi.create({
        plantCode: selectedPlant,
        logDate: selectedDate,
        unitsInService: '', linesInService: '', stationService: '',
        permitsInEffect: '', applicationsForOutage: '', miscNotes: '',
      });
      await loadLog();
      setHeaderEditing(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setLoadError(msg ?? 'Failed to create station log.');
    } finally {
      setCreatingLog(false);
    }
  };

  const buildHeaderPayload = (): UpdateHydroStationLogForm => ({
    unitsInService: toStr(selectedUnits),
    linesInService: toStr(selectedBuses),
    ...headerTextForm,
    energyGeneratedKwh: log?.energyGeneratedKwh != null ? log.energyGeneratedKwh.toString() : null,
    shiftLeaderName: log?.shiftLeaderName ?? '',
  });

  const handleSaveHeader = async () => {
    if (!log) return;
    setSavingHeader(true);
    setHeaderError(null);
    try {
      const res = await hydroStationLogApi.update(log.id, buildHeaderPayload());
      setLog(res.data);
      populateHeaderState(res.data);
      setHeaderEditing(false);
    } catch {
      setHeaderError('Failed to save header.');
    } finally {
      setSavingHeader(false);
    }
  };

  const handleAddEntry = async () => {
    if (!log || !entryForm.entryTime || !entryForm.entryText.trim()) return;
    setAddingEntry(true);
    setEntryError(null);
    try {
      const res = await hydroStationLogApi.addEntry(log.id, entryForm);
      setLog((prev) => prev ? {
        ...prev,
        entries: [...prev.entries, res.data].sort((a, b) => a.entryTime.localeCompare(b.entryTime)),
      } : prev);
      setEntryForm({ entryTime: new Date().toTimeString().slice(0, 5), entryText: '' });
    } catch {
      setEntryError('Failed to add entry.');
    } finally {
      setAddingEntry(false);
    }
  };

  const openEditEntry = (entry: HydroStationLogEntry) => {
    setEditingEntry(entry);
    setEditEntryForm({ entryTime: entry.entryTime, entryText: entry.entryText });
  };

  const handleSaveEntry = async () => {
    if (!log || !editingEntry) return;
    setSavingEntry(true);
    try {
      const res = await hydroStationLogApi.updateEntry(log.id, editingEntry.id, editEntryForm);
      setLog((prev) => prev ? {
        ...prev,
        entries: prev.entries
          .map((e) => e.id === editingEntry.id ? res.data : e)
          .sort((a, b) => a.entryTime.localeCompare(b.entryTime)),
      } : prev);
      setEditingEntry(null);
    } catch {
      setEntryError('Failed to update entry.');
    } finally {
      setSavingEntry(false);
    }
  };

  const handleDeleteEntry = async () => {
    if (!log || !deleteEntry) return;
    setDeletingEntry(true);
    try {
      await hydroStationLogApi.deleteEntry(log.id, deleteEntry.id);
      setLog((prev) => prev ? {
        ...prev, entries: prev.entries.filter((e) => e.id !== deleteEntry.id),
      } : prev);
      setDeleteEntry(null);
    } catch {
      setEntryError('Failed to delete entry.');
    } finally {
      setDeletingEntry(false);
    }
  };

  const handleSaveSummary = async () => {
    if (!log) return;
    setSavingSummary(true);
    try {
      const res = await hydroStationLogApi.update(log.id, {
        unitsInService: log.unitsInService ?? '',
        linesInService: log.linesInService ?? '',
        stationService: log.stationService ?? '',
        permitsInEffect: log.permitsInEffect ?? '',
        applicationsForOutage: log.applicationsForOutage ?? '',
        miscNotes: log.miscNotes ?? '',
        energyGeneratedKwh: summaryForm.energyGeneratedKwh !== '' ? summaryForm.energyGeneratedKwh : null,
        shiftLeaderName: summaryForm.shiftLeaderName,
      });
      setLog(res.data);
      setSummaryEditing(false);
    } catch {
      setEntryError('Failed to save summary.');
    } finally {
      setSavingSummary(false);
    }
  };

  // Resolve display names from codes stored in log
  const getUnitName = (code: string) =>
    plantUnits.find((u) => u.unitCode === code)?.unitName ?? code;
  const getBusName = (code: string) =>
    plantBuses.find((b) => b.busCode === code)?.busName ?? code;

  const plantName = availablePlants.find((p) => p.plantCode === selectedPlant)?.plantName ?? selectedPlant;

  const renderMultiSelect = (
    label: string,
    items: { value: string; label: string }[],
    selected: string[],
    onChange: (val: string[]) => void,
    disabled?: boolean,
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
            <Chip key={val} size="small"
              label={items.find((i) => i.value === val)?.label ?? val}
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

      {/* ── Wrong plant type warning ── */}
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

      {/* ── Plant + Date Selector ── */}
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
              slotProps={{ inputLabel: { shrink: true } }}
            />
            {loading && <CircularProgress size={20} />}
            {log && !loading && (
              <Chip icon={<CheckCircle />} label="Log loaded" color="success" size="small" variant="outlined" />
            )}
          </Stack>
        </CardContent>
      </Card>

      {loadError && <Alert severity="error" onClose={() => setLoadError(null)} sx={{ mb: 2 }}>{loadError}</Alert>}

      {/* ── No log yet ── */}
      {!loading && !log && selectedPlant && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ textAlign: 'center', py: 5 }}>
            <Assignment sx={{ fontSize: '3rem', color: 'text.disabled', mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
              No station log for {plantName} on {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
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
          {/* ── Log Header ── */}
          <Card sx={{ mb: 3 }}>
            <Box sx={{
              px: 2.5, py: 1.5, display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', cursor: 'pointer',
              backgroundColor: '#1565C014',
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
                  {/* Units in Service */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                    {headerEditing ? (
                      renderMultiSelect(
                        'Units in Service',
                        plantUnits.map((u) => ({ value: u.unitCode, label: `${u.unitName} (${u.unitCode})` })),
                        selectedUnits,
                        setSelectedUnits,
                        plantUnits.length === 0,
                      )
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
                            : <Typography variant="body2" sx={{ fontStyle: 'italic', color: '#999' }}>Not specified</Typography>
                          }
                        </Stack>
                      </Box>
                    )}
                  </Grid>

                  {/* Lines in Service */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                    {headerEditing ? (
                      renderMultiSelect(
                        'Lines in Service',
                        plantBuses.map((b) => ({ value: b.busCode, label: `${b.busName} (${b.busCode})` })),
                        selectedBuses,
                        setSelectedBuses,
                        plantBuses.length === 0,
                      )
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
                            : <Typography variant="body2" sx={{ fontStyle: 'italic', color: '#999' }}>Not specified</Typography>
                          }
                        </Stack>
                      </Box>
                    )}
                  </Grid>

                  {/* Text fields */}
                  {TEXT_HEADER_FIELDS.map((field) => (
                    <Grid key={field.key} size={{ xs: 12, sm: 6 }}>
                      {headerEditing ? (
                        <TextField label={field.label} fullWidth multiline maxRows={3} size="small"
                          value={headerTextForm[field.key as TextHeaderKey]}
                          onChange={(e) => setHeaderTextForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        />
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
                      onClick={() => { setHeaderEditing(false); populateHeaderState(log); }}
                      disabled={savingHeader}>Cancel</Button>
                    <Button variant="contained" size="small" onClick={handleSaveHeader}
                      disabled={savingHeader}
                      startIcon={savingHeader ? <CircularProgress size={14} color="inherit" /> : <Save />}>
                      {savingHeader ? 'Saving...' : 'Save Header'}
                    </Button>
                  </Stack>
                )}
              </CardContent>
            </Collapse>
          </Card>

          {/* ── Running Log ── */}
          <Card sx={{ mb: 3 }}>
            <CardHeader
              title={
                <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1.5}>
                  <Typography sx={{ fontWeight: 700 }}>Station Log Entries</Typography>
                  <Chip label={`${log.entries.length} entries`} size="small" variant="outlined" />
                </Stack>
              }
            />
            <Divider />
            <CardContent>
              {entryError && <Alert severity="error" onClose={() => setEntryError(null)} sx={{ mb: 2 }}>{entryError}</Alert>}

              {/* Add Entry Bar */}
              {canCreate && (
                <Paper variant="outlined" sx={{ p: 1.5, mb: 2.5, borderRadius: 2, backgroundColor: '#F8F9FA' }}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
                    <TextField label="Time" type="time" size="small" sx={{ width: 120 }}
                      value={entryForm.entryTime}
                      onChange={(e) => setEntryForm((prev) => ({ ...prev, entryTime: e.target.value }))}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                    <TextField label="Entry" size="small" fullWidth multiline maxRows={4}
                      value={entryForm.entryText}
                      onChange={(e) => setEntryForm((prev) => ({ ...prev, entryText: e.target.value }))}
                      placeholder="Record an observation, action or event…"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddEntry(); }
                      }}
                    />
                    <Button variant="contained" size="small" sx={{ minWidth: 80, mt: 0.5 }}
                      startIcon={addingEntry ? <CircularProgress size={14} color="inherit" /> : <Add />}
                      onClick={handleAddEntry}
                      disabled={addingEntry || !entryForm.entryTime || !entryForm.entryText.trim()}>
                      {addingEntry ? '...' : 'Add'}
                    </Button>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    Press Enter to add quickly · Shift+Enter for new line
                  </Typography>
                </Paper>
              )}

              {/* Entry Timeline */}
              {log.entries.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No entries yet. Add the first log entry above.
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={0}>
                  {log.entries.map((entry, idx) => (
                    <Box key={entry.id}>
                      {editingEntry?.id === entry.id ? (
                        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, my: 0.5 }}>
                          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
                            <TextField label="Time" type="time" size="small" sx={{ width: 120 }}
                              value={editEntryForm.entryTime}
                              onChange={(e) => setEditEntryForm((prev) => ({ ...prev, entryTime: e.target.value }))}
                              slotProps={{ inputLabel: { shrink: true } }}
                            />
                            <TextField size="small" fullWidth multiline maxRows={6}
                              value={editEntryForm.entryText}
                              onChange={(e) => setEditEntryForm((prev) => ({ ...prev, entryText: e.target.value }))}
                            />
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
                          display: 'flex', alignItems: 'flex-start', gap: 1.5,
                          py: 1, px: 0.5,
                          borderBottom: idx < log.entries.length - 1 ? '1px solid' : 'none',
                          borderColor: 'divider',
                          '&:hover .entry-actions': { opacity: 1 },
                        }}>
                          <Typography variant="body2"
                            sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#1565C0',
                              minWidth: 50, pt: 0.1, fontSize: 13 }}>
                            {entry.entryTime}
                          </Typography>
                          <Typography variant="body2" sx={{ flex: 1, lineHeight: 1.6 }}>
                            {entry.entryText}
                          </Typography>
                          <Stack direction="row" className="entry-actions"
                            sx={{ opacity: 0, transition: 'opacity 0.15s', alignItems: 'center' }}>
                            <Typography variant="caption" color="text.disabled" sx={{ mr: 0.5 }}>
                              {entry.createdByName}
                            </Typography>
                            {canEdit && (
                              <Tooltip title="Edit">
                                <IconButton size="small" onClick={() => openEditEntry(entry)}>
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
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>

          {/* ── Energy Summary ── */}
          <Card>
            <Box sx={{
              px: 2.5, py: 1.5, display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', cursor: 'pointer',
              backgroundColor: '#1B5E2014',
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
                        slotProps={{ htmlInput: { min: 0, step: 0.001 } }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField label="Shift Leader" fullWidth size="small"
                        value={summaryForm.shiftLeaderName}
                        onChange={(e) => setSummaryForm((prev) => ({ ...prev, shiftLeaderName: e.target.value }))}
                        placeholder="Name of shift leader"
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Stack direction="row" spacing={1.5}>
                        <Button variant="outlined" size="small"
                          onClick={() => setSummaryEditing(false)} disabled={savingSummary}>Cancel</Button>
                        <Button variant="contained" size="small" onClick={handleSaveSummary}
                          disabled={savingSummary}
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
                        {log.shiftLeaderName ||
                          <span style={{ color: '#999', fontStyle: 'italic' }}>Not recorded</span>}
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
        message={`Delete the entry at ${deleteEntry?.entryTime}: "${deleteEntry?.entryText?.slice(0, 60)}${(deleteEntry?.entryText?.length ?? 0) > 60 ? '…' : ''}"?`}
        confirmLabel="Delete" loading={deletingEntry}
        onConfirm={handleDeleteEntry} onCancel={() => setDeleteEntry(null)}
      />
    </Box>
  );
}
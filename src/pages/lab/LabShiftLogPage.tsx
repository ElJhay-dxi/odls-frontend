import {
  Box, Card, CardContent, CardHeader, TextField, Button,
  CircularProgress, Alert, Typography, MenuItem, FormControl,
  InputLabel, Select, Grid, Divider, Chip, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, IconButton, Tooltip, Collapse,
} from '@mui/material';
import { Save, Add, Edit, Delete, Science, History, ExpandMore, ExpandLess } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import PersonAutocomplete from '../../components/lab/PersonAutocomplete';
import DesignationAutocomplete from '../../components/lab/DesignationAutocomplete';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { labShiftLogApi } from '../../api/lab/labShiftLogApi';
import type { PowerPlant } from '../../types/masterData';
import type { LabShiftLog, LabShiftLogEntry } from '../../types/lab';
import { useSectionPermissions, usePlantFilter } from '../../hooks/usePermission';
import { usePlantTypeGuard } from '../../hooks/usePlantTypeGuard';

const ACCENT = '#00695C';

const ENTRY_SHIFTS = [
  { code: 'DAY', label: 'Day Shift (07:00–19:00)' },
  { code: 'NIGHT', label: 'Night Shift (19:00–07:00)' },
];
const SHIFT_CHIP_STYLE: Record<string, { backgroundColor: string; color: string }> = {
  DAY: { backgroundColor: '#E3F2FD', color: '#1565C0' },
  NIGHT: { backgroundColor: '#EDE7F6', color: '#4A148C' },
};

const CATEGORIES = ['Observation', 'Action', 'Sample Taken', 'Incident'];
const CATEGORY_COLORS: Record<string, string> = {
  Observation: '#1565C0',
  Action: '#1B5E20',
  'Sample Taken': '#E65100',
  Incident: '#B71C1C',
};

const emptyCreateForm = { shiftLeaderName: '', shiftLeaderDesignation: '', remarks: '' };
const emptyHeaderForm = { shiftLeaderName: '', shiftLeaderDesignation: '', remarks: '' };

const getDefaultShiftCode = (): string => {
  const hour = new Date().getHours();
  return hour >= 7 && hour < 19 ? 'DAY' : 'NIGHT';
};

const buildDefaultEntryForm = () => ({
  entryTime: new Date().toTimeString().slice(0, 5),
  shiftCode: getDefaultShiftCode(),
  category: 'Observation',
  entryText: '',
});

export default function LabShiftLogPage() {
  const { canCreate, canEdit, canDelete } = useSectionPermissions('lab.shift_logs');
  const isWrongPlantType = usePlantTypeGuard('thermal');
  const navigate = useNavigate();

  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const { availablePlants, plantLocked, autoPlantCode } = usePlantFilter(plants);

  const [selectedPlant, setSelectedPlant] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [log, setLog] = useState<LabShiftLog | null>(null);
  const [loadingLog, setLoadingLog] = useState(false);
  const [creatingLog, setCreatingLog] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState(emptyCreateForm);

  const [headerForm, setHeaderForm] = useState(emptyHeaderForm);
  const [savingHeader, setSavingHeader] = useState(false);
  const [headerError, setHeaderError] = useState<string | null>(null);

  const [entryForm, setEntryForm] = useState(buildDefaultEntryForm);
  const [addingEntry, setAddingEntry] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [deleteEntryTarget, setDeleteEntryTarget] = useState<LabShiftLogEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState(false);

  const [history, setHistory] = useState<LabShiftLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyCollapsed, setHistoryCollapsed] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [deleteLog, setDeleteLog] = useState<LabShiftLog | null>(null);
  const [deletingLog, setDeletingLog] = useState(false);

  useEffect(() => {
    powerPlantApi.getAll().then((res) =>
      setPlants(res.data.filter((p) => p.classificationType?.toLowerCase() === 'thermal'))
    );
  }, []);

  useEffect(() => {
    if (autoPlantCode) setSelectedPlant(autoPlantCode);
  }, [autoPlantCode]);

  const loadLog = async () => {
    setLoadingLog(true); setLoadError(null); setLog(null);
    try {
      const res = await labShiftLogApi.getByDate(selectedPlant, selectedDate);
      setLog(res.data);
      setHeaderForm({
        shiftLeaderName: res.data.shiftLeaderName ?? '',
        shiftLeaderDesignation: res.data.shiftLeaderDesignation ?? '',
        remarks: res.data.remarks ?? '',
      });
      setEntryForm(buildDefaultEntryForm());
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        setCreateForm(emptyCreateForm);
      } else {
        setLoadError('Failed to load shift log.');
      }
    } finally {
      setLoadingLog(false);
    }
  };

  useEffect(() => {
    if (!selectedPlant || !selectedDate) { setLog(null); return; }
    loadLog();
  }, [selectedPlant, selectedDate]);

  const loadHistory = async () => {
    if (!selectedPlant) { setHistory([]); return; }
    setLoadingHistory(true);
    try {
      const res = await labShiftLogApi.getAll({ plantCode: selectedPlant });
      setHistory(res.data.sort((a, b) => b.logDate.localeCompare(a.logDate)));
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (!selectedPlant) return;
    loadHistory();
  }, [selectedPlant]);

  const handleCreateLog = async () => {
    setCreatingLog(true); setLoadError(null);
    try {
      const res = await labShiftLogApi.create({
        plantCode: selectedPlant,
        logDate: selectedDate,
        shiftLeaderName: createForm.shiftLeaderName,
        shiftLeaderDesignation: createForm.shiftLeaderDesignation,
        remarks: createForm.remarks,
      });
      setLog(res.data);
      setHeaderForm({
        shiftLeaderName: res.data.shiftLeaderName ?? '',
        shiftLeaderDesignation: res.data.shiftLeaderDesignation ?? '',
        remarks: res.data.remarks ?? '',
      });
      setCreateForm(emptyCreateForm);
      loadHistory();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setLoadError(msg ?? 'Failed to create shift log.');
    } finally {
      setCreatingLog(false);
    }
  };

  const handleSaveHeader = async () => {
    if (!log) return;
    setSavingHeader(true); setHeaderError(null);
    try {
      const res = await labShiftLogApi.update(log.id, headerForm);
      setLog(res.data);
      loadHistory();
    } catch {
      setHeaderError('Failed to save shift log header.');
    } finally {
      setSavingHeader(false);
    }
  };

  const handleAddEntry = async () => {
    if (!log || !entryForm.entryTime || !entryForm.entryText.trim()) return;
    setAddingEntry(true); setEntryError(null);
    try {
      const res = await labShiftLogApi.addEntry(log.id, {
        entryTime: entryForm.entryTime,
        shiftCode: entryForm.shiftCode,
        category: entryForm.category,
        entryText: entryForm.entryText,
      });
      setLog((prev) => prev ? {
        ...prev,
        entries: [...prev.entries, res.data].sort((a, b) => a.entryTime.localeCompare(b.entryTime)),
      } : prev);
      setEntryForm(buildDefaultEntryForm());
    } catch {
      setEntryError('Failed to add entry.');
    } finally {
      setAddingEntry(false);
    }
  };

  const handleDeleteEntry = async () => {
    if (!log || !deleteEntryTarget) return;
    setDeletingEntry(true);
    try {
      await labShiftLogApi.deleteEntry(log.id, deleteEntryTarget.id);
      setLog((prev) => prev ? { ...prev, entries: prev.entries.filter((e) => e.id !== deleteEntryTarget.id) } : prev);
      setDeleteEntryTarget(null);
    } catch {
      setEntryError('Failed to delete entry.');
    } finally {
      setDeletingEntry(false);
    }
  };

  const handleDeleteLog = async () => {
    if (!deleteLog) return;
    setDeletingLog(true);
    try {
      await labShiftLogApi.delete(deleteLog.id);
      setHistory((prev) => prev.filter((l) => l.id !== deleteLog.id));
      if (log?.id === deleteLog.id) {
        setLog(null);
      }
      setDeleteLog(null);
    } catch {
      setHistoryError('Failed to delete shift log.');
    } finally {
      setDeletingLog(false);
    }
  };

  const renderEntry = (entry: LabShiftLogEntry) => (
    <Stack key={entry.id} direction="row" spacing={1.5} sx={{ alignItems: 'center', p: 1, borderRadius: 1, backgroundColor: 'action.hover' }}>
      <Chip label={entry.entryTime} size="small" variant="outlined" sx={{ fontFamily: 'monospace' }} />
      <Chip label={entry.shiftCode === 'DAY' ? 'Day Shift' : 'Night Shift'} size="small"
        sx={{ ...(SHIFT_CHIP_STYLE[entry.shiftCode] ?? SHIFT_CHIP_STYLE.DAY), fontWeight: 600, fontSize: 11 }} />
      <Chip label={entry.category} size="small"
        sx={{ backgroundColor: CATEGORY_COLORS[entry.category] ?? '#9E9E9E', color: '#fff', fontWeight: 600 }} />
      <Typography variant="body2" sx={{ flex: 1 }}>{entry.entryText}</Typography>
      {canDelete && (
        <Tooltip title="Delete">
          <IconButton size="small" color="error" onClick={() => setDeleteEntryTarget(entry)}>
            <Delete fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Stack>
  );

  const dayEntries = log ? log.entries.filter((e) => e.shiftCode === 'DAY').sort((a, b) => a.entryTime.localeCompare(b.entryTime)) : [];
  const nightEntries = log ? log.entries.filter((e) => e.shiftCode === 'NIGHT').sort((a, b) => a.entryTime.localeCompare(b.entryTime)) : [];

  const showEmptyState = !selectedPlant || !selectedDate;

  if (isWrongPlantType) return (
    <Alert severity="warning" sx={{ m: 3 }}>
      This section is only available for thermal plants.
      <Button size="small" onClick={() => navigate(-1)} sx={{ ml: 2 }}>Go Back</Button>
    </Alert>
  );

  return (
    <Box>
      <PageHeader
        title="Lab Shift Log"
        subtitle="Chemical laboratory shift records and observations"
        breadcrumbs={[{ label: 'Chemical Lab' }, { label: 'Lab Shift Log' }]}
      />

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, sm: 4 }}>
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
              <Grid size={{ xs: 12, sm: 2 }}>
                <CircularProgress size={20} />
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {loadError && <Alert severity="error" onClose={() => setLoadError(null)} sx={{ mb: 2 }}>{loadError}</Alert>}

      {showEmptyState ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Science sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">Select a plant and date to load the shift log.</Typography>
        </Box>
      ) : !loadingLog && !log ? (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Science sx={{ fontSize: '3rem', color: 'text.disabled', mb: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                No shift log for {dayjs(selectedDate).format('DD MMM YYYY')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Create a log to begin recording entries for this date.
              </Typography>
            </Box>
            {canCreate && (
              <>
                <Grid container spacing={2} sx={{ maxWidth: 640, mx: 'auto' }}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <PersonAutocomplete label="Shift Leader Name" plantCode={selectedPlant}
                      value={createForm.shiftLeaderName}
                      onChange={(v) => setCreateForm((p) => ({ ...p, shiftLeaderName: v }))} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <DesignationAutocomplete label="Shift Leader Designation"
                      value={createForm.shiftLeaderDesignation}
                      onChange={(v) => setCreateForm((p) => ({ ...p, shiftLeaderDesignation: v }))} />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField label="Remarks" size="small" fullWidth
                      value={createForm.remarks}
                      onChange={(e) => setCreateForm((p) => ({ ...p, remarks: e.target.value }))} />
                  </Grid>
                </Grid>
                <Box sx={{ textAlign: 'center', mt: 2.5 }}>
                  <Button variant="contained" sx={{ backgroundColor: ACCENT }}
                    startIcon={creatingLog ? <CircularProgress size={16} color="inherit" /> : <Add />}
                    onClick={handleCreateLog} disabled={creatingLog}>
                    {creatingLog ? 'Creating...' : 'Create Log'}
                  </Button>
                </Box>
              </>
            )}
          </CardContent>
        </Card>
      ) : log && (
        <>
          <Card sx={{ mb: 3 }}>
            <Box sx={{ px: 2.5, py: 1.5, backgroundColor: `${ACCENT}14`, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: ACCENT }}>
                Shift Header
              </Typography>
            </Box>
            <CardContent>
              {headerError && <Alert severity="error" onClose={() => setHeaderError(null)} sx={{ mb: 2 }}>{headerError}</Alert>}
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <PersonAutocomplete label="Shift Leader Name" plantCode={selectedPlant}
                    value={headerForm.shiftLeaderName}
                    onChange={(v) => setHeaderForm((p) => ({ ...p, shiftLeaderName: v }))} />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <DesignationAutocomplete label="Shift Leader Designation"
                    value={headerForm.shiftLeaderDesignation}
                    onChange={(v) => setHeaderForm((p) => ({ ...p, shiftLeaderDesignation: v }))} />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField label="Remarks" size="small" fullWidth
                    value={headerForm.remarks}
                    onChange={(e) => setHeaderForm((p) => ({ ...p, remarks: e.target.value }))} />
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
            <CardHeader title={
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Typography sx={{ fontWeight: 700 }}>Timeline</Typography>
                <Chip label={`${log.entries.length} entries`} size="small" variant="outlined" />
              </Stack>
            } />
            <Divider />
            <CardContent>
              {entryError && <Alert severity="error" onClose={() => setEntryError(null)} sx={{ mb: 2 }}>{entryError}</Alert>}

              {canCreate && (
                <Stack direction="row" spacing={1.5} sx={{ mb: 2.5, alignItems: 'flex-start', flexWrap: 'wrap' }} useFlexGap>
                  <TextField label="Time" type="time" size="small" sx={{ width: 120 }}
                    value={entryForm.entryTime}
                    onChange={(e) => setEntryForm((p) => ({ ...p, entryTime: e.target.value }))}
                    slotProps={{ inputLabel: { shrink: true } }} />
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>Shift</InputLabel>
                    <Select
                      value={entryForm.shiftCode}
                      label="Shift"
                      onChange={(e) => setEntryForm((prev) => ({ ...prev, shiftCode: e.target.value }))}
                    >
                      {ENTRY_SHIFTS.map((s) => <MenuItem key={s.code} value={s.code}>{s.label}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ width: 160 }}>
                    <InputLabel>Category</InputLabel>
                    <Select label="Category" value={entryForm.category}
                      onChange={(e) => setEntryForm((p) => ({ ...p, category: e.target.value }))}>
                      {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <TextField label="Entry" size="small" sx={{ flex: 1, minWidth: 240 }}
                    value={entryForm.entryText}
                    onChange={(e) => setEntryForm((p) => ({ ...p, entryText: e.target.value }))}
                    placeholder="Record an observation, action or event…" />
                  <Button variant="contained" size="small" sx={{ backgroundColor: ACCENT, mt: 0.25 }}
                    startIcon={addingEntry ? <CircularProgress size={14} color="inherit" /> : <Add />}
                    onClick={handleAddEntry}
                    disabled={addingEntry || !entryForm.entryTime || !entryForm.entryText.trim()}>
                    {addingEntry ? '...' : 'Add'}
                  </Button>
                </Stack>
              )}

              {log.entries.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  No entries recorded yet.
                </Typography>
              ) : (
                <>
                  <Box sx={{ mb: 2 }}>
                    <Divider sx={{ mb: 1.5 }}>
                      <Chip label="Day Shift (07:00–19:00)" size="small"
                        sx={{ backgroundColor: '#E3F2FD', color: '#1565C0', fontWeight: 700 }} />
                    </Divider>
                    {dayEntries.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ pl: 2, fontStyle: 'italic' }}>
                        No entries for day shift
                      </Typography>
                    ) : (
                      <Stack spacing={1}>{dayEntries.map((entry) => renderEntry(entry))}</Stack>
                    )}
                  </Box>

                  <Box>
                    <Divider sx={{ mb: 1.5 }}>
                      <Chip label="Night Shift (19:00–07:00)" size="small"
                        sx={{ backgroundColor: '#EDE7F6', color: '#4A148C', fontWeight: 700 }} />
                    </Divider>
                    {nightEntries.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ pl: 2, fontStyle: 'italic' }}>
                        No entries for night shift
                      </Typography>
                    ) : (
                      <Stack spacing={1}>{nightEntries.map((entry) => renderEntry(entry))}</Stack>
                    )}
                  </Box>
                </>
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
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: ACCENT }}>
                  History
                </Typography>
                <Chip label={history.length} size="small" variant="outlined" />
              </Stack>
              <IconButton size="small">
                {historyCollapsed ? <ExpandMore fontSize="small" /> : <ExpandLess fontSize="small" />}
              </IconButton>
            </Box>
            <Collapse in={!historyCollapsed} timeout="auto" unmountOnExit>
              <CardContent>
                {historyError && <Alert severity="error" onClose={() => setHistoryError(null)} sx={{ mb: 1.5 }}>{historyError}</Alert>}
                {loadingHistory ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : history.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No shift logs recorded for this plant yet.</Typography>
                ) : (
                  <TableContainer sx={{ maxHeight: 400 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Shift Leader</TableCell>
                          <TableCell>Entries</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {history.map((h) => (
                          <TableRow key={h.id} hover
                            selected={h.logDate.split('T')[0] === selectedDate}
                            sx={{ cursor: 'pointer' }}
                            onClick={() => setSelectedDate(h.logDate.split('T')[0])}>
                            <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{dayjs(h.logDate).format('DD MMM YYYY')}</Typography></TableCell>
                            <TableCell>{h.shiftLeaderName || '—'}</TableCell>
                            <TableCell>{h.entries.length}</TableCell>
                            <TableCell align="right">
                              {canEdit && (
                                <Tooltip title="Load for editing">
                                  <IconButton size="small" onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDate(h.logDate.split('T')[0]);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                  }}>
                                    <Edit sx={{ fontSize: 14 }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                              {canDelete && (
                                <Tooltip title="Delete log">
                                  <IconButton size="small" color="error"
                                    onClick={(e) => { e.stopPropagation(); setDeleteLog(h); }}>
                                    <Delete sx={{ fontSize: 14 }} />
                                  </IconButton>
                                </Tooltip>
                              )}
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

      <ConfirmDialog open={!!deleteEntryTarget} title="Delete Entry"
        message={`Delete this ${deleteEntryTarget?.category.toLowerCase()} entry at ${deleteEntryTarget?.entryTime}?`}
        confirmLabel="Delete" loading={deletingEntry}
        onConfirm={handleDeleteEntry} onCancel={() => setDeleteEntryTarget(null)} />

      <ConfirmDialog
        open={!!deleteLog}
        title="Delete Shift Log"
        message={`Delete the shift log for ${deleteLog?.logDate ? new Date(deleteLog.logDate).toLocaleDateString() : ''}? This will remove all entries.`}
        confirmLabel="Delete"
        loading={deletingLog}
        onConfirm={handleDeleteLog}
        onCancel={() => setDeleteLog(null)}
      />
    </Box>
  );
}

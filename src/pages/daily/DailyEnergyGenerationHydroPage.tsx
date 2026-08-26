import {
  Box, Card, CardContent, CardHeader, TextField, Button,
  CircularProgress, Alert, Typography, MenuItem, FormControl,
  InputLabel, Select, Grid, Divider, Chip, Stack, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, IconButton, Tooltip,
} from '@mui/material';
import { Save, Search, Edit, Delete, WaterDrop, History } from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { dailyEnergyGenerationHydroApi } from '../../api/daily/dailyEnergyGenerationHydroApi';
import type { PowerPlant } from '../../types/masterData';
import type { DailyEnergyGenerationHydro, DailyEnergyGenHydroForm } from '../../types/dailyEnergyGenerationHydro';
import { useSectionPermissions, usePlantFilter } from '../../hooks/usePermission';
import { usePlantTypeGuard } from '../../hooks/usePlantTypeGuard';

const emptyForm: DailyEnergyGenHydroForm = {
  plantCode: '',
  logDate: new Date().toISOString().split('T')[0],
  currentReading: '',
  averagePowerFactor: '',
  akosomboPeakLoadMW: '',
  akosomboPeakLoadTime: '',
};

const toNum = (v: unknown) => v === '' || v === undefined || v === null ? undefined : Number(v);

export default function DailyEnergyGenerationHydroPage() {
  const { canCreate, canEdit, canDelete } = useSectionPermissions('daily.energy_hydro');
  const isWrongPlantType = usePlantTypeGuard('hydro');
  const navigate = useNavigate();

  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const { availablePlants, plantLocked, autoPlantCode } = usePlantFilter(plants);

  const [form, setForm] = useState<DailyEnergyGenHydroForm>(emptyForm);
  const [updateForm, setUpdateForm] = useState<Partial<DailyEnergyGenHydroForm>>({});
  const [editTarget, setEditTarget] = useState<DailyEnergyGenerationHydro | null>(null);
  const [manualPreviousReading, setManualPreviousReading] = useState('');
  const [priorRecord, setPriorRecord] = useState<DailyEnergyGenerationHydro | null>(null);
  const [loadingPrior, setLoadingPrior] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [filterPlant, setFilterPlant] = useState('');
  const [records, setRecords] = useState<DailyEnergyGenerationHydro[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DailyEnergyGenerationHydro | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    powerPlantApi.getAll().then((res) => {
      setPlants(res.data.filter((p) => p.classificationType === 'Hydro'));
    });
  }, []);

  useEffect(() => {
    if (autoPlantCode) {
      setForm((prev) => ({ ...prev, plantCode: autoPlantCode }));
      setFilterPlant(autoPlantCode);
    }
  }, [autoPlantCode]);

  useEffect(() => {
    if (editTarget || !form.plantCode || !form.logDate) { setPriorRecord(null); return; }
    setLoadingPrior(true);
    dailyEnergyGenerationHydroApi.getAll({ plantCode: form.plantCode })
      .then((res) => {
        const prior = res.data.filter((r) => r.logDate.split('T')[0] < form.logDate).sort((a, b) => b.logDate.localeCompare(a.logDate))[0];
        setPriorRecord(prior ?? null);
        if (prior) setManualPreviousReading('');
      })
      .catch(() => setPriorRecord(null))
      .finally(() => setLoadingPrior(false));
  }, [form.plantCode, form.logDate, editTarget]);

  const fetchRecords = useCallback(async () => {
    if (!filterPlant) return;
    setLoadingRecords(true); setRecordsError(null);
    try {
      const res = await dailyEnergyGenerationHydroApi.getAll({ plantCode: filterPlant });
      setRecords(res.data.sort((a, b) => b.logDate.localeCompare(a.logDate)));
    } catch { setRecordsError('Failed to load records.'); }
    finally { setLoadingRecords(false); }
  }, [filterPlant]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const activeForm = editTarget ? (updateForm as unknown as Record<string, unknown>) : (form as unknown as Record<string, unknown>);
  const fv = (key: string) => String(activeForm[key] ?? '');
  const setField = (key: string, val: string) => {
    if (editTarget) setUpdateForm((prev) => ({ ...prev, [key]: val }));
    else setForm((prev) => ({ ...prev, [key]: val } as DailyEnergyGenHydroForm));
  };

  const isFirstEntry = !editTarget && !priorRecord && !loadingPrior;
  const previewPreviousReading = editTarget ? editTarget.previousReading : priorRecord ? priorRecord.currentReading : Number(manualPreviousReading) || 0;
  const previewPriorProgressiveTotal = editTarget ? editTarget.progressiveTotal - editTarget.difference : (priorRecord?.progressiveTotal ?? 0);
  const currentReadingVal = Number(fv('currentReading')) || 0;
  const previewDifference = currentReadingVal - previewPreviousReading;
  const previewProgressiveTotal = previewPriorProgressiveTotal + previewDifference;
  const previewAverageLoad = previewDifference / 24;

  const openEdit = (row: DailyEnergyGenerationHydro) => {
    setEditTarget(row); setSaveError(null); setSaveSuccess(false);
    setUpdateForm({ currentReading: row.currentReading, averagePowerFactor: row.averagePowerFactor ?? '', akosomboPeakLoadMW: row.akosomboPeakLoadMW ?? '', akosomboPeakLoadTime: row.akosomboPeakLoadTime?.slice(0, 5) ?? '' });
  };

  const cancelEdit = () => { setEditTarget(null); setUpdateForm({}); };

  const handleSave = async () => {
    setSaving(true); setSaveError(null); setSaveSuccess(false);
    try {
      if (editTarget) {
        await dailyEnergyGenerationHydroApi.update(editTarget.id, { currentReading: Number(updateForm.currentReading), averagePowerFactor: toNum(updateForm.averagePowerFactor), akosomboPeakLoadMW: toNum(updateForm.akosomboPeakLoadMW), akosomboPeakLoadTime: updateForm.akosomboPeakLoadTime || undefined });
        cancelEdit();
      } else {
        await dailyEnergyGenerationHydroApi.create({ plantCode: form.plantCode, logDate: form.logDate, previousReading: isFirstEntry ? Number(manualPreviousReading) : undefined, currentReading: Number(form.currentReading), averagePowerFactor: toNum(form.averagePowerFactor), akosomboPeakLoadMW: toNum(form.akosomboPeakLoadMW), akosomboPeakLoadTime: form.akosomboPeakLoadTime || undefined });
        setForm(emptyForm); setManualPreviousReading('');
      }
      setSaveSuccess(true); fetchRecords();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setSaveError(msg ?? 'Failed to save. Please try again.');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await dailyEnergyGenerationHydroApi.delete(deleteTarget.id);
      setDeleteTarget(null); fetchRecords();
    } catch { setRecordsError('Failed to delete record.'); }
    finally { setDeleting(false); }
  };

  const isFormValid = editTarget
    ? updateForm.currentReading !== '' && updateForm.currentReading !== undefined
    : form.plantCode && form.logDate && form.currentReading !== '';

  // ── Plant type guard ─────────────────────────────────────────────────────────
  if (isWrongPlantType) return (
    <Box>
      <PageHeader title="Daily Energy Generation — Hydro"
        subtitle="Daily MWh generation readings per hydro plant"
        breadcrumbs={[{ label: 'Daily Readings' }, { label: 'Energy Generation (Hydro)' }]} />
      <Alert severity="error" sx={{ mt: 2 }}
        action={<Button color="error" size="small" variant="outlined" onClick={() => navigate(-1)}>Go Back</Button>}>
        You do not have access to this page. Your plant assignment is thermal only.
      </Alert>
    </Box>
  );

  return (
    <Box>
      <PageHeader
        title="Daily Energy Generation — Hydro"
        subtitle="Daily MWh generation readings per hydro plant with automatic progressive totals"
        breadcrumbs={[{ label: 'Daily Readings' }, { label: 'Energy Generation (Hydro)' }]}
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card>
            <CardHeader title={
              <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1.5}>
                <WaterDrop sx={{ color: '#1565C0' }} />
                <Typography sx={{ fontWeight: 700 }}>
                  {editTarget ? `Editing: ${editTarget.plantCode} — ${editTarget.logDate?.split('T')[0]}` : 'New Daily Reading'}
                </Typography>
                {editTarget && <Chip label="Edit Mode" size="small" color="warning" onDelete={cancelEdit} />}
              </Stack>
            } />
            <Divider />
            <CardContent>
              {saveError && <Alert severity="error" onClose={() => setSaveError(null)} sx={{ mb: 2 }}>{saveError}</Alert>}
              {saveSuccess && <Alert severity="success" onClose={() => setSaveSuccess(false)} sx={{ mb: 2 }}>Reading saved successfully.</Alert>}

              <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>Log Identity</Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth required disabled={plantLocked || !!editTarget}>
                      <InputLabel>Power Plant</InputLabel>
                      <Select label="Power Plant" value={editTarget ? editTarget.plantCode : form.plantCode} onChange={(e) => setForm((prev) => ({ ...prev, plantCode: e.target.value }))}>
                        {availablePlants.map((p: PowerPlant) => (<MenuItem key={p.id} value={p.plantCode}>{p.plantName} ({p.plantCode})</MenuItem>))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Log Date" type="date" fullWidth required value={editTarget ? editTarget.logDate?.split('T')[0] : form.logDate} onChange={(e) => setForm((prev) => ({ ...prev, logDate: e.target.value }))} disabled={!!editTarget} slotProps={{ inputLabel: { shrink: true } }} />
                  </Grid>
                </Grid>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>Meter Readings (MWh)</Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Previous Reading" fullWidth disabled value={loadingPrior ? '…' : previewPreviousReading.toFixed(2)} helperText="Auto-carried from prior day" />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Current Reading" type="number" fullWidth required value={fv('currentReading')} onChange={(e) => setField('currentReading', e.target.value)} slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">MWh</Typography> } }} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Average Power Factor" type="number" fullWidth value={fv('averagePowerFactor')} onChange={(e) => setField('averagePowerFactor', e.target.value)} />
                  </Grid>
                </Grid>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>AKOSOMBO GS Peak Load (Nexus)</Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Peak Load" type="number" fullWidth value={fv('akosomboPeakLoadMW')} onChange={(e) => setField('akosomboPeakLoadMW', e.target.value)} slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">MW</Typography> } }} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Peak Load Time" type="time" fullWidth value={fv('akosomboPeakLoadTime')} onChange={(e) => setField('akosomboPeakLoadTime', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
                  </Grid>
                </Grid>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2, backgroundColor: 'action.hover' }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>Computed Preview</Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary">Difference</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{previewDifference.toFixed(2)} MWh</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary">Progressive Total</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{previewProgressiveTotal.toFixed(2)} MWh</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary">Average Load</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{previewAverageLoad.toFixed(2)} MW</Typography>
                  </Grid>
                </Grid>
              </Paper>

              <Stack direction="row" spacing={1.5}>
                {editTarget && <Button variant="outlined" onClick={cancelEdit} disabled={saving}>Cancel</Button>}
                {(editTarget ? canEdit : canCreate) && (
                  <Button variant="contained" onClick={handleSave} disabled={saving || !isFormValid}
                    startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />} sx={{ minWidth: 140 }}>
                    {saving ? 'Saving...' : editTarget ? 'Update Reading' : 'Save Reading'}
                  </Button>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <Card>
            <CardHeader title={
              <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1}>
                <History sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
                <Typography sx={{ fontWeight: 700 }}>Logged Readings</Typography>
              </Stack>
            } />
            <Divider />
            <CardContent>
              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Plant</InputLabel>
                  <Select label="Plant" value={filterPlant} onChange={(e) => setFilterPlant(e.target.value)} disabled={plantLocked}>
                    <MenuItem value="">Select plant…</MenuItem>
                    {availablePlants.map((p: PowerPlant) => (<MenuItem key={p.id} value={p.plantCode}>{p.plantName}</MenuItem>))}
                  </Select>
                </FormControl>
                <Button variant="outlined" size="small" startIcon={loadingRecords ? <CircularProgress size={14} /> : <Search />} onClick={fetchRecords} disabled={!filterPlant || loadingRecords}>
                  {loadingRecords ? 'Loading...' : 'Load'}
                </Button>
              </Stack>

              {recordsError && <Alert severity="error" onClose={() => setRecordsError(null)} sx={{ mb: 1.5 }}>{recordsError}</Alert>}

              {records.length === 0 && !loadingRecords ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <WaterDrop sx={{ fontSize: '2rem', color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">{filterPlant ? 'No records found.' : 'Select a plant and click Load.'}</Typography>
                </Box>
              ) : (
                <TableContainer sx={{ maxHeight: 540 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell><TableCell>Current</TableCell><TableCell>Diff</TableCell><TableCell>Progressive</TableCell><TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {records.map((row) => (
                        <TableRow key={row.id} selected={editTarget?.id === row.id} hover>
                          <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{row.logDate.split('T')[0]}</Typography></TableCell>
                          <TableCell><Typography variant="body2">{row.currentReading.toFixed(1)}</Typography></TableCell>
                          <TableCell><Typography variant="body2" color={row.difference < 0 ? 'error.main' : 'text.primary'}>{row.difference.toFixed(1)}</Typography></TableCell>
                          <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{row.progressiveTotal.toFixed(1)}</Typography></TableCell>
                          <TableCell align="right">
                            {canEdit && <Tooltip title="Edit"><IconButton size="small" color="primary" onClick={() => openEdit(row)}><Edit fontSize="small" /></IconButton></Tooltip>}
                            {canDelete && <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setDeleteTarget(row)}><Delete fontSize="small" /></IconButton></Tooltip>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <ConfirmDialog open={!!deleteTarget} title="Delete Reading"
        message={`Delete the reading for ${deleteTarget?.plantCode} on ${deleteTarget?.logDate?.split('T')[0]}? This will recompute progressive totals for any later readings.`}
        confirmLabel="Delete" loading={deleting} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </Box>
  );
}
import {
  Box, Card, CardContent, CardHeader, TextField, Button,
  CircularProgress, Alert, Typography, MenuItem, FormControl,
  InputLabel, Select, Grid, Divider, Chip, Stack, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, IconButton, Tooltip, Collapse,
} from '@mui/material';
import { Save, Search, Edit, Delete, WaterDrop, History, ExpandMore, ExpandLess } from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { dailyEnergyGenerationHydroApi } from '../../api/daily/dailyEnergyGenerationHydroApi';
import { dailyReactivePowerApi } from '../../api/daily/dailyReactivePowerApi';
import type { PowerPlant } from '../../types/masterData';
import type { DailyEnergyGenerationHydro, DailyEnergyGenHydroForm } from '../../types/dailyEnergyGenerationHydro';
import type { DailyReactivePower } from '../../types/dailyReactivePower';
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

interface HydroHistoryRow {
  logDate: string;
  energy: DailyEnergyGenerationHydro | null;
  reactivePower: DailyReactivePower | null;
}

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
  const [records, setRecords] = useState<HydroHistoryRow[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HydroHistoryRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Reactive Power (embedded) ────────────────────────────────────────────────
  const [reactivePowerReading, setReactivePowerReading] = useState<DailyReactivePower | null>(null);
  const [reactivePowerForm, setReactivePowerForm] = useState<{ currentReading: number | string }>({ currentReading: '' });
  const [reactivePowerManualPreviousReading, setReactivePowerManualPreviousReading] = useState('');
  const [reactivePowerPriorRecord, setReactivePowerPriorRecord] = useState<DailyReactivePower | null>(null);
  const [loadingReactivePower, setLoadingReactivePower] = useState(false);
  const [savingReactivePower, setSavingReactivePower] = useState(false);
  const [reactivePowerError, setReactivePowerError] = useState<string | null>(null);
  const [reactivePowerSuccess, setReactivePowerSuccess] = useState(false);
  const [reactivePowerCollapsed, setReactivePowerCollapsed] = useState(false);

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
      const [energyRes, reactivePowerRes] = await Promise.allSettled([
        dailyEnergyGenerationHydroApi.getAll({ plantCode: filterPlant }),
        dailyReactivePowerApi.getAll({ plantCode: filterPlant }),
      ]);
      const energyList = energyRes.status === 'fulfilled' ? energyRes.value.data : [];
      const reactivePowerList = reactivePowerRes.status === 'fulfilled' ? reactivePowerRes.value.data : [];

      const merged: HydroHistoryRow[] = energyList.map((e) => ({
        logDate: e.logDate,
        energy: e,
        reactivePower: reactivePowerList.find((r) => r.logDate.split('T')[0] === e.logDate.split('T')[0]) ?? null,
      }));
      const reactivePowerOnly: HydroHistoryRow[] = reactivePowerList
        .filter((r) => !energyList.some((e) => e.logDate.split('T')[0] === r.logDate.split('T')[0]))
        .map((r) => ({ logDate: r.logDate, energy: null, reactivePower: r }));

      setRecords([...merged, ...reactivePowerOnly].sort((a, b) => b.logDate.localeCompare(a.logDate)));

      if (energyRes.status === 'rejected' && reactivePowerRes.status === 'rejected') {
        setRecordsError('Failed to load records.');
      }
    } catch { setRecordsError('Failed to load records.'); }
    finally { setLoadingRecords(false); }
  }, [filterPlant]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  // ── Reactive Power: load alongside the energy reading for the selected plant + date ──
  const rpPlantCode = editTarget ? editTarget.plantCode : form.plantCode;
  const rpLogDate = editTarget ? editTarget.logDate?.split('T')[0] : form.logDate;

  const fetchReactivePower = useCallback(async () => {
    if (!rpPlantCode || !rpLogDate) {
      setReactivePowerReading(null);
      setReactivePowerForm({ currentReading: '' });
      setReactivePowerPriorRecord(null);
      return;
    }
    setLoadingReactivePower(true);
    try {
      const [exactRes, allRes] = await Promise.allSettled([
        dailyReactivePowerApi.getAll({ plantCode: rpPlantCode, date: rpLogDate }),
        dailyReactivePowerApi.getAll({ plantCode: rpPlantCode }),
      ]);
      // Handle 404 / failure the same way as an empty result — show an empty form ready to create
      const exact = exactRes.status === 'fulfilled' ? (exactRes.value.data[0] ?? null) : null;
      setReactivePowerReading(exact);
      setReactivePowerForm({ currentReading: exact ? exact.currentReading : '' });
      if (!exact && allRes.status === 'fulfilled') {
        const prior = allRes.value.data
          .filter((r) => r.logDate.split('T')[0] < rpLogDate)
          .sort((a, b) => b.logDate.localeCompare(a.logDate))[0];
        setReactivePowerPriorRecord(prior ?? null);
        if (prior) setReactivePowerManualPreviousReading('');
      } else {
        setReactivePowerPriorRecord(null);
      }
    } catch {
      setReactivePowerReading(null);
      setReactivePowerPriorRecord(null);
    } finally {
      setLoadingReactivePower(false);
    }
  }, [rpPlantCode, rpLogDate]);

  useEffect(() => { fetchReactivePower(); }, [fetchReactivePower]);

  const isReactivePowerFirstEntry = !reactivePowerReading && !reactivePowerPriorRecord && !loadingReactivePower;
  const previewReactivePowerPreviousReading = reactivePowerReading
    ? reactivePowerReading.previousReading
    : reactivePowerPriorRecord
    ? reactivePowerPriorRecord.currentReading
    : Number(reactivePowerManualPreviousReading) || 0;
  const previewReactivePowerPriorProgressiveTotal = reactivePowerReading
    ? reactivePowerReading.progressiveTotal - reactivePowerReading.difference
    : (reactivePowerPriorRecord?.progressiveTotal ?? 0);
  const reactivePowerCurrentReadingVal = Number(reactivePowerForm.currentReading) || 0;
  const previewReactivePowerDifference = reactivePowerCurrentReadingVal - previewReactivePowerPreviousReading;
  const previewReactivePowerProgressiveTotal = previewReactivePowerPriorProgressiveTotal + previewReactivePowerDifference;

  const handleSaveReactivePower = async () => {
    setSavingReactivePower(true);
    setReactivePowerError(null);
    setReactivePowerSuccess(false);
    try {
      if (reactivePowerReading) {
        await dailyReactivePowerApi.update(reactivePowerReading.id, {
          currentReading: Number(reactivePowerForm.currentReading),
        });
      } else {
        await dailyReactivePowerApi.create({
          plantCode: rpPlantCode,
          logDate: rpLogDate,
          previousReading: isReactivePowerFirstEntry ? Number(reactivePowerManualPreviousReading) : undefined,
          currentReading: Number(reactivePowerForm.currentReading),
        });
        setReactivePowerManualPreviousReading('');
      }
      setReactivePowerSuccess(true);
      fetchReactivePower();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setReactivePowerError(msg ?? 'Failed to save. Please try again.');
    } finally {
      setSavingReactivePower(false);
    }
  };

  const isReactivePowerFormValid = reactivePowerForm.currentReading !== '' && reactivePowerForm.currentReading !== undefined;

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

  const openMergedEdit = (row: HydroHistoryRow) => {
    if (row.energy) {
      openEdit(row.energy);
    } else {
      cancelEdit();
      setForm((prev) => ({ ...prev, plantCode: filterPlant || prev.plantCode, logDate: row.logDate.split('T')[0] }));
    }
  };

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
      const tasks: Promise<unknown>[] = [];
      if (deleteTarget.energy) tasks.push(dailyEnergyGenerationHydroApi.delete(deleteTarget.energy.id));
      if (deleteTarget.reactivePower) tasks.push(dailyReactivePowerApi.delete(deleteTarget.reactivePower.id));
      await Promise.all(tasks);
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
      <PageHeader title="Energy Readings (Hydro)"
        subtitle="Daily energy generation and reactive power readings"
        breadcrumbs={[{ label: 'Daily Readings' }, { label: 'Energy Readings (Hydro)' }]} />
      <Alert severity="error" sx={{ mt: 2 }}
        action={<Button color="error" size="small" variant="outlined" onClick={() => navigate(-1)}>Go Back</Button>}>
        You do not have access to this page. Your plant assignment is thermal only.
      </Alert>
    </Box>
  );

  return (
    <Box>
      <PageHeader
        title="Energy Readings (Hydro)"
        subtitle="Daily energy generation and reactive power readings"
        breadcrumbs={[{ label: 'Daily Readings' }, { label: 'Energy Readings (Hydro)' }]}
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
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>Peak Load (MW)</Typography>
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

          <Card sx={{ mt: 3 }}>
            <Box sx={{
              px: 2.5, py: 1.5,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer',
              backgroundColor: '#1565C014',
              borderBottom: reactivePowerCollapsed ? 'none' : '1px solid',
              borderColor: 'divider',
            }} onClick={() => setReactivePowerCollapsed((p) => !p)}>
              <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#1565C0' }}>
                Reactive Power (MVArh)
              </Typography>
              <IconButton size="small">
                {reactivePowerCollapsed ? <ExpandMore fontSize="small" /> : <ExpandLess fontSize="small" />}
              </IconButton>
            </Box>
            <Collapse in={!reactivePowerCollapsed} timeout="auto" unmountOnExit>
              <CardContent>
                {reactivePowerError && <Alert severity="error" onClose={() => setReactivePowerError(null)} sx={{ mb: 2 }}>{reactivePowerError}</Alert>}
                {reactivePowerSuccess && <Alert severity="success" onClose={() => setReactivePowerSuccess(false)} sx={{ mb: 2 }}>Reactive power reading saved successfully.</Alert>}

                {!rpPlantCode || !rpLogDate ? (
                  <Typography variant="body2" color="text.secondary">
                    Select a power plant and log date above to manage reactive power readings.
                  </Typography>
                ) : (
                  <>
                    <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                        Meter Readings (MVarh)
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <TextField label="Previous Reading" fullWidth disabled
                            value={loadingReactivePower ? '…' : previewReactivePowerPreviousReading.toFixed(2)}
                            helperText="Auto-carried from prior day" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <TextField label="Current Reading" type="number" fullWidth required
                            value={reactivePowerForm.currentReading}
                            onChange={(e) => setReactivePowerForm({ currentReading: e.target.value })}
                            slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">MVarh</Typography> } }} />
                        </Grid>
                      </Grid>
                    </Paper>

                    <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2, backgroundColor: 'action.hover' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                        Computed Preview
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <Typography variant="caption" color="text.secondary">Difference</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>{previewReactivePowerDifference.toFixed(2)} MVarh</Typography>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <Typography variant="caption" color="text.secondary">Progressive Total</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>{previewReactivePowerProgressiveTotal.toFixed(2)} MVarh</Typography>
                        </Grid>
                      </Grid>
                    </Paper>

                    {(reactivePowerReading ? canEdit : canCreate) && (
                      <Button variant="contained" onClick={handleSaveReactivePower}
                        disabled={savingReactivePower || !isReactivePowerFormValid}
                        startIcon={savingReactivePower ? <CircularProgress size={16} color="inherit" /> : <Save />}
                        sx={{ minWidth: 140 }}>
                        {savingReactivePower ? 'Saving...' : reactivePowerReading ? 'Update Reading' : 'Save Reading'}
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Collapse>
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

              {loadingRecords ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={28} />
                </Box>
              ) : records.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <WaterDrop sx={{ fontSize: '2rem', color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    {filterPlant ? 'No readings recorded for this plant yet.' : 'Select a plant and click Load.'}
                  </Typography>
                </Box>
              ) : (
                <TableContainer sx={{ maxHeight: 540 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow sx={{ '& th': { backgroundColor: '#E3F2FD' } }}>
                        <TableCell rowSpan={2} sx={{ verticalAlign: 'bottom' }}>Date</TableCell>
                        <TableCell colSpan={3} align="center" sx={{ fontWeight: 700 }}>Energy Generation</TableCell>
                        <TableCell colSpan={2} align="center" sx={{ fontWeight: 700 }}>Reactive Power (MVArh)</TableCell>
                        <TableCell rowSpan={2} align="right" sx={{ verticalAlign: 'bottom' }}>Actions</TableCell>
                      </TableRow>
                      <TableRow sx={{ '& th': { backgroundColor: '#E3F2FD' } }}>
                        <TableCell>Energy Generated (MWh)</TableCell>
                        <TableCell>Progressive Total (MWh)</TableCell>
                        <TableCell>Avg Power Factor</TableCell>
                        <TableCell>Reactive Energy (MVArh)</TableCell>
                        <TableCell>Reactive Progressive Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {records.map((row, idx) => (
                        <TableRow
                          key={row.logDate}
                          selected={!!row.energy && editTarget?.id === row.energy.id}
                          hover
                          sx={{ backgroundColor: idx % 2 === 1 ? 'action.hover' : 'inherit' }}
                        >
                          <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{dayjs(row.logDate).format('DD MMM YYYY')}</Typography></TableCell>
                          <TableCell><Typography variant="body2">{row.energy ? row.energy.currentReading.toFixed(1) : '—'}</Typography></TableCell>
                          <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{row.energy ? row.energy.progressiveTotal.toFixed(1) : '—'}</Typography></TableCell>
                          <TableCell><Typography variant="body2">{row.energy?.averagePowerFactor != null ? row.energy.averagePowerFactor.toFixed(2) : '—'}</Typography></TableCell>
                          <TableCell><Typography variant="body2">{row.reactivePower ? row.reactivePower.currentReading.toFixed(1) : '—'}</Typography></TableCell>
                          <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{row.reactivePower ? row.reactivePower.progressiveTotal.toFixed(1) : '—'}</Typography></TableCell>
                          <TableCell align="right">
                            {canEdit && <Tooltip title="Edit"><IconButton size="small" color="primary" onClick={() => openMergedEdit(row)}><Edit fontSize="small" /></IconButton></Tooltip>}
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
        message={`Delete the reading${deleteTarget?.energy && deleteTarget?.reactivePower ? 's' : ''} for ${deleteTarget?.energy?.plantCode ?? deleteTarget?.reactivePower?.plantCode ?? filterPlant} on ${deleteTarget?.logDate?.split('T')[0]}? This will recompute progressive totals for any later readings.`}
        confirmLabel="Delete" loading={deleting} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </Box>
  );
}
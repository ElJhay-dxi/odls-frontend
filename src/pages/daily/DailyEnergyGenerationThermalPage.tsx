import {
  Box, Card, CardContent, CardHeader, TextField, Button,
  CircularProgress, Alert, Typography, MenuItem, FormControl,
  InputLabel, Select, Grid, Divider, Chip, Stack, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, IconButton, Tooltip, Collapse,
} from '@mui/material';
import { Save, Search, Edit, Delete, LocalFireDepartment, History, ExpandMore, ExpandLess } from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { dailyEnergyGenerationThermalApi } from '../../api/daily/dailyEnergyGenerationThermalApi';
import { dailyReactivePowerApi } from '../../api/daily/dailyReactivePowerApi';
import type { PowerPlant } from '../../types/masterData';
import type {
  DailyEnergyGenerationThermal, DailyEnergyGenThermalForm, ThermalFuelType,
} from '../../types/dailyEnergyGenerationThermal';
import { FUEL_TYPE_LABELS } from '../../types/dailyEnergyGenerationThermal';
import type { DailyReactivePower } from '../../types/dailyReactivePower';
import { useSectionPermissions, usePlantFilter } from '../../hooks/usePermission';
import { usePlantTypeGuard } from '../../hooks/usePlantTypeGuard';

const FUEL_TYPES: ThermalFuelType[] = ['NaturalGas', 'DFO'];

const emptyForm: DailyEnergyGenThermalForm = {
  plantCode: '',
  fuelType: '',
  logDate: new Date().toISOString().split('T')[0],
  currentReading: '',
};

interface ThermalHistoryRow {
  logDate: string;
  energy: DailyEnergyGenerationThermal | null;
  reactivePower: DailyReactivePower | null;
}

export default function DailyEnergyGenerationThermalPage() {
  const { canCreate, canEdit, canDelete } = useSectionPermissions('daily.energy_thermal');
  const isWrongPlantType = usePlantTypeGuard('thermal');
  const navigate = useNavigate();
  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const { availablePlants, plantLocked, autoPlantCode } = usePlantFilter(plants);

  const [form, setForm] = useState<DailyEnergyGenThermalForm>(emptyForm);
  const [updateForm, setUpdateForm] = useState<{ currentReading: number | string }>({ currentReading: '' });
  const [editTarget, setEditTarget] = useState<DailyEnergyGenerationThermal | null>(null);

  const [manualPreviousReading, setManualPreviousReading] = useState('');
  const [priorRecord, setPriorRecord] = useState<DailyEnergyGenerationThermal | null>(null);
  const [loadingPrior, setLoadingPrior] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [filterPlant, setFilterPlant] = useState('');
  const [filterFuelType, setFilterFuelType] = useState<ThermalFuelType | ''>('');
  const [records, setRecords] = useState<ThermalHistoryRow[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<ThermalHistoryRow | null>(null);
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
      setPlants(res.data.filter((p) => p.classificationType === 'Thermal'));
    });
  }, []);

  useEffect(() => {
    if (autoPlantCode) {
      setForm((prev) => ({ ...prev, plantCode: autoPlantCode }));
      setFilterPlant(autoPlantCode);
    }
  }, [autoPlantCode]);

  // Fetch the most recent prior record whenever plant or fuel type or date changes (create mode only)
  useEffect(() => {
    if (editTarget || !form.plantCode || !form.fuelType || !form.logDate) {
      setPriorRecord(null);
      return;
    }
    setLoadingPrior(true);
    dailyEnergyGenerationThermalApi.getAll({ plantCode: form.plantCode, fuelType: form.fuelType })
      .then((res) => {
        const prior = res.data
          .filter((r) => r.logDate.split('T')[0] < form.logDate)
          .sort((a, b) => b.logDate.localeCompare(a.logDate))[0];
        setPriorRecord(prior ?? null);
        if (prior) setManualPreviousReading('');
      })
      .catch(() => setPriorRecord(null))
      .finally(() => setLoadingPrior(false));
  }, [form.plantCode, form.fuelType, form.logDate, editTarget]);

  const fetchRecords = useCallback(async () => {
    if (!filterPlant) return;
    setLoadingRecords(true);
    setRecordsError(null);
    try {
      const [energyRes, reactivePowerRes] = await Promise.allSettled([
        dailyEnergyGenerationThermalApi.getAll({ plantCode: filterPlant, fuelType: filterFuelType || undefined }),
        dailyReactivePowerApi.getAll({ plantCode: filterPlant }),
      ]);
      const energyList = energyRes.status === 'fulfilled' ? energyRes.value.data : [];
      const reactivePowerList = reactivePowerRes.status === 'fulfilled' ? reactivePowerRes.value.data : [];

      const merged: ThermalHistoryRow[] = energyList.map((e) => ({
        logDate: e.logDate,
        energy: e,
        reactivePower: reactivePowerList.find((r) => r.logDate.split('T')[0] === e.logDate.split('T')[0]) ?? null,
      }));
      const reactivePowerOnly: ThermalHistoryRow[] = reactivePowerList
        .filter((r) => !energyList.some((e) => e.logDate.split('T')[0] === r.logDate.split('T')[0]))
        .map((r) => ({ logDate: r.logDate, energy: null, reactivePower: r }));

      setRecords([...merged, ...reactivePowerOnly].sort((a, b) => b.logDate.localeCompare(a.logDate)));

      if (energyRes.status === 'rejected' && reactivePowerRes.status === 'rejected') {
        setRecordsError('Failed to load records.');
      }
    } catch {
      setRecordsError('Failed to load records.');
    } finally {
      setLoadingRecords(false);
    }
  }, [filterPlant, filterFuelType]);

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

  const isFirstEntry = !editTarget && !priorRecord && !loadingPrior;
  const previewPreviousReading = editTarget
    ? editTarget.previousReading
    : priorRecord
    ? priorRecord.currentReading
    : Number(manualPreviousReading) || 0;
  const previewPriorProgressiveTotal = editTarget
    ? editTarget.progressiveTotal - editTarget.difference
    : (priorRecord?.progressiveTotal ?? 0);
  const currentReadingVal = Number(editTarget ? updateForm.currentReading : form.currentReading) || 0;
  const previewDifference = currentReadingVal - previewPreviousReading;
  const previewProgressiveTotal = previewPriorProgressiveTotal + previewDifference;
  const previewAverageLoad = previewDifference / 24;

  const openEdit = (row: DailyEnergyGenerationThermal) => {
    setEditTarget(row);
    setSaveError(null);
    setSaveSuccess(false);
    setUpdateForm({ currentReading: row.currentReading });
  };

  const cancelEdit = () => { setEditTarget(null); setUpdateForm({ currentReading: '' }); };

  const openMergedEdit = (row: ThermalHistoryRow) => {
    if (row.energy) {
      openEdit(row.energy);
    } else {
      cancelEdit();
      setForm((prev) => ({ ...prev, plantCode: filterPlant || prev.plantCode, logDate: row.logDate.split('T')[0] }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      if (editTarget) {
        await dailyEnergyGenerationThermalApi.update(editTarget.id, {
          currentReading: Number(updateForm.currentReading),
        });
        cancelEdit();
      } else {
        await dailyEnergyGenerationThermalApi.create({
          plantCode: form.plantCode,
          fuelType: form.fuelType,
          logDate: form.logDate,
          previousReading: isFirstEntry ? Number(manualPreviousReading) : undefined,
          currentReading: Number(form.currentReading),
        });
        setForm(emptyForm);
        setManualPreviousReading('');
      }
      setSaveSuccess(true);
      fetchRecords();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setSaveError(msg ?? 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const tasks: Promise<unknown>[] = [];
      if (deleteTarget.energy) tasks.push(dailyEnergyGenerationThermalApi.delete(deleteTarget.energy.id));
      if (deleteTarget.reactivePower) tasks.push(dailyReactivePowerApi.delete(deleteTarget.reactivePower.id));
      await Promise.all(tasks);
      setDeleteTarget(null);
      fetchRecords();
    } catch {
      setRecordsError('Failed to delete record.');
    } finally {
      setDeleting(false);
    }
  };

  const isFormValid = editTarget
    ? updateForm.currentReading !== '' && updateForm.currentReading !== undefined
    : form.plantCode && form.fuelType && form.logDate && form.currentReading !== '';

  // ── Plant type guard ─────────────────────────────────────────────────────────
  if (isWrongPlantType) return (
    <Box>
      <PageHeader
        title="Energy Readings (Thermal)"
        subtitle="Daily energy generation and reactive power readings"
        breadcrumbs={[{ label: 'Daily Readings' }, { label: 'Energy Readings (Thermal)' }]}
      />
      <Alert severity="error" sx={{ mt: 2 }}
        action={<Button color="error" size="small" variant="outlined" onClick={() => navigate(-1)}>Go Back</Button>}>
        You do not have access to this page. Your plant assignment is hydro only.
      </Alert>
    </Box>
  );

  return (
    <Box>
      <PageHeader
        title="Energy Readings (Thermal)"
        subtitle="Daily energy generation and reactive power readings"
        breadcrumbs={[{ label: 'Daily Readings' }, { label: 'Energy Readings (Thermal)' }]}
      />

      <Grid container spacing={3}>
        {/* ── Left: Entry form ── */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card>
            <CardHeader
              title={
                <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1.5}>
                  <LocalFireDepartment sx={{ color: '#B71C1C' }} />
                  <Typography sx={{ fontWeight: 700 }}>
                    {editTarget
                      ? `Editing: ${editTarget.plantCode} (${FUEL_TYPE_LABELS[editTarget.fuelType]}) — ${editTarget.logDate?.split('T')[0]}`
                      : 'New Daily Reading'}
                  </Typography>
                  {editTarget && (
                    <Chip label="Edit Mode" size="small" color="warning" onDelete={cancelEdit} />
                  )}
                </Stack>
              }
            />
            <Divider />
            <CardContent>
              {saveError && (
                <Alert severity="error" onClose={() => setSaveError(null)} sx={{ mb: 2 }}>{saveError}</Alert>
              )}
              {saveSuccess && (
                <Alert severity="success" onClose={() => setSaveSuccess(false)} sx={{ mb: 2 }}>
                  Reading saved successfully.
                </Alert>
              )}

              {/* Identity */}
              <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary"
                  sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                  Log Identity
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth required disabled={plantLocked || !!editTarget}>
                      <InputLabel>Power Plant</InputLabel>
                      <Select
                        label="Power Plant"
                        value={editTarget ? editTarget.plantCode : form.plantCode}
                        onChange={(e) => setForm((prev) => ({ ...prev, plantCode: e.target.value }))}
                      >
                        {availablePlants.map((p: PowerPlant) => (
                          <MenuItem key={p.id} value={p.plantCode}>{p.plantName} ({p.plantCode})</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth required disabled={!!editTarget}>
                      <InputLabel>Fuel Type</InputLabel>
                      <Select
                        label="Fuel Type"
                        value={editTarget ? editTarget.fuelType : form.fuelType}
                        onChange={(e) => setForm((prev) => ({ ...prev, fuelType: e.target.value as ThermalFuelType }))}
                      >
                        {FUEL_TYPES.map((ft) => (
                          <MenuItem key={ft} value={ft}>{FUEL_TYPE_LABELS[ft]}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Log Date" type="date" fullWidth required
                      value={editTarget ? editTarget.logDate?.split('T')[0] : form.logDate}
                      onChange={(e) => setForm((prev) => ({ ...prev, logDate: e.target.value }))}
                      disabled={!!editTarget}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid>
                </Grid>
              </Paper>

              {/* Readings */}
              <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary"
                  sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                  Meter Readings (MWh)
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Previous Reading" fullWidth
                      type={isFirstEntry ? "number" : "text"}
                      disabled={!isFirstEntry}
                      value={isFirstEntry ? manualPreviousReading : loadingPrior ? '…' : previewPreviousReading.toFixed(2)}
                      onChange={(e) => isFirstEntry && setManualPreviousReading(e.target.value)}
                      helperText={isFirstEntry ? "Enter the prior meter reading (first entry only)" : "Auto-carried from prior day (same plant + fuel type)"}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Current Reading" type="number" fullWidth required
                      value={editTarget ? updateForm.currentReading : form.currentReading}
                      onChange={(e) => {
                        if (editTarget) setUpdateForm({ currentReading: e.target.value });
                        else setForm((prev) => ({ ...prev, currentReading: e.target.value }));
                      }}
                      slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">MWh</Typography> } }}
                    />
                  </Grid>
                </Grid>
              </Paper>

              {/* Live computed preview */}
              <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2, backgroundColor: 'action.hover' }}>
                <Typography variant="caption" color="text.secondary"
                  sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                  Computed Preview
                </Typography>
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
                {editTarget && (
                  <Button variant="outlined" onClick={cancelEdit} disabled={saving}>Cancel</Button>
                )}
                {(editTarget ? canEdit : canCreate) && (
                <Button
                  variant="contained"
                  onClick={handleSave}
                  disabled={saving || !isFormValid}
                  startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />}
                  sx={{ minWidth: 140 }}
                >
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

        {/* ── Right: Records ── */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card>
            <CardHeader
              title={
                <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1}>
                  <History sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
                  <Typography sx={{ fontWeight: 700 }}>Logged Readings</Typography>
                </Stack>
              }
            />
            <Divider />
            <CardContent>
              <Stack spacing={1.5} sx={{ mb: 2 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Plant</InputLabel>
                  <Select label="Plant" value={filterPlant}
                    onChange={(e) => { setFilterPlant(e.target.value); setFilterFuelType(''); }} disabled={plantLocked}>
                    <MenuItem value="">Select plant…</MenuItem>
                    {availablePlants.map((p: PowerPlant) => (
                      <MenuItem key={p.id} value={p.plantCode}>{p.plantName}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Stack direction="row" spacing={1}>
                  <FormControl size="small" sx={{ flex: 1 }} disabled={!filterPlant}>
                    <InputLabel>Fuel Type</InputLabel>
                    <Select label="Fuel Type" value={filterFuelType}
                      onChange={(e) => setFilterFuelType(e.target.value as ThermalFuelType | '')}>
                      <MenuItem value="">All Fuel Types</MenuItem>
                      {FUEL_TYPES.map((ft) => (
                        <MenuItem key={ft} value={ft}>{FUEL_TYPE_LABELS[ft]}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Button
                    variant="outlined" size="small"
                    startIcon={loadingRecords ? <CircularProgress size={14} /> : <Search />}
                    onClick={fetchRecords}
                    disabled={!filterPlant || loadingRecords}
                  >
                    {loadingRecords ? 'Loading...' : 'Load'}
                  </Button>
                </Stack>
              </Stack>

              {recordsError && (
                <Alert severity="error" onClose={() => setRecordsError(null)} sx={{ mb: 1.5 }}>{recordsError}</Alert>
              )}

              {loadingRecords ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={28} />
                </Box>
              ) : records.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <LocalFireDepartment sx={{ fontSize: '2rem', color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    {filterPlant ? 'No readings recorded for this plant yet.' : 'Select a plant and click Load.'}
                  </Typography>
                </Box>
              ) : (
                <TableContainer sx={{ maxHeight: 480 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow sx={{ '& th': { backgroundColor: '#FFF3E0' } }}>
                        <TableCell rowSpan={2} sx={{ verticalAlign: 'bottom' }}>Date</TableCell>
                        <TableCell colSpan={3} align="center" sx={{ fontWeight: 700 }}>Energy Generation</TableCell>
                        <TableCell colSpan={2} align="center" sx={{ fontWeight: 700 }}>Reactive Power (MVArh)</TableCell>
                        <TableCell rowSpan={2} align="right" sx={{ verticalAlign: 'bottom' }}>Actions</TableCell>
                      </TableRow>
                      <TableRow sx={{ '& th': { backgroundColor: '#FFF3E0' } }}>
                        <TableCell>Fuel Type</TableCell>
                        <TableCell>Energy Generated (MWh)</TableCell>
                        <TableCell>Progressive Total (MWh)</TableCell>
                        <TableCell>Reactive Energy (MVArh)</TableCell>
                        <TableCell>Reactive Progressive Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {records.map((row, idx) => (
                        <TableRow
                          key={`${row.logDate}-${row.energy?.id ?? row.reactivePower?.id}`}
                          selected={!!row.energy && editTarget?.id === row.energy.id}
                          hover
                          sx={{ backgroundColor: idx % 2 === 1 ? 'action.hover' : 'inherit' }}
                        >
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {dayjs(row.logDate).format('DD MMM YYYY')}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {row.energy ? (
                              <Chip
                                label={FUEL_TYPE_LABELS[row.energy.fuelType]}
                                size="small"
                                color={row.energy.fuelType === 'NaturalGas' ? 'primary' : 'secondary'}
                                variant="outlined"
                                sx={{ fontSize: 11 }}
                              />
                            ) : '—'}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{row.energy ? row.energy.currentReading.toFixed(1) : '—'}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {row.energy ? row.energy.progressiveTotal.toFixed(1) : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{row.reactivePower ? row.reactivePower.currentReading.toFixed(1) : '—'}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {row.reactivePower ? row.reactivePower.progressiveTotal.toFixed(1) : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            {canEdit && (
                              <Tooltip title="Edit">
                              <IconButton size="small" color="primary" onClick={() => openMergedEdit(row)}>
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            )}
                            {canDelete && (
                              <Tooltip title="Delete">
                              <IconButton size="small" color="error" onClick={() => setDeleteTarget(row)}>
                                <Delete fontSize="small" />
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
          </Card>
        </Grid>
      </Grid>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Reading"
        message={`Delete the reading${deleteTarget?.energy && deleteTarget?.reactivePower ? 's' : ''}${deleteTarget?.energy ? ` (${FUEL_TYPE_LABELS[deleteTarget.energy.fuelType]})` : ''} for ${deleteTarget?.energy?.plantCode ?? deleteTarget?.reactivePower?.plantCode ?? filterPlant} on ${deleteTarget?.logDate?.split('T')[0]}? This will recompute progressive totals for any later readings of the same fuel type.`}
        confirmLabel="Delete" loading={deleting}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
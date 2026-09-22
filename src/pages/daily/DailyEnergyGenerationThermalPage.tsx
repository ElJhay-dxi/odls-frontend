import {
  Box, Card, CardContent, CardHeader, TextField, Button,
  CircularProgress, Alert, Typography, MenuItem, FormControl,
  InputLabel, Select, Grid, Divider, Chip, Stack, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, IconButton, Tooltip, Collapse,
} from '@mui/material';
import { Save, Edit, Delete, LocalFireDepartment, History, ExpandMore, ExpandLess } from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { plantUnitApi } from '../../api/masterData/plantUnitApi';
import { dailyEnergyGenerationThermalApi } from '../../api/daily/dailyEnergyGenerationThermalApi';
import type { PowerPlant, PlantUnit } from '../../types/masterData';
import type { DailyEnergyGenerationThermal } from '../../types/dailyEnergyGenerationThermal';
import { parseFuelOptions } from '../../types/dailyEnergyGenerationThermal';
import { useSectionPermissions, usePlantFilter } from '../../hooks/usePermission';
import { usePlantTypeGuard } from '../../hooks/usePlantTypeGuard';

interface CardForm {
  currentActive: string;
  currentReactive: string;
  manualPrevActive: string;
  manualPrevReactive: string;
}

const emptyCardForm: CardForm = {
  currentActive: '', currentReactive: '', manualPrevActive: '', manualPrevReactive: '',
};

const FUEL_CHIP_STYLES: Record<string, { color: string; backgroundColor: string }> = {
  Gas: { color: '#1B5E20', backgroundColor: '#E8F5E9' },
  DFO: { color: '#E65100', backgroundColor: '#FBE9E7' },
};
const getFuelChipSx = (fuel: string) => FUEL_CHIP_STYLES[fuel] ?? {};

const cardKey = (unitCode: string, fuel: string) => `${unitCode}_${fuel}`;

export default function DailyEnergyGenerationThermalPage() {
  const { canCreate, canEdit, canDelete } = useSectionPermissions('daily.energy_thermal');
  const isWrongPlantType = usePlantTypeGuard('thermal');
  const navigate = useNavigate();

  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const { availablePlants, plantLocked, autoPlantCode } = usePlantFilter(plants);

  const [selectedPlant, setSelectedPlant] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [plantUnits, setPlantUnits] = useState<PlantUnit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  const [savedRecords, setSavedRecords] =
    useState<Record<string, DailyEnergyGenerationThermal | null>>({});
  const [priorRecords, setPriorRecords] =
    useState<Record<string, DailyEnergyGenerationThermal | null>>({});
  const [forms, setForms] =
    useState<Record<string, CardForm>>({});
  const [editTargets, setEditTargets] =
    useState<Record<string, boolean>>({});
  const [cardSaving, setCardSaving] = useState<Record<string, boolean>>({});
  const [cardError, setCardError] = useState<Record<string, string | null>>({});

  const [history, setHistory] = useState<DailyEnergyGenerationThermal[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyCollapsed, setHistoryCollapsed] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DailyEnergyGenerationThermal | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    powerPlantApi.getAll().then((res) => {
      setPlants(res.data.filter((p) => p.classificationType === 'Thermal'));
    });
  }, []);

  useEffect(() => {
    if (autoPlantCode) setSelectedPlant(autoPlantCode);
  }, [autoPlantCode]);

  // ── Load plant units for the selected plant ──────────────────────────────────
  useEffect(() => {
    if (!selectedPlant) {
      setPlantUnits([]); setSavedRecords({}); setPriorRecords({}); setForms({}); setEditTargets({});
      return;
    }
    setLoadingUnits(true);
    setSavedRecords({}); setPriorRecords({}); setForms({}); setEditTargets({});
    plantUnitApi.getByPlant(selectedPlant)
      .then((res) => setPlantUnits(res.data))
      .catch(() => setPlantUnits([]))
      .finally(() => setLoadingUnits(false));
  }, [selectedPlant]);

  // ── Load saved + prior record for one unit+fuel card ─────────────────────────
  const loadCard = useCallback((unit: PlantUnit, fuel: string) => {
    const key = cardKey(unit.unitCode, fuel);
    dailyEnergyGenerationThermalApi.getAll({
      plantCode: selectedPlant, unitCode: unit.unitCode, fuelType: fuel,
    }).then((res) => {
      const forDate = res.data.find((r) => r.logDate.split('T')[0] === selectedDate) ?? null;
      const prior = res.data
        .filter((r) => r.logDate.split('T')[0] < selectedDate)
        .sort((a, b) => b.logDate.localeCompare(a.logDate))[0] ?? null;

      setSavedRecords((prev) => ({ ...prev, [key]: forDate }));
      setPriorRecords((prev) => ({ ...prev, [key]: prior }));
      setForms((prev) => ({
        ...prev,
        [key]: {
          currentActive: forDate ? forDate.currentActiveReading.toString() : '',
          currentReactive: forDate ? forDate.currentReactiveReading.toString() : '',
          // Seed the manual-previous fields from the saved record when it was itself
          // the first-ever entry (no prior record) — keeps the computed preview correct.
          manualPrevActive: !prior && forDate ? forDate.previousActiveReading.toString() : '',
          manualPrevReactive: !prior && forDate ? forDate.previousReactiveReading.toString() : '',
        },
      }));
      setEditTargets((prev) => ({ ...prev, [key]: false }));
    }).catch(() => {
      setSavedRecords((prev) => ({ ...prev, [key]: null }));
      setPriorRecords((prev) => ({ ...prev, [key]: null }));
    });
  }, [selectedPlant, selectedDate]);

  useEffect(() => {
    if (!selectedPlant || !selectedDate || plantUnits.length === 0) return;
    plantUnits.forEach((unit) => {
      parseFuelOptions(unit.fuelType).forEach((fuel) => loadCard(unit, fuel));
    });
  }, [plantUnits, selectedPlant, selectedDate, loadCard]);

  // ── History (all dates, selected plant) ───────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    if (!selectedPlant) { setHistory([]); return; }
    setLoadingHistory(true); setHistoryError(null);
    try {
      const res = await dailyEnergyGenerationThermalApi.getAll({ plantCode: selectedPlant });
      setHistory(res.data.sort((a, b) => b.logDate.localeCompare(a.logDate)));
    } catch { setHistoryError('Failed to load history.'); }
    finally { setLoadingHistory(false); }
  }, [selectedPlant]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // ── Field updates ─────────────────────────────────────────────────────────────
  const updateForm = (key: string, field: keyof CardForm, value: string) => {
    setForms((prev) => ({ ...prev, [key]: { ...(prev[key] ?? emptyCardForm), [field]: value } }));
    setCardError((prev) => ({ ...prev, [key]: null }));
  };

  // ── Save / Cancel per card ────────────────────────────────────────────────────
  const handleSaveCard = async (unit: PlantUnit, fuel: string) => {
    const key = cardKey(unit.unitCode, fuel);
    const form = forms[key] ?? emptyCardForm;
    const saved = savedRecords[key] ?? null;
    const prior = priorRecords[key] ?? null;

    setCardSaving((prev) => ({ ...prev, [key]: true }));
    setCardError((prev) => ({ ...prev, [key]: null }));
    try {
      if (saved) {
        await dailyEnergyGenerationThermalApi.update(saved.id, {
          currentActiveReading: Number(form.currentActive) || 0,
          currentReactiveReading: Number(form.currentReactive) || 0,
        });
      } else {
        await dailyEnergyGenerationThermalApi.create({
          plantCode: selectedPlant,
          unitCode: unit.unitCode,
          unitName: unit.unitName,
          fuelType: fuel,
          logDate: selectedDate,
          previousActiveReading: prior ? undefined : (Number(form.manualPrevActive) || 0),
          currentActiveReading: Number(form.currentActive) || 0,
          previousReactiveReading: prior ? undefined : (Number(form.manualPrevReactive) || 0),
          currentReactiveReading: Number(form.currentReactive) || 0,
        });
      }
      loadCard(unit, fuel);
      fetchHistory();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setCardError((prev) => ({ ...prev, [key]: msg ?? 'Failed to save. Please try again.' }));
    } finally {
      setCardSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleCancelEdit = (unit: PlantUnit, fuel: string) => {
    const key = cardKey(unit.unitCode, fuel);
    setCardError((prev) => ({ ...prev, [key]: null }));
    loadCard(unit, fuel);
  };

  // ── History delete ────────────────────────────────────────────────────────────
  const handleDeleteHistory = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await dailyEnergyGenerationThermalApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchHistory();
      if (deleteTarget.logDate.split('T')[0] === selectedDate) {
        const unit = plantUnits.find((u) => u.unitCode === deleteTarget.unitCode);
        if (unit) loadCard(unit, deleteTarget.fuelType);
      }
    } catch { setHistoryError('Failed to delete record.'); }
    finally { setDeleting(false); }
  };

  // ── Plant summary (derived from savedRecords for the selected date) ──────────
  const savedForDate = Object.values(savedRecords).filter((r): r is DailyEnergyGenerationThermal => !!r);
  const summaryTotalActive = savedForDate.reduce((s, r) => s + r.activeDifference, 0);
  const summaryTotalReactive = savedForDate.reduce((s, r) => s + r.reactiveDifference, 0);
  const summaryUnitsReported = savedForDate.length;

  const cardEntries = plantUnits.flatMap((unit) =>
    parseFuelOptions(unit.fuelType).map((fuel) => ({ unit, fuel, key: cardKey(unit.unitCode, fuel) }))
  );

  // ── Plant type guard ─────────────────────────────────────────────────────────
  if (isWrongPlantType) return (
    <Box>
      <PageHeader
        title="Daily Energy Generation — Thermal"
        subtitle="Unit-based active and reactive energy generation log"
        breadcrumbs={[{ label: 'Daily' }, { label: 'Energy Generation (Thermal)' }]}
      />
      <Alert severity="error" sx={{ mt: 2 }}
        action={<Button color="error" size="small" variant="outlined" onClick={() => navigate(-1)}>Go Back</Button>}>
        You do not have access to this page. Your plant assignment is hydro only.
      </Alert>
    </Box>
  );

  const showEmptyState = !selectedPlant;
  const showNoUnits = !!selectedPlant && plantUnits.length === 0 && !loadingUnits;

  return (
    <Box>
      <PageHeader
        title="Daily Energy Generation — Thermal"
        subtitle="Unit-based active and reactive energy generation log"
        breadcrumbs={[{ label: 'Daily' }, { label: 'Energy Generation (Thermal)' }]}
      />

      {/* Plant + Date selector */}
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
            {loadingUnits && (
              <Grid size={{ xs: 12, sm: 3 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <CircularProgress size={18} />
                  <Typography variant="body2" color="text.secondary">Loading…</Typography>
                </Stack>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {showEmptyState ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <LocalFireDepartment sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            Select a plant and date to load energy readings.
          </Typography>
        </Box>
      ) : showNoUnits ? (
        <Alert severity="info">No units configured for this plant.</Alert>
      ) : (
        <>
          {/* Unit cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {cardEntries.map(({ unit, fuel, key }) => {
              const saved = savedRecords[key] ?? null;
              const prior = priorRecords[key] ?? null;
              const editing = editTargets[key] ?? false;
              const form = forms[key] ?? emptyCardForm;
              const saving = cardSaving[key] ?? false;
              const error = cardError[key] ?? null;
              const showForm = !saved || editing;
              const canEditPreviousReading = !saved && !prior;

              const prevActive = saved
                ? saved.previousActiveReading
                : prior ? prior.currentActiveReading : (Number(form.manualPrevActive) || 0);
              const prevReactive = saved
                ? saved.previousReactiveReading
                : prior ? prior.currentReactiveReading : (Number(form.manualPrevReactive) || 0);
              const priorActiveProgressive = saved
                ? saved.activeProgressiveTotal - saved.activeDifference
                : (prior?.activeProgressiveTotal ?? 0);
              const priorReactiveProgressive = saved
                ? saved.reactiveProgressiveTotal - saved.reactiveDifference
                : (prior?.reactiveProgressiveTotal ?? 0);

              const currentActive = Number(form.currentActive) || 0;
              const currentReactive = Number(form.currentReactive) || 0;
              const activeDiff = currentActive - prevActive;
              const reactiveDiff = currentReactive - prevReactive;
              const activeProgTotal = priorActiveProgressive + activeDiff;
              const reactiveProgTotal = priorReactiveProgressive + reactiveDiff;
              const avgActiveLoad = activeDiff / 24;
              const avgReactiveLoad = reactiveDiff / 24;

              return (
                <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={key}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <Box sx={{
                      px: 2, py: 1.5, backgroundColor: '#FBE9E7', borderBottom: '1px solid', borderColor: 'divider',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{unit.unitName}</Typography>
                        <Chip label={unit.unitCode} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: 11 }} />
                      </Stack>
                      <Chip label={fuel} size="small" sx={getFuelChipSx(fuel)} />
                    </Box>

                    <CardContent>
                      {error && <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setCardError((prev) => ({ ...prev, [key]: null }))}>{error}</Alert>}

                      {!showForm && saved ? (
                        <>
                          <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Active Energy (MWh)
                              </Typography>
                              <Stack spacing={0.5} sx={{ mt: 0.75 }}>
                                <Typography variant="body2">Previous: {saved.previousActiveReading.toFixed(2)}</Typography>
                                <Typography variant="body2">Current: {saved.currentActiveReading.toFixed(2)}</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>Diff: {saved.activeDifference.toFixed(2)}</Typography>
                                <Typography variant="body2">Prog. Total: {saved.activeProgressiveTotal.toFixed(2)}</Typography>
                                <Typography variant="body2">Avg Load: {(saved.averageActiveLoad ?? saved.activeDifference / 24).toFixed(2)} MW</Typography>
                              </Stack>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Reactive Energy (MVArh)
                              </Typography>
                              <Stack spacing={0.5} sx={{ mt: 0.75 }}>
                                <Typography variant="body2">Previous: {saved.previousReactiveReading.toFixed(2)}</Typography>
                                <Typography variant="body2">Current: {saved.currentReactiveReading.toFixed(2)}</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>Diff: {saved.reactiveDifference.toFixed(2)}</Typography>
                                <Typography variant="body2">Prog. Total: {saved.reactiveProgressiveTotal.toFixed(2)}</Typography>
                                <Typography variant="body2">Avg Load: {(saved.averageReactiveLoad ?? saved.reactiveDifference / 24).toFixed(2)} MVAr</Typography>
                              </Stack>
                            </Grid>
                          </Grid>
                          {canEdit && (
                            <Button size="small" startIcon={<Edit />} sx={{ mt: 1.5 }}
                              onClick={() => setEditTargets((prev) => ({ ...prev, [key]: true }))}>
                              Edit
                            </Button>
                          )}
                        </>
                      ) : (
                        <>
                          <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1 }}>
                                Active Energy (MWh)
                              </Typography>
                              <Stack spacing={1.5}>
                                <TextField label="Previous Reading (MWh)" size="small" fullWidth
                                  type={canEditPreviousReading ? 'number' : 'text'}
                                  disabled={!canEditPreviousReading}
                                  value={canEditPreviousReading ? form.manualPrevActive : prevActive.toFixed(2)}
                                  onChange={(e) => updateForm(key, 'manualPrevActive', e.target.value)}
                                  helperText={canEditPreviousReading
                                    ? 'Enter the prior meter reading (first entry only)'
                                    : prior ? `Auto-carried from ${dayjs(prior.logDate).format('DD MMM YYYY')}` : ''} />
                                <TextField label="Current Reading (MWh)" type="number" size="small" fullWidth required
                                  value={form.currentActive}
                                  onChange={(e) => updateForm(key, 'currentActive', e.target.value)} />
                                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, backgroundColor: 'action.hover' }}>
                                  <Stack spacing={0.5}>
                                    <Typography variant="caption" color="text.secondary">Difference: <b>{activeDiff.toFixed(2)} MWh</b></Typography>
                                    <Typography variant="caption" color="text.secondary">Progressive Total: <b>{activeProgTotal.toFixed(2)} MWh</b></Typography>
                                    <Typography variant="caption" color="text.secondary">Average Load: <b>{avgActiveLoad.toFixed(2)} MW</b></Typography>
                                  </Stack>
                                </Paper>
                              </Stack>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1 }}>
                                Reactive Energy (MVArh)
                              </Typography>
                              <Stack spacing={1.5}>
                                <TextField label="Previous Reading (MVArh)" size="small" fullWidth
                                  type={canEditPreviousReading ? 'number' : 'text'}
                                  disabled={!canEditPreviousReading}
                                  value={canEditPreviousReading ? form.manualPrevReactive : prevReactive.toFixed(2)}
                                  onChange={(e) => updateForm(key, 'manualPrevReactive', e.target.value)}
                                  helperText={canEditPreviousReading
                                    ? 'Enter the prior meter reading (first entry only)'
                                    : prior ? `Auto-carried from ${dayjs(prior.logDate).format('DD MMM YYYY')}` : ''} />
                                <TextField label="Current Reading (MVArh)" type="number" size="small" fullWidth required
                                  value={form.currentReactive}
                                  onChange={(e) => updateForm(key, 'currentReactive', e.target.value)} />
                                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, backgroundColor: 'action.hover' }}>
                                  <Stack spacing={0.5}>
                                    <Typography variant="caption" color="text.secondary">Difference: <b>{reactiveDiff.toFixed(2)} MVArh</b></Typography>
                                    <Typography variant="caption" color="text.secondary">Progressive Total: <b>{reactiveProgTotal.toFixed(2)} MVArh</b></Typography>
                                    <Typography variant="caption" color="text.secondary">Average Load: <b>{avgReactiveLoad.toFixed(2)} MVAr</b></Typography>
                                  </Stack>
                                </Paper>
                              </Stack>
                            </Grid>
                          </Grid>

                          <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
                            {saved && (
                              <Button variant="outlined" size="small" onClick={() => handleCancelEdit(unit, fuel)} disabled={saving}>
                                Cancel
                              </Button>
                            )}
                            {(saved ? canEdit : canCreate) && (
                              <Button size="small" variant="contained" fullWidth={!saved}
                                sx={{ backgroundColor: '#B71C1C' }}
                                onClick={() => handleSaveCard(unit, fuel)}
                                disabled={saving || form.currentActive === '' || form.currentReactive === ''}
                                startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <Save />}>
                                {saving ? 'Saving...' : 'Save'}
                              </Button>
                            )}
                          </Stack>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {/* Summary */}
          <Card variant="outlined" sx={{ mb: 3, borderLeft: '4px solid #B71C1C' }}>
            <CardHeader title={`Summary — ${dayjs(selectedDate).format('DD MMM YYYY')}`} />
            <Divider />
            <CardContent>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">Total Active Generation</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{summaryTotalActive.toFixed(2)} MWh</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">Total Reactive Generation</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{summaryTotalReactive.toFixed(2)} MVArh</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">Units Reported</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{summaryUnitsReported} / {cardEntries.length}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* History */}
          <Card>
            <Box sx={{
              px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
              backgroundColor: '#B71C1C14', borderBottom: historyCollapsed ? 'none' : '1px solid', borderColor: 'divider',
            }} onClick={() => setHistoryCollapsed((p) => !p)}>
              <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1}>
                <History sx={{ color: '#B71C1C', fontSize: '1.2rem' }} />
                <Typography sx={{ fontWeight: 700, color: '#B71C1C' }}>Logged Readings</Typography>
              </Stack>
              <IconButton size="small">{historyCollapsed ? <ExpandMore fontSize="small" /> : <ExpandLess fontSize="small" />}</IconButton>
            </Box>
            <Collapse in={!historyCollapsed}>
              <CardContent>
                {historyError && <Alert severity="error" onClose={() => setHistoryError(null)} sx={{ mb: 1.5 }}>{historyError}</Alert>}

                {loadingHistory ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress size={28} />
                  </Box>
                ) : history.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <LocalFireDepartment sx={{ fontSize: '2rem', color: 'text.disabled', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      No readings recorded for this plant yet.
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer sx={{ maxHeight: 540 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow sx={{ '& th': { backgroundColor: '#FBE9E7' } }}>
                          <TableCell>Date</TableCell>
                          <TableCell>Unit</TableCell>
                          <TableCell>Fuel</TableCell>
                          <TableCell>Prev Active</TableCell>
                          <TableCell>Curr Active</TableCell>
                          <TableCell>Active Diff</TableCell>
                          <TableCell>Prev Reactive</TableCell>
                          <TableCell>Curr Reactive</TableCell>
                          <TableCell>Reactive Diff</TableCell>
                          <TableCell>Saved By</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {history.map((row, idx) => (
                          <TableRow key={row.id} hover
                            selected={row.logDate.split('T')[0] === selectedDate}
                            sx={{ cursor: 'pointer', backgroundColor: idx % 2 === 1 ? 'action.hover' : 'inherit' }}
                            onClick={() => setSelectedDate(row.logDate.split('T')[0])}>
                            <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{dayjs(row.logDate).format('DD MMM YYYY')}</Typography></TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                                <Chip label={row.unitCode} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: 11 }} />
                                <Typography variant="body2">{row.unitName}</Typography>
                              </Stack>
                            </TableCell>
                            <TableCell><Chip label={row.fuelType} size="small" sx={getFuelChipSx(row.fuelType)} /></TableCell>
                            <TableCell><Typography variant="body2">{row.previousActiveReading.toFixed(1)}</Typography></TableCell>
                            <TableCell><Typography variant="body2">{row.currentActiveReading.toFixed(1)}</Typography></TableCell>
                            <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{row.activeDifference.toFixed(1)}</Typography></TableCell>
                            <TableCell><Typography variant="body2">{row.previousReactiveReading.toFixed(1)}</Typography></TableCell>
                            <TableCell><Typography variant="body2">{row.currentReactiveReading.toFixed(1)}</Typography></TableCell>
                            <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{row.reactiveDifference.toFixed(1)}</Typography></TableCell>
                            <TableCell><Typography variant="body2" color="text.secondary">{row.updatedByName ?? row.createdByName}</Typography></TableCell>
                            <TableCell align="right">
                              {canEdit && (
                                <Tooltip title="Load for editing">
                                  <IconButton size="small" onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDate(row.logDate.split('T')[0]);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                  }}>
                                    <Edit sx={{ fontSize: 14 }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                              {canDelete && (
                                <Tooltip title="Delete">
                                  <IconButton size="small" color="error"
                                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); }}>
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
            </Collapse>
          </Card>
        </>
      )}

      <ConfirmDialog open={!!deleteTarget} title="Delete Reading"
        message={`Delete the ${deleteTarget?.fuelType ?? ''} reading for unit ${deleteTarget?.unitCode ?? ''} on ${deleteTarget?.logDate?.split('T')[0] ?? ''}? This will recompute progressive totals for any later readings of the same unit + fuel.`}
        confirmLabel="Delete" loading={deleting} onConfirm={handleDeleteHistory} onCancel={() => setDeleteTarget(null)} />
    </Box>
  );
}

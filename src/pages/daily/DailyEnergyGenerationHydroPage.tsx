import {
  Box, Card, CardContent, CardHeader, TextField, Button,
  CircularProgress, Alert, Typography, MenuItem, FormControl,
  InputLabel, Select, Grid, Divider, Chip, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, IconButton, Tooltip,
} from '@mui/material';
import { Save, Delete, Edit, WaterDrop, History, CheckCircle } from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { plantUnitApi } from '../../api/masterData/plantUnitApi';
import { dailyEnergyGenerationHydroApi } from '../../api/daily/dailyEnergyGenerationHydroApi';
import { dailyReactivePowerApi } from '../../api/daily/dailyReactivePowerApi';
import type { PowerPlant, PlantUnit } from '../../types/masterData';
import type { DailyEnergyGenerationHydro } from '../../types/dailyEnergyGenerationHydro';
import type { DailyReactivePower } from '../../types/dailyReactivePower';
import { useSectionPermissions, usePlantFilter } from '../../hooks/usePermission';
import { usePlantTypeGuard } from '../../hooks/usePlantTypeGuard';

interface UnitForm {
  id?: string;
  previousReading: string;
  currentReading: string;
  averagePowerFactor: string;
  progressiveTotal: string;
  averageLoad: string;
}

const emptyUnitForm: UnitForm = {
  previousReading: '',
  currentReading: '',
  averagePowerFactor: '',
  progressiveTotal: '',
  averageLoad: '',
};

interface ReactiveUnitForm {
  id?: string;
  previousReading: string;
  currentReading: string;
  progressiveTotal: string;
  difference: string;
}

const emptyReactiveUnitForm: ReactiveUnitForm = {
  previousReading: '',
  currentReading: '',
  progressiveTotal: '',
  difference: '',
};

interface HistoryGroup {
  logDate: string;
  records: DailyEnergyGenerationHydro[];
  unitsRecorded: number;
  totalCurrentReading: number;
  totalDifference: number;
  totalProgressiveTotal: number;
  avgPowerFactor: number | null;
  reactivePower: DailyReactivePower | null;
}

export default function DailyEnergyGenerationHydroPage() {
  const { canCreate, canEdit, canDelete } = useSectionPermissions('daily.energy_hydro');
  const isWrongPlantType = usePlantTypeGuard('hydro');
  const navigate = useNavigate();

  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const { availablePlants, plantLocked, autoPlantCode } = usePlantFilter(plants);

  const [selectedPlant, setSelectedPlant] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [plantUnits, setPlantUnits] = useState<PlantUnit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  const [peakLoadMw, setPeakLoadMw] = useState('');
  const [peakLoadTime, setPeakLoadTime] = useState('');

  const [unitForms, setUnitForms] = useState<Record<string, UnitForm>>({});
  const [reactiveUnitForms, setReactiveUnitForms] = useState<Record<string, ReactiveUnitForm>>({});
  const [unitSaveStatus, setUnitSaveStatus] = useState<Record<string, 'idle' | 'saving' | 'saved' | 'error'>>({});
  const [savedUnits, setSavedUnits] = useState<Set<string>>(new Set());

  const [history, setHistory] = useState<HistoryGroup[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HistoryGroup | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    powerPlantApi.getAll().then((res) => {
      setPlants(res.data.filter((p) => p.classificationType === 'Hydro'));
    });
  }, []);

  useEffect(() => {
    if (autoPlantCode) setSelectedPlant(autoPlantCode);
  }, [autoPlantCode]);

  // ── Load plant units + existing unit records for the selected plant/date ─────
  const loadUnitData = useCallback(() => {
    if (!selectedPlant || !selectedDate) {
      setPlantUnits([]); setUnitForms({}); setReactiveUnitForms({}); setSavedUnits(new Set()); setUnitSaveStatus({});
      return;
    }
    setLoadingUnits(true);
    Promise.allSettled([
      plantUnitApi.getByPlant(selectedPlant),
      dailyEnergyGenerationHydroApi.getByDate(selectedPlant, selectedDate),
      dailyReactivePowerApi.getByDate(selectedPlant, selectedDate),
    ]).then(([unitsRes, recordsRes, reactiveRes]) => {
      const units = unitsRes.status === 'fulfilled' ? unitsRes.value.data : [];
      const records = recordsRes.status === 'fulfilled' ? recordsRes.value.data : [];
      const reactiveRecords = reactiveRes.status === 'fulfilled' ? reactiveRes.value.data : [];

      setPlantUnits(units);

      const forms: Record<string, UnitForm> = {};
      const reactiveForms: Record<string, ReactiveUnitForm> = {};
      const saved = new Set<string>();
      for (const unit of units) {
        const record = records.find((r) => r.unitCode === unit.unitCode);
        if (record) {
          forms[unit.unitCode] = {
            id: record.id,
            previousReading: record.previousReading?.toString() ?? '',
            currentReading: record.currentReading?.toString() ?? '',
            averagePowerFactor: record.averagePowerFactor?.toString() ?? '',
            progressiveTotal: record.progressiveTotal?.toString() ?? '',
            averageLoad: record.averageLoad?.toFixed(3) ?? '',
          };
          saved.add(unit.unitCode);
        } else {
          forms[unit.unitCode] = { ...emptyUnitForm };
        }

        const reactiveRecord = reactiveRecords.find((r) => r.unitCode === unit.unitCode);
        reactiveForms[unit.unitCode] = reactiveRecord ? {
          id: reactiveRecord.id,
          previousReading: reactiveRecord.previousReading?.toString() ?? '',
          currentReading: reactiveRecord.currentReading?.toString() ?? '',
          progressiveTotal: reactiveRecord.progressiveTotal?.toString() ?? '',
          difference: reactiveRecord.difference?.toFixed(3) ?? '',
        } : { ...emptyReactiveUnitForm };
      }
      setUnitForms(forms);
      setReactiveUnitForms(reactiveForms);
      setSavedUnits(saved);
      setUnitSaveStatus({});

      const peakRecord = records.find((r) => r.akosomboPeakLoadMW != null);
      setPeakLoadMw(peakRecord?.akosomboPeakLoadMW?.toString() ?? '');
      setPeakLoadTime(peakRecord?.akosomboPeakLoadTime?.slice(0, 5) ?? '');
    }).finally(() => setLoadingUnits(false));
  }, [selectedPlant, selectedDate]);

  useEffect(() => { loadUnitData(); }, [loadUnitData]);

  // ── History ────────────────────────────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    if (!selectedPlant) { setHistory([]); return; }
    setLoadingHistory(true); setHistoryError(null);
    try {
      const [energyRes, reactivePowerRes] = await Promise.allSettled([
        dailyEnergyGenerationHydroApi.getAll({ plantCode: selectedPlant }),
        dailyReactivePowerApi.getAll({ plantCode: selectedPlant }),
      ]);
      const energyList = energyRes.status === 'fulfilled' ? energyRes.value.data : [];
      const reactivePowerList = reactivePowerRes.status === 'fulfilled' ? reactivePowerRes.value.data : [];

      const map = new Map<string, DailyEnergyGenerationHydro[]>();
      energyList.forEach((r) => {
        const d = r.logDate.split('T')[0];
        if (!map.has(d)) map.set(d, []);
        map.get(d)!.push(r);
      });

      const groups: HistoryGroup[] = Array.from(map.entries()).map(([logDate, records]) => {
        const withPowerFactor = records.filter((r) => r.averagePowerFactor != null);
        return {
          logDate,
          records,
          unitsRecorded: records.length,
          totalCurrentReading: records.reduce((s, r) => s + (r.currentReading ?? 0), 0),
          totalDifference: records.reduce((s, r) => s + (r.difference ?? 0), 0),
          totalProgressiveTotal: records.reduce((s, r) => s + (r.progressiveTotal ?? 0), 0),
          avgPowerFactor: withPowerFactor.length
            ? withPowerFactor.reduce((s, r) => s + (r.averagePowerFactor ?? 0), 0) / withPowerFactor.length
            : null,
          reactivePower: reactivePowerList.find((r) => r.logDate.split('T')[0] === logDate) ?? null,
        };
      });

      setHistory(groups.sort((a, b) => b.logDate.localeCompare(a.logDate)));

      if (energyRes.status === 'rejected' && reactivePowerRes.status === 'rejected') {
        setHistoryError('Failed to load history.');
      }
    } catch { setHistoryError('Failed to load history.'); }
    finally { setLoadingHistory(false); }
  }, [selectedPlant]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // ── Unit cards ─────────────────────────────────────────────────────────────
  const computeDifference = (unitCode: string) => {
    const form = unitForms[unitCode];
    if (!form) return '';
    const prev = parseFloat(form.previousReading) || 0;
    const curr = parseFloat(form.currentReading) || 0;
    return (curr - prev).toFixed(3);
  };

  const computeReactiveDifference = (unitCode: string) => {
    const form = reactiveUnitForms[unitCode];
    if (!form) return '';
    const prev = parseFloat(form.previousReading) || 0;
    const curr = parseFloat(form.currentReading) || 0;
    return (curr - prev).toFixed(3);
  };

  const handleUnitFieldChange = (unitCode: string, field: keyof UnitForm, value: string) => {
    setUnitForms((prev) => ({ ...prev, [unitCode]: { ...prev[unitCode], [field]: value } }));
    setSavedUnits((prev) => { const next = new Set(prev); next.delete(unitCode); return next; });
    setUnitSaveStatus((prev) => ({ ...prev, [unitCode]: 'idle' }));
  };

  const handleReactiveFieldChange = (unitCode: string, field: keyof ReactiveUnitForm, value: string) => {
    setReactiveUnitForms((prev) => ({ ...prev, [unitCode]: { ...prev[unitCode], [field]: value } }));
    setSavedUnits((prev) => { const next = new Set(prev); next.delete(unitCode); return next; });
    setUnitSaveStatus((prev) => ({ ...prev, [unitCode]: 'idle' }));
  };

  const handleSaveUnit = async (unit: PlantUnit) => {
    const energyForm = unitForms[unit.unitCode];
    const reactiveForm = reactiveUnitForms[unit.unitCode];
    if (!energyForm) return;

    setUnitSaveStatus((prev) => ({ ...prev, [unit.unitCode]: 'saving' }));
    try {
      let energyRes;
      if (energyForm.id) {
        energyRes = await dailyEnergyGenerationHydroApi.update(energyForm.id, {
          currentReading: parseFloat(energyForm.currentReading) || 0,
          averagePowerFactor: energyForm.averagePowerFactor ? parseFloat(energyForm.averagePowerFactor) : null,
          akosomboPeakLoadMW: peakLoadMw ? parseFloat(peakLoadMw) : null,
          akosomboPeakLoadTime: peakLoadTime || null,
        });
      } else {
        energyRes = await dailyEnergyGenerationHydroApi.create({
          plantCode: selectedPlant,
          unitCode: unit.unitCode,
          unitName: unit.unitName,
          logDate: selectedDate,
          currentReading: parseFloat(energyForm.currentReading) || 0,
          previousReading: energyForm.previousReading ? parseFloat(energyForm.previousReading) : undefined,
          averagePowerFactor: energyForm.averagePowerFactor ? parseFloat(energyForm.averagePowerFactor) : null,
          akosomboPeakLoadMW: peakLoadMw ? parseFloat(peakLoadMw) : null,
          akosomboPeakLoadTime: peakLoadTime || null,
        });
      }

      // Save reactive power reading (only if currentReading has a value)
      let reactiveRes = null;
      if (reactiveForm?.currentReading) {
        if (reactiveForm.id) {
          reactiveRes = await dailyReactivePowerApi.update(reactiveForm.id, {
            currentReading: parseFloat(reactiveForm.currentReading) || 0,
          });
        } else {
          reactiveRes = await dailyReactivePowerApi.create({
            plantCode: selectedPlant,
            unitCode: unit.unitCode,
            unitName: unit.unitName,
            logDate: selectedDate,
            currentReading: parseFloat(reactiveForm.currentReading) || 0,
            previousReading: reactiveForm.previousReading ? parseFloat(reactiveForm.previousReading) : undefined,
          });
        }
      }

      setUnitForms((prev) => ({
        ...prev,
        [unit.unitCode]: {
          ...prev[unit.unitCode],
          id: energyRes.data.id,
          progressiveTotal: energyRes.data.progressiveTotal?.toString() ?? '',
          averageLoad: energyRes.data.averageLoad?.toFixed(3) ?? '',
          previousReading: energyRes.data.previousReading?.toString() ?? '',
        },
      }));

      if (reactiveRes) {
        setReactiveUnitForms((prev) => ({
          ...prev,
          [unit.unitCode]: {
            ...prev[unit.unitCode],
            id: reactiveRes.data.id,
            progressiveTotal: reactiveRes.data.progressiveTotal?.toString() ?? '',
            difference: reactiveRes.data.difference?.toFixed(3) ?? '',
            previousReading: reactiveRes.data.previousReading?.toString() ?? '',
          },
        }));
      }

      setUnitSaveStatus((prev) => ({ ...prev, [unit.unitCode]: 'saved' }));
      setSavedUnits((prev) => new Set([...prev, unit.unitCode]));
      fetchHistory();
    } catch {
      setUnitSaveStatus((prev) => ({ ...prev, [unit.unitCode]: 'error' }));
    }
  };

  // ── Plant summary (live, from unitForms) ─────────────────────────────────────
  const summaryTotalCurrentReading = plantUnits.reduce((s, u) => s + (parseFloat(unitForms[u.unitCode]?.currentReading) || 0), 0);
  const summaryTotalDifference = plantUnits.reduce((s, u) => s + (parseFloat(computeDifference(u.unitCode)) || 0), 0);
  const summaryTotalProgressiveTotal = plantUnits.reduce((s, u) => s + (parseFloat(unitForms[u.unitCode]?.progressiveTotal ?? '') || 0), 0);
  const powerFactorValues = plantUnits
    .map((u) => unitForms[u.unitCode]?.averagePowerFactor)
    .filter((v): v is string => !!v && v !== '')
    .map(Number);
  const summaryAvgPowerFactor = powerFactorValues.length
    ? powerFactorValues.reduce((s, v) => s + v, 0) / powerFactorValues.length
    : null;

  const summaryTotalReactiveCurrentReading = plantUnits.reduce((s, u) => s + (parseFloat(reactiveUnitForms[u.unitCode]?.currentReading) || 0), 0);
  const summaryTotalReactiveDifference = plantUnits.reduce((s, u) => s + (parseFloat(computeReactiveDifference(u.unitCode)) || 0), 0);
  const summaryTotalReactiveProgressiveTotal = plantUnits.reduce((s, u) => s + (parseFloat(reactiveUnitForms[u.unitCode]?.progressiveTotal ?? '') || 0), 0);

  // ── Delete (all unit energy + reactive power records for a date) ────────────
  const handleDelete = async () => {
    if (!deleteTarget || !selectedPlant) return;
    setDeleting(true);
    try {
      const [energyRecords, reactiveRecords] = await Promise.allSettled([
        dailyEnergyGenerationHydroApi.getByDate(selectedPlant, deleteTarget.logDate),
        dailyReactivePowerApi.getByDate(selectedPlant, deleteTarget.logDate),
      ]);
      const energyDeletes = energyRecords.status === 'fulfilled'
        ? energyRecords.value.data.map((r) => dailyEnergyGenerationHydroApi.delete(r.id)) : [];
      const reactiveDeletes = reactiveRecords.status === 'fulfilled'
        ? reactiveRecords.value.data.map((r) => dailyReactivePowerApi.delete(r.id)) : [];
      await Promise.all([...energyDeletes, ...reactiveDeletes]);
      setDeleteTarget(null);
      fetchHistory();
      if (deleteTarget.logDate === selectedDate) loadUnitData();
    } catch { setHistoryError('Failed to delete records for this date.'); }
    finally { setDeleting(false); }
  };

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

  const showEmptyState = !selectedPlant;
  const showNoUnits = !!selectedPlant && plantUnits.length === 0 && !loadingUnits;

  return (
    <Box>
      <PageHeader
        title="Energy Readings (Hydro)"
        subtitle="Daily energy generation and reactive power readings"
        breadcrumbs={[{ label: 'Daily Readings' }, { label: 'Energy Readings (Hydro)' }]}
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
          <WaterDrop sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            Select a plant and date to load energy readings.
          </Typography>
        </Box>
      ) : showNoUnits ? (
        <Alert severity="info">No units configured for this plant.</Alert>
      ) : (
        <>
          {/* Plant Peak Load */}
          <Card sx={{ mb: 3 }} variant="outlined">
            <Box sx={{ px: 2.5, py: 1.5, backgroundColor: '#E3F2FD', borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#1565C0' }}>
                Plant Peak Load
              </Typography>
            </Box>
            <CardContent>
              <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField label="Peak Load (MW)" type="number" size="small" fullWidth
                    value={peakLoadMw} onChange={(e) => setPeakLoadMw(e.target.value)}
                    slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                    disabled={!canEdit} />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField label="Peak Load Time" type="time" size="small" fullWidth
                    value={peakLoadTime} onChange={(e) => setPeakLoadTime(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                    disabled={!canEdit} />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">
                    Peak load is recorded once per plant per day and applied to all unit records.
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Unit cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {plantUnits.map((unit) => {
              const form = unitForms[unit.unitCode];
              const status = unitSaveStatus[unit.unitCode] ?? 'idle';
              return (
                <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={unit.unitCode}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <Box sx={{
                      px: 2, py: 1.5,
                      backgroundColor: '#E3F2FD',
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{unit.unitName}</Typography>
                        <Chip label={unit.unitCode} size="small" variant="outlined"
                          sx={{ fontFamily: 'monospace', fontSize: 11 }} />
                      </Stack>
                      {savedUnits.has(unit.unitCode) && (
                        <Chip label="Saved" size="small" color="success" icon={<CheckCircle />} />
                      )}
                    </Box>

                    <CardContent>
                      <Grid container spacing={1.5}>
                        <Grid size={{ xs: 12 }}>
                          <TextField label="Previous Reading (kWh)" size="small" fullWidth
                            value={form?.previousReading ?? ''}
                            disabled
                            slotProps={{ input: { readOnly: true } }}
                            helperText="Auto-carried from previous day's current reading" />
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                          <TextField label="Current Reading (kWh)" type="number" size="small" fullWidth
                            value={form?.currentReading ?? ''}
                            onChange={(e) => handleUnitFieldChange(unit.unitCode, 'currentReading', e.target.value)}
                            disabled={!canEdit}
                            slotProps={{ htmlInput: { min: 0, step: 0.001 } }} />
                        </Grid>

                        <Grid size={{ xs: 6 }}>
                          <TextField label="Difference (kWh)" size="small" fullWidth
                            value={computeDifference(unit.unitCode)}
                            disabled
                            slotProps={{ input: { readOnly: true } }} />
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <TextField label="Progressive Total" size="small" fullWidth
                            value={form?.progressiveTotal ?? ''}
                            disabled
                            slotProps={{ input: { readOnly: true } }}
                            helperText="From server after save" />
                        </Grid>

                        <Grid size={{ xs: 6 }}>
                          <TextField label="Avg Power Factor" type="number" size="small" fullWidth
                            value={form?.averagePowerFactor ?? ''}
                            onChange={(e) => handleUnitFieldChange(unit.unitCode, 'averagePowerFactor', e.target.value)}
                            disabled={!canEdit}
                            slotProps={{ htmlInput: { min: 0, max: 1, step: 0.001 } }} />
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <TextField label="Average Load (MW)" size="small" fullWidth
                            value={form?.averageLoad ?? ''}
                            disabled
                            slotProps={{ input: { readOnly: true } }} />
                        </Grid>
                      </Grid>

                      <Divider sx={{ my: 1.5 }}>
                        <Chip label="Reactive Power (MVArh)" size="small" variant="outlined" sx={{ fontSize: 10 }} />
                      </Divider>

                      <Grid container spacing={1.5}>
                        <Grid size={{ xs: 12 }}>
                          <TextField label="Previous Reading (MVArh)" size="small" fullWidth
                            value={reactiveUnitForms[unit.unitCode]?.previousReading ?? ''}
                            disabled
                            slotProps={{ input: { readOnly: true } }}
                            helperText="Auto-carried from previous day" />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                          <TextField label="Current Reading (MVArh)" type="number" size="small" fullWidth
                            value={reactiveUnitForms[unit.unitCode]?.currentReading ?? ''}
                            onChange={(e) => handleReactiveFieldChange(unit.unitCode, 'currentReading', e.target.value)}
                            disabled={!canEdit}
                            slotProps={{ htmlInput: { min: 0, step: 0.001 } }} />
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <TextField label="Difference (MVArh)" size="small" fullWidth
                            value={computeReactiveDifference(unit.unitCode)}
                            disabled
                            slotProps={{ input: { readOnly: true } }} />
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <TextField label="Progressive Total (MVArh)" size="small" fullWidth
                            value={reactiveUnitForms[unit.unitCode]?.progressiveTotal ?? ''}
                            disabled
                            slotProps={{ input: { readOnly: true } }}
                            helperText="From server after save" />
                        </Grid>
                      </Grid>

                      {status === 'error' && (
                        <Alert severity="error" sx={{ mt: 1.5, py: 0 }}>Failed to save. Please try again.</Alert>
                      )}

                      {canCreate && (
                        <Button size="small" variant="contained" fullWidth
                          sx={{ mt: 1.5, backgroundColor: '#1565C0' }}
                          onClick={() => handleSaveUnit(unit)}
                          disabled={status === 'saving'}
                          startIcon={status === 'saving'
                            ? <CircularProgress size={14} color="inherit" />
                            : <Save />}>
                          {status === 'saving' ? 'Saving...' : 'Save'}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {/* Plant Summary */}
          <Card variant="outlined" sx={{ mb: 3, borderLeft: '4px solid #1565C0' }}>
            <CardHeader title={`Plant Summary — ${dayjs(selectedDate).format('DD MMM YYYY')}`} />
            <Divider />
            <CardContent>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                  <Typography variant="caption" color="text.secondary">Total Current Reading</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{summaryTotalCurrentReading.toFixed(3)}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                  <Typography variant="caption" color="text.secondary">Total Difference</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{summaryTotalDifference.toFixed(3)}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                  <Typography variant="caption" color="text.secondary">Total Progressive Total</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{summaryTotalProgressiveTotal.toFixed(3)}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                  <Typography variant="caption" color="text.secondary">Average Power Factor</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {summaryAvgPowerFactor != null ? summaryAvgPowerFactor.toFixed(3) : '—'}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                  <Typography variant="caption" color="text.secondary">Units Recorded</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{savedUnits.size} / {plantUnits.length}</Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />
              <Typography variant="caption" color="text.secondary"
                sx={{ display: 'block', mb: 1.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                Reactive Power
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Typography variant="caption" color="text.secondary">Total Reactive Current Reading</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{summaryTotalReactiveCurrentReading.toFixed(3)}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Typography variant="caption" color="text.secondary">Total Reactive Difference</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{summaryTotalReactiveDifference.toFixed(3)}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Typography variant="caption" color="text.secondary">Total Reactive Progressive Total</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{summaryTotalReactiveProgressiveTotal.toFixed(3)}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* History */}
          <Card>
            <CardHeader title={
              <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1}>
                <History sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
                <Typography sx={{ fontWeight: 700 }}>Logged Readings</Typography>
              </Stack>
            } />
            <Divider />
            <CardContent>
              {historyError && <Alert severity="error" onClose={() => setHistoryError(null)} sx={{ mb: 1.5 }}>{historyError}</Alert>}

              {loadingHistory ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={28} />
                </Box>
              ) : history.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <WaterDrop sx={{ fontSize: '2rem', color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    No readings recorded for this plant yet.
                  </Typography>
                </Box>
              ) : (
                <TableContainer sx={{ maxHeight: 540 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow sx={{ '& th': { backgroundColor: '#E3F2FD' } }}>
                        <TableCell>Date</TableCell>
                        <TableCell>Units Recorded</TableCell>
                        <TableCell>Total Difference</TableCell>
                        <TableCell>Total Progressive Total</TableCell>
                        <TableCell>Reactive Energy (MVArh)</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {history.map((group, idx) => (
                        <TableRow
                          key={group.logDate}
                          hover
                          selected={group.logDate === selectedDate}
                          sx={{ cursor: 'pointer', backgroundColor: idx % 2 === 1 ? 'action.hover' : 'inherit' }}
                          onClick={() => setSelectedDate(group.logDate)}
                        >
                          <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{dayjs(group.logDate).format('DD MMM YYYY')}</Typography></TableCell>
                          <TableCell><Typography variant="body2">{group.unitsRecorded} / {plantUnits.length}</Typography></TableCell>
                          <TableCell><Typography variant="body2">{group.totalDifference.toFixed(1)}</Typography></TableCell>
                          <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{group.totalProgressiveTotal.toFixed(1)}</Typography></TableCell>
                          <TableCell><Typography variant="body2">{group.reactivePower ? group.reactivePower.currentReading.toFixed(1) : '—'}</Typography></TableCell>
                          <TableCell align="right">
                            {canEdit && (
                              <Tooltip title="Load for editing">
                                <IconButton size="small" onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDate(group.logDate.split('T')[0]);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}>
                                  <Edit sx={{ fontSize: 14 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                            {canDelete && (
                              <Tooltip title="Delete">
                                <IconButton size="small" color="error"
                                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(group); }}>
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
        </>
      )}

      <ConfirmDialog open={!!deleteTarget} title="Delete Readings"
        message={`Delete all unit readings for ${selectedPlant} on ${deleteTarget?.logDate}? This will recompute progressive totals for any later readings.`}
        confirmLabel="Delete" loading={deleting} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </Box>
  );
}

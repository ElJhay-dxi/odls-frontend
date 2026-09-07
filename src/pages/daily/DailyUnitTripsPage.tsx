import {
  Box, Card, CardContent, CardHeader, TextField, Button,
  CircularProgress, Typography, MenuItem, FormControl,
  InputLabel, Select, Grid, Divider, Chip, Stack, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, IconButton, Collapse,
} from '@mui/material';
import { Save, History, ExpandMore, ExpandLess, Warning, CheckCircle } from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { plantUnitApi } from '../../api/masterData/plantUnitApi';
import { dailyUnitTripsApi } from '../../api/daily/dailyUnitTripsApi';
import type { PowerPlant, PlantUnit } from '../../types/masterData';
import type {
  DailyUnitTrip, DailyUnitTripSummary, SaveDailyUnitTripForm,
} from '../../types/dailyUnitTrips';
import { useSectionPermissions, usePlantFilter } from '../../hooks/usePermission';

const HEADER_COLOR = '#FFEBEE';
const UNIT_CARD_HEADER_COLOR = '#FFF3E0';

const today = new Date().toISOString().split('T')[0];

const emptyRowForm: SaveDailyUnitTripForm = {
  pls: '', shutdown: '', lowLoadTrip: '', highLoadTrip: '',
  preIgnition: '', preSync: '', partialLoadTrip: '', fullLoadTrip: '', remarks: '',
};

const TRIP_FIELDS: { key: keyof SaveDailyUnitTripForm; label: string }[] = [
  { key: 'pls', label: 'PLS' },
  { key: 'shutdown', label: 'Shutdown' },
  { key: 'lowLoadTrip', label: 'Low Load' },
  { key: 'highLoadTrip', label: 'High Load' },
  { key: 'preIgnition', label: 'Pre-Ignition' },
  { key: 'preSync', label: 'Pre-Sync' },
  { key: 'partialLoadTrip', label: 'Partial Load' },
  { key: 'fullLoadTrip', label: 'Full Load' },
];

const recordToForm = (rec?: DailyUnitTrip): SaveDailyUnitTripForm => rec ? {
  pls: rec.pls != null ? String(rec.pls) : '',
  shutdown: rec.shutdown != null ? String(rec.shutdown) : '',
  lowLoadTrip: rec.lowLoadTrip != null ? String(rec.lowLoadTrip) : '',
  highLoadTrip: rec.highLoadTrip != null ? String(rec.highLoadTrip) : '',
  preIgnition: rec.preIgnition != null ? String(rec.preIgnition) : '',
  preSync: rec.preSync != null ? String(rec.preSync) : '',
  partialLoadTrip: rec.partialLoadTrip != null ? String(rec.partialLoadTrip) : '',
  fullLoadTrip: rec.fullLoadTrip != null ? String(rec.fullLoadTrip) : '',
  remarks: rec.remarks ?? '',
} : { ...emptyRowForm };

const toNum = (v: string) => v === '' ? undefined : Number(v);

const computeUnitTotal = (f: SaveDailyUnitTripForm) =>
  TRIP_FIELDS.reduce((sum, { key }) => sum + (Number(f[key]) || 0), 0);

export default function DailyUnitTripsPage() {
  const { canCreate, canEdit } = useSectionPermissions('daily.plant_trips');
  const canSaveRow = canCreate || canEdit;

  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const { availablePlants, plantLocked, autoPlantCode } = usePlantFilter(plants);

  const [selectedPlant, setSelectedPlant] = useState('');
  const [selectedDate, setSelectedDate] = useState(today);

  const [units, setUnits] = useState<PlantUnit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [unitForms, setUnitForms] = useState<Record<string, SaveDailyUnitTripForm>>({});
  const [savingUnits, setSavingUnits] = useState<Record<string, 'idle' | 'saving' | 'saved' | 'error'>>({});
  const [savedUnits, setSavedUnits] = useState<Set<string>>(new Set());
  const [savingAll, setSavingAll] = useState(false);

  const [history, setHistory] = useState<DailyUnitTrip[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyCollapsed, setHistoryCollapsed] = useState(true);

  useEffect(() => {
    powerPlantApi.getAll().then((res) => setPlants(res.data));
  }, []);

  useEffect(() => {
    if (autoPlantCode) setSelectedPlant(autoPlantCode);
  }, [autoPlantCode]);

  useEffect(() => {
    if (!selectedPlant) { setUnits([]); setUnitForms({}); return; }
    setLoadingUnits(true);
    Promise.allSettled([
      plantUnitApi.getByPlant(selectedPlant),
      dailyUnitTripsApi.getByDate(selectedPlant, selectedDate),
    ]).then(([unitsRes, recordsRes]) => {
      const unitList = unitsRes.status === 'fulfilled' ? unitsRes.value.data : [];
      const recordList = recordsRes.status === 'fulfilled' ? recordsRes.value.data : [];
      setUnits(unitList);
      const nextForms: Record<string, SaveDailyUnitTripForm> = {};
      unitList.forEach((u) => {
        nextForms[u.unitCode] = recordToForm(recordList.find((r) => r.unitCode === u.unitCode));
      });
      setUnitForms(nextForms);
      setSavedUnits(new Set());
      setSavingUnits({});
    }).finally(() => setLoadingUnits(false));
  }, [selectedPlant, selectedDate]);

  const fetchHistory = useCallback(async () => {
    if (!selectedPlant) { setHistory([]); return; }
    setLoadingHistory(true);
    try {
      const res = await dailyUnitTripsApi.getAll(selectedPlant);
      setHistory(res.data);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [selectedPlant]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const setUnitField = (unitCode: string, key: keyof SaveDailyUnitTripForm, value: string) => {
    setUnitForms((prev) => ({ ...prev, [unitCode]: { ...(prev[unitCode] ?? emptyRowForm), [key]: value } }));
    setSavedUnits((prev) => { const next = new Set(prev); next.delete(unitCode); return next; });
    setSavingUnits((prev) => ({ ...prev, [unitCode]: 'idle' }));
  };

  const handleSaveUnit = async (unit: PlantUnit) => {
    const f = unitForms[unit.unitCode] ?? emptyRowForm;
    setSavingUnits((prev) => ({ ...prev, [unit.unitCode]: 'saving' }));
    try {
      await dailyUnitTripsApi.upsert({
        plantCode: selectedPlant,
        unitCode: unit.unitCode,
        logDate: selectedDate,
        pls: toNum(f.pls),
        shutdown: toNum(f.shutdown),
        lowLoadTrip: toNum(f.lowLoadTrip),
        highLoadTrip: toNum(f.highLoadTrip),
        preIgnition: toNum(f.preIgnition),
        preSync: toNum(f.preSync),
        partialLoadTrip: toNum(f.partialLoadTrip),
        fullLoadTrip: toNum(f.fullLoadTrip),
        remarks: f.remarks || undefined,
      });
      setSavingUnits((prev) => ({ ...prev, [unit.unitCode]: 'saved' }));
      setSavedUnits((prev) => new Set(prev).add(unit.unitCode));
      fetchHistory();
    } catch {
      setSavingUnits((prev) => ({ ...prev, [unit.unitCode]: 'error' }));
    }
  };

  const handleSaveAll = async () => {
    setSavingAll(true);
    for (const u of units) {
      await handleSaveUnit(u);
    }
    setSavingAll(false);
  };

  const sumField = (key: keyof SaveDailyUnitTripForm) =>
    units.reduce((s, u) => s + (Number(unitForms[u.unitCode]?.[key]) || 0), 0);

  const recordedUnitCount = units.filter((u) => {
    const f = unitForms[u.unitCode];
    if (!f) return false;
    return TRIP_FIELDS.some(({ key }) => f[key] !== '') || f.remarks !== '';
  }).length;

  const liveSummary: DailyUnitTripSummary = {
    logDate: selectedDate,
    totalPls: sumField('pls'),
    totalShutdown: sumField('shutdown'),
    totalLowLoadTrip: sumField('lowLoadTrip'),
    totalHighLoadTrip: sumField('highLoadTrip'),
    totalPreIgnition: sumField('preIgnition'),
    totalPreSync: sumField('preSync'),
    totalPartialLoadTrip: sumField('partialLoadTrip'),
    totalFullLoadTrip: sumField('fullLoadTrip'),
    totalTrips: 0,
    unitCount: recordedUnitCount,
  };
  liveSummary.totalTrips = liveSummary.totalPls + liveSummary.totalShutdown + liveSummary.totalLowLoadTrip +
    liveSummary.totalHighLoadTrip + liveSummary.totalPreIgnition + liveSummary.totalPreSync +
    liveSummary.totalPartialLoadTrip + liveSummary.totalFullLoadTrip;

  const historyGroups: (DailyUnitTripSummary & { records: DailyUnitTrip[] })[] = (() => {
    const map = new Map<string, DailyUnitTrip[]>();
    history.forEach((r) => {
      const d = r.logDate.split('T')[0];
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(r);
    });
    return Array.from(map.entries())
      .map(([logDate, records]) => {
        const totalPls = records.reduce((s, r) => s + (r.pls ?? 0), 0);
        const totalShutdown = records.reduce((s, r) => s + (r.shutdown ?? 0), 0);
        const totalLowLoadTrip = records.reduce((s, r) => s + (r.lowLoadTrip ?? 0), 0);
        const totalHighLoadTrip = records.reduce((s, r) => s + (r.highLoadTrip ?? 0), 0);
        const totalPreIgnition = records.reduce((s, r) => s + (r.preIgnition ?? 0), 0);
        const totalPreSync = records.reduce((s, r) => s + (r.preSync ?? 0), 0);
        const totalPartialLoadTrip = records.reduce((s, r) => s + (r.partialLoadTrip ?? 0), 0);
        const totalFullLoadTrip = records.reduce((s, r) => s + (r.fullLoadTrip ?? 0), 0);
        return {
          logDate,
          totalPls, totalShutdown, totalLowLoadTrip, totalHighLoadTrip,
          totalPreIgnition, totalPreSync, totalPartialLoadTrip, totalFullLoadTrip,
          totalTrips: totalPls + totalShutdown + totalLowLoadTrip + totalHighLoadTrip +
            totalPreIgnition + totalPreSync + totalPartialLoadTrip + totalFullLoadTrip,
          unitCount: records.length,
          records,
        };
      })
      .sort((a, b) => b.logDate.localeCompare(a.logDate));
  })();

  const showEmptyState = !selectedPlant || (units.length === 0 && !loadingUnits);

  return (
    <Box>
      <PageHeader
        title="Plant Trips"
        subtitle="Daily unit-level trip and shutdown records"
        breadcrumbs={[{ label: 'Daily Readings' }, { label: 'Plant Trips' }]}
      />

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, sm: 5 }}>
              <FormControl fullWidth required disabled={plantLocked}>
                <InputLabel>Power Plant</InputLabel>
                <Select label="Power Plant" value={selectedPlant} onChange={(e) => setSelectedPlant(e.target.value)}>
                  {availablePlants.map((p: PowerPlant) => (
                    <MenuItem key={p.id} value={p.plantCode}>{p.plantName} ({p.plantCode}) — {p.classificationType}</MenuItem>
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
          <Warning sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            Select a plant and date to load unit readings.
          </Typography>
        </Box>
      ) : (
        <>
          <Card sx={{ mb: 3 }}>
            <CardHeader title={
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Warning sx={{ color: '#B71C1C' }} />
                <Typography sx={{ fontWeight: 700 }}>Unit Trips — {selectedDate}</Typography>
              </Stack>
            } />
            <Divider />
            <CardContent>
              {loadingUnits && units.length === 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={28} />
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {units.map((u) => {
                    const f = unitForms[u.unitCode] ?? emptyRowForm;
                    const status = savingUnits[u.unitCode] ?? 'idle';
                    return (
                      <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={u.unitCode}>
                        <Card variant="outlined" sx={{ height: '100%' }}>
                          <Box sx={{
                            px: 2, py: 1.5,
                            backgroundColor: UNIT_CARD_HEADER_COLOR,
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}>
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>{u.unitName}</Typography>
                              <Chip label={u.unitCode} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: 11 }} />
                            </Stack>
                            {savedUnits.has(u.unitCode) && (
                              <Chip label="Saved" size="small" color="success" variant="filled" icon={<CheckCircle />} />
                            )}
                          </Box>

                          <CardContent>
                            <Grid container spacing={1.5}>
                              {TRIP_FIELDS.map(({ key, label }) => (
                                <Grid key={key} size={{ xs: 6 }}>
                                  <TextField label={label} type="number" size="small" fullWidth
                                    value={f[key]}
                                    onChange={(e) => setUnitField(u.unitCode, key, e.target.value)}
                                    slotProps={{ htmlInput: { min: 0, step: 1 } }} />
                                </Grid>
                              ))}
                              <Grid size={{ xs: 12 }}>
                                <TextField label="Remarks" size="small" fullWidth multiline maxRows={2}
                                  value={f.remarks}
                                  onChange={(e) => setUnitField(u.unitCode, 'remarks', e.target.value)} />
                              </Grid>
                            </Grid>

                            <Box sx={{ mt: 1, p: 1, backgroundColor: '#F5F5F5', borderRadius: 1, textAlign: 'center' }}>
                              <Typography variant="caption" color="text.secondary">Unit Total Trips</Typography>
                              <Typography variant="h6" sx={{ fontWeight: 700, color: '#B71C1C' }}>
                                {computeUnitTotal(f)}
                              </Typography>
                            </Box>

                            {status === 'error' && (
                              <Alert severity="error" sx={{ mt: 1.5, py: 0 }}>Failed to save.</Alert>
                            )}
                            {canSaveRow && (
                              <Button
                                size="small"
                                variant="contained"
                                fullWidth
                                sx={{ mt: 1.5, backgroundColor: '#1565C0' }}
                                onClick={() => handleSaveUnit(u)}
                                disabled={status === 'saving'}
                                startIcon={status === 'saving'
                                  ? <CircularProgress size={14} color="inherit" />
                                  : <Save />}
                              >
                                {status === 'saving' ? 'Saving...' : 'Save'}
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              )}
            </CardContent>
          </Card>

          <Card variant="outlined" elevation={0} sx={{ mb: 3, borderLeft: '4px solid #1565C0' }}>
            <CardHeader
              title={`Plant Summary — ${selectedDate}`}
              action={canSaveRow && units.length > 0 && (
                <Button size="small" variant="contained" onClick={handleSaveAll}
                  disabled={savingAll}
                  startIcon={savingAll ? <CircularProgress size={14} color="inherit" /> : <Save fontSize="small" />}
                  sx={{ mt: 1, mr: 1 }}>
                  {savingAll ? 'Saving...' : 'Save All'}
                </Button>
              )}
            />
            <Divider />
            <CardContent>
              <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">Total Trips</Typography>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>{liveSummary.totalTrips}</Typography>
                    <Chip label={liveSummary.totalTrips > 0 ? 'Trips Logged' : 'No Trips'}
                      size="small" color={liveSummary.totalTrips > 0 ? 'error' : 'success'}
                      variant="outlined" sx={{ fontWeight: 700 }} />
                  </Stack>
                </Grid>
                {[
                  { label: 'Total PLS', value: liveSummary.totalPls },
                  { label: 'Total Shutdown', value: liveSummary.totalShutdown },
                  { label: 'Total Low Load Trips', value: liveSummary.totalLowLoadTrip },
                  { label: 'Total High Load Trips', value: liveSummary.totalHighLoadTrip },
                  { label: 'Total Pre-Ignition', value: liveSummary.totalPreIgnition },
                  { label: 'Total Pre-Sync', value: liveSummary.totalPreSync },
                  { label: 'Total Partial Load Trips', value: liveSummary.totalPartialLoadTrip },
                  { label: 'Total Full Load Trips', value: liveSummary.totalFullLoadTrip },
                ].map(({ label, value }) => (
                  <Grid key={label} size={{ xs: 6, sm: 3, md: 3 }}>
                    <Typography variant="caption" color="text.secondary">{label}</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{value}</Typography>
                  </Grid>
                ))}
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">Units Recorded</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{liveSummary.unitCount} / {units.length}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card>
            <Box sx={{
              px: 2.5, py: 1.5,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer',
              backgroundColor: `${HEADER_COLOR}`,
              borderBottom: historyCollapsed ? 'none' : '1px solid',
              borderColor: 'divider',
            }} onClick={() => setHistoryCollapsed((p) => !p)}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <History sx={{ color: '#B71C1C', fontSize: '1.1rem' }} />
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#B71C1C' }}>
                  History
                </Typography>
              </Stack>
              <IconButton size="small">
                {historyCollapsed ? <ExpandMore fontSize="small" /> : <ExpandLess fontSize="small" />}
              </IconButton>
            </Box>
            <Collapse in={!historyCollapsed} timeout="auto" unmountOnExit>
              <CardContent>
                {loadingHistory ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : historyGroups.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No history recorded for this plant yet.</Typography>
                ) : (
                  <TableContainer sx={{ maxHeight: 400 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Units Recorded</TableCell>
                          <TableCell>Total Trips</TableCell>
                          <TableCell>Total PLS</TableCell>
                          <TableCell>Total Shutdown</TableCell>
                          <TableCell>Total Low Load</TableCell>
                          <TableCell>Total High Load</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {historyGroups.map((g) => (
                          <TableRow key={g.logDate} hover selected={g.logDate === selectedDate}
                            sx={{ cursor: 'pointer' }} onClick={() => setSelectedDate(g.logDate)}>
                            <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{g.logDate}</Typography></TableCell>
                            <TableCell>{g.unitCount}</TableCell>
                            <TableCell>
                              {g.totalTrips > 0 ? (
                                <Chip label={g.totalTrips} size="small" color="error" variant="outlined" sx={{ fontWeight: 700 }} />
                              ) : g.totalTrips}
                            </TableCell>
                            <TableCell>{g.totalPls}</TableCell>
                            <TableCell>{g.totalShutdown}</TableCell>
                            <TableCell>{g.totalLowLoadTrip}</TableCell>
                            <TableCell>{g.totalHighLoadTrip}</TableCell>
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
    </Box>
  );
}

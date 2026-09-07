import {
  Box, Card, CardContent, CardHeader, TextField, Button,
  CircularProgress, Typography, MenuItem, FormControl,
  InputLabel, Select, Grid, Divider, Chip, Stack, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, IconButton, Collapse,
} from '@mui/material';
import { Save, History, ExpandMore, ExpandLess, AccessTime, CheckCircle } from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { plantUnitApi } from '../../api/masterData/plantUnitApi';
import { dailyUnitAvailabilityApi } from '../../api/daily/dailyUnitAvailabilityApi';
import type { PowerPlant, PlantUnit } from '../../types/masterData';
import type {
  DailyUnitAvailability, DailyUnitAvailabilitySummary, SaveDailyUnitAvailabilityForm,
} from '../../types/dailyUnitAvailability';
import { useSectionPermissions, usePlantFilter } from '../../hooks/usePermission';

const HEADER_COLOR = '#E3F2FD';

const today = new Date().toISOString().split('T')[0];

const emptyRowForm: SaveDailyUnitAvailabilityForm = {
  serviceHours: '', runHours: '', reserveShutdownHours: '', forcedOutageHours: '',
  plannedOutageHours: '', maintenanceOutageHours: '', extendedPlannedOutageHours: '',
  extendedMaintenanceOutageHours: '', remarks: '',
};

const HOUR_FIELDS: { key: keyof SaveDailyUnitAvailabilityForm; label: string }[] = [
  { key: 'serviceHours', label: 'Service Hrs' },
  { key: 'runHours', label: 'Run Hrs' },
  { key: 'reserveShutdownHours', label: 'Reserve Shutdown' },
  { key: 'forcedOutageHours', label: 'Forced Outage' },
  { key: 'plannedOutageHours', label: 'Planned Outage' },
  { key: 'maintenanceOutageHours', label: 'Maintenance' },
  { key: 'extendedPlannedOutageHours', label: 'Ext. Planned' },
  { key: 'extendedMaintenanceOutageHours', label: 'Ext. Maintenance' },
];

const recordToForm = (rec?: DailyUnitAvailability): SaveDailyUnitAvailabilityForm => rec ? {
  serviceHours: rec.serviceHours != null ? String(rec.serviceHours) : '',
  runHours: rec.runHours != null ? String(rec.runHours) : '',
  reserveShutdownHours: rec.reserveShutdownHours != null ? String(rec.reserveShutdownHours) : '',
  forcedOutageHours: rec.forcedOutageHours != null ? String(rec.forcedOutageHours) : '',
  plannedOutageHours: rec.plannedOutageHours != null ? String(rec.plannedOutageHours) : '',
  maintenanceOutageHours: rec.maintenanceOutageHours != null ? String(rec.maintenanceOutageHours) : '',
  extendedPlannedOutageHours: rec.extendedPlannedOutageHours != null ? String(rec.extendedPlannedOutageHours) : '',
  extendedMaintenanceOutageHours: rec.extendedMaintenanceOutageHours != null ? String(rec.extendedMaintenanceOutageHours) : '',
  remarks: rec.remarks ?? '',
} : { ...emptyRowForm };

const toNum = (v: string) => v === '' ? undefined : Number(v);

export default function DailyUnitAvailabilityPage() {
  const { canCreate, canEdit } = useSectionPermissions('daily.plant_availability');
  const canSaveRow = canCreate || canEdit;

  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const { availablePlants, plantLocked, autoPlantCode } = usePlantFilter(plants);

  const [selectedPlant, setSelectedPlant] = useState('');
  const [selectedDate, setSelectedDate] = useState(today);

  const [units, setUnits] = useState<PlantUnit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [unitForms, setUnitForms] = useState<Record<string, SaveDailyUnitAvailabilityForm>>({});
  const [savingUnits, setSavingUnits] = useState<Record<string, 'idle' | 'saving' | 'saved' | 'error'>>({});
  const [savedUnits, setSavedUnits] = useState<Set<string>>(new Set());
  const [savingAll, setSavingAll] = useState(false);

  const [history, setHistory] = useState<DailyUnitAvailability[]>([]);
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
      dailyUnitAvailabilityApi.getByDate(selectedPlant, selectedDate),
    ]).then(([unitsRes, recordsRes]) => {
      const unitList = unitsRes.status === 'fulfilled' ? unitsRes.value.data : [];
      const recordList = recordsRes.status === 'fulfilled' ? recordsRes.value.data : [];
      setUnits(unitList);
      const nextForms: Record<string, SaveDailyUnitAvailabilityForm> = {};
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
      const res = await dailyUnitAvailabilityApi.getAll(selectedPlant);
      setHistory(res.data);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [selectedPlant]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const setUnitField = (unitCode: string, key: keyof SaveDailyUnitAvailabilityForm, value: string) => {
    setUnitForms((prev) => ({ ...prev, [unitCode]: { ...(prev[unitCode] ?? emptyRowForm), [key]: value } }));
    setSavedUnits((prev) => { const next = new Set(prev); next.delete(unitCode); return next; });
    setSavingUnits((prev) => ({ ...prev, [unitCode]: 'idle' }));
  };

  const handleSaveUnit = async (unit: PlantUnit) => {
    const f = unitForms[unit.unitCode] ?? emptyRowForm;
    setSavingUnits((prev) => ({ ...prev, [unit.unitCode]: 'saving' }));
    try {
      await dailyUnitAvailabilityApi.upsert({
        plantCode: selectedPlant,
        unitCode: unit.unitCode,
        logDate: selectedDate,
        serviceHours: toNum(f.serviceHours),
        runHours: toNum(f.runHours),
        reserveShutdownHours: toNum(f.reserveShutdownHours),
        forcedOutageHours: toNum(f.forcedOutageHours),
        plannedOutageHours: toNum(f.plannedOutageHours),
        maintenanceOutageHours: toNum(f.maintenanceOutageHours),
        extendedPlannedOutageHours: toNum(f.extendedPlannedOutageHours),
        extendedMaintenanceOutageHours: toNum(f.extendedMaintenanceOutageHours),
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

  const sumField = (key: keyof SaveDailyUnitAvailabilityForm) =>
    units.reduce((s, u) => s + (Number(unitForms[u.unitCode]?.[key]) || 0), 0);

  const recordedUnitCount = units.filter((u) => {
    const f = unitForms[u.unitCode];
    if (!f) return false;
    return HOUR_FIELDS.some(({ key }) => f[key] !== '') || f.remarks !== '';
  }).length;

  const liveSummary: DailyUnitAvailabilitySummary = {
    logDate: selectedDate,
    totalServiceHours: sumField('serviceHours'),
    totalRunHours: sumField('runHours'),
    totalReserveShutdownHours: sumField('reserveShutdownHours'),
    totalForcedOutageHours: sumField('forcedOutageHours'),
    totalPlannedOutageHours: sumField('plannedOutageHours'),
    totalMaintenanceOutageHours: sumField('maintenanceOutageHours'),
    totalExtendedPlannedOutageHours: sumField('extendedPlannedOutageHours'),
    totalExtendedMaintenanceOutageHours: sumField('extendedMaintenanceOutageHours'),
    unitCount: recordedUnitCount,
  };

  const historyGroups: (DailyUnitAvailabilitySummary & { records: DailyUnitAvailability[] })[] = (() => {
    const map = new Map<string, DailyUnitAvailability[]>();
    history.forEach((r) => {
      const d = r.logDate.split('T')[0];
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(r);
    });
    return Array.from(map.entries())
      .map(([logDate, records]) => ({
        logDate,
        totalServiceHours: records.reduce((s, r) => s + (r.serviceHours ?? 0), 0),
        totalRunHours: records.reduce((s, r) => s + (r.runHours ?? 0), 0),
        totalReserveShutdownHours: records.reduce((s, r) => s + (r.reserveShutdownHours ?? 0), 0),
        totalForcedOutageHours: records.reduce((s, r) => s + (r.forcedOutageHours ?? 0), 0),
        totalPlannedOutageHours: records.reduce((s, r) => s + (r.plannedOutageHours ?? 0), 0),
        totalMaintenanceOutageHours: records.reduce((s, r) => s + (r.maintenanceOutageHours ?? 0), 0),
        totalExtendedPlannedOutageHours: records.reduce((s, r) => s + (r.extendedPlannedOutageHours ?? 0), 0),
        totalExtendedMaintenanceOutageHours: records.reduce((s, r) => s + (r.extendedMaintenanceOutageHours ?? 0), 0),
        unitCount: records.length,
        records,
      }))
      .sort((a, b) => b.logDate.localeCompare(a.logDate));
  })();

  const showEmptyState = !selectedPlant || (units.length === 0 && !loadingUnits);

  return (
    <Box>
      <PageHeader
        title="Plant Availability"
        subtitle="Daily unit-level availability and outage hours"
        breadcrumbs={[{ label: 'Daily Readings' }, { label: 'Plant Availability' }]}
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
          <AccessTime sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            Select a plant and date to load unit readings.
          </Typography>
        </Box>
      ) : (
        <>
          <Card sx={{ mb: 3 }}>
            <CardHeader title={
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <AccessTime sx={{ color: '#1565C0' }} />
                <Typography sx={{ fontWeight: 700 }}>Unit Availability — {selectedDate}</Typography>
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
                            backgroundColor: HEADER_COLOR,
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
                              {HOUR_FIELDS.map(({ key, label }) => (
                                <Grid key={key} size={{ xs: 6 }}>
                                  <TextField label={label} type="number" size="small" fullWidth
                                    value={f[key]}
                                    onChange={(e) => setUnitField(u.unitCode, key, e.target.value)}
                                    slotProps={{ htmlInput: { min: 0, step: 0.5 } }} />
                                </Grid>
                              ))}
                              <Grid size={{ xs: 12 }}>
                                <TextField label="Remarks" size="small" fullWidth multiline maxRows={2}
                                  value={f.remarks}
                                  onChange={(e) => setUnitField(u.unitCode, 'remarks', e.target.value)} />
                              </Grid>
                            </Grid>

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
              <Grid container spacing={2}>
                {[
                  { label: 'Total Service Hours', value: liveSummary.totalServiceHours },
                  { label: 'Total Run Hours', value: liveSummary.totalRunHours },
                  { label: 'Total Reserve Shutdown Hours', value: liveSummary.totalReserveShutdownHours },
                  { label: 'Total Forced Outage Hours', value: liveSummary.totalForcedOutageHours },
                  { label: 'Total Planned Outage Hours (Planned + Extended)', value: liveSummary.totalPlannedOutageHours + liveSummary.totalExtendedPlannedOutageHours },
                  { label: 'Total Maintenance Outage Hours (Maintenance + Extended)', value: liveSummary.totalMaintenanceOutageHours + liveSummary.totalExtendedMaintenanceOutageHours },
                ].map(({ label, value }) => (
                  <Grid key={label} size={{ xs: 12, sm: 6, md: 4 }}>
                    <Typography variant="caption" color="text.secondary">{label}</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{value.toFixed(1)}</Typography>
                  </Grid>
                ))}
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
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
                <History sx={{ color: '#1565C0', fontSize: '1.1rem' }} />
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#1565C0' }}>
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
                          <TableCell>Total Service Hrs</TableCell>
                          <TableCell>Total Run Hrs</TableCell>
                          <TableCell>Total Forced Outage</TableCell>
                          <TableCell>Total Planned Outage</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {historyGroups.map((g) => (
                          <TableRow key={g.logDate} hover selected={g.logDate === selectedDate}
                            sx={{ cursor: 'pointer' }} onClick={() => setSelectedDate(g.logDate)}>
                            <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{g.logDate}</Typography></TableCell>
                            <TableCell>{g.unitCount}</TableCell>
                            <TableCell>{g.totalServiceHours.toFixed(1)}</TableCell>
                            <TableCell>{g.totalRunHours.toFixed(1)}</TableCell>
                            <TableCell>{g.totalForcedOutageHours.toFixed(1)}</TableCell>
                            <TableCell>{(g.totalPlannedOutageHours + g.totalExtendedPlannedOutageHours).toFixed(1)}</TableCell>
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

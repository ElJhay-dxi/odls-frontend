import {
  Box, Card, CardContent, CardHeader, TextField, Button,
  CircularProgress, Alert, Typography, MenuItem, FormControl,
  InputLabel, Select, Grid, Divider, Chip, Stack, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, IconButton, Tooltip, Collapse,
} from '@mui/material';
import {
  Save, Search, Edit, Delete, History,
  ExpandMore, ExpandLess, AccessTime,
} from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { dailyPlantAvailabilityApi } from '../../api/daily/dailyPlantAvailabilityApi';
import type { PowerPlant } from '../../types/masterData';
import type { DailyPlantAvailability, DailyPlantAvailabilityForm } from '../../types/dailyPlantAvailability';
import { useSectionPermissions, usePlantFilter } from '../../hooks/usePermission';

const emptyForm: DailyPlantAvailabilityForm = {
  plantCode: '', logDate: new Date().toISOString().split('T')[0],
  reserveShutdownHours: '', serviceHours: '', runHours: '',
  forcedOutageU1: '', forcedOutageU2: '', forcedOutageU3: '',
  startingFailure: '', forcedOutageOutsideMgmt: '',
  maintenanceOutage: '', extendedMaintenanceOutage: '', maintenanceOutageOutsideMgmt: '',
  plannedOutage: '', extendedPlannedOutage: '', plannedOutageOutsideMgmt: '',
};

const toN = (v: unknown) => Number(v) || 0;
const pct = (v?: number) => v != null ? `${v.toFixed(2)}%` : '—';

const OUTAGE_SECTIONS = [
  {
    key: 'forced', title: 'Forced Outage Hours', color: '#B71C1C',
    fields: [
      { key: 'forcedOutageU1', label: 'Immediate (U1)' },
      { key: 'forcedOutageU2', label: 'Delayed (U2)' },
      { key: 'forcedOutageU3', label: 'Postponed (U3)' },
      { key: 'startingFailure', label: 'Starting Failure' },
      { key: 'forcedOutageOutsideMgmt', label: 'Outside Mgmt Control' },
    ],
  },
  {
    key: 'maintenance', title: 'Maintenance Outage Hours', color: '#E65100',
    fields: [
      { key: 'maintenanceOutage', label: 'Maintenance Outage' },
      { key: 'extendedMaintenanceOutage', label: 'Extended Maintenance' },
      { key: 'maintenanceOutageOutsideMgmt', label: 'Outside Mgmt Control' },
    ],
  },
  {
    key: 'planned', title: 'Planned Outage Hours', color: '#1565C0',
    fields: [
      { key: 'plannedOutage', label: 'Planned Outage' },
      { key: 'extendedPlannedOutage', label: 'Extended Planned' },
      { key: 'plannedOutageOutsideMgmt', label: 'Outside Mgmt Control' },
    ],
  },
];

export default function DailyPlantAvailabilityPage() {
  const { canCreate, canEdit, canDelete } = useSectionPermissions('daily.plant_availability');
  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const { availablePlants, plantLocked, autoPlantCode } = usePlantFilter(plants);

  const [form, setForm] = useState<DailyPlantAvailabilityForm>(emptyForm);
  const [updateForm, setUpdateForm] = useState<Partial<DailyPlantAvailabilityForm>>({});
  const [editTarget, setEditTarget] = useState<DailyPlantAvailability | null>(null);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    forced: false, maintenance: false, planned: false,
  });

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [filterPlant, setFilterPlant] = useState('');
  const [records, setRecords] = useState<DailyPlantAvailability[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<DailyPlantAvailability | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    powerPlantApi.getAll().then((res) => setPlants(res.data));
  }, []);

  useEffect(() => {
    if (autoPlantCode) {
      setForm((prev) => ({ ...prev, plantCode: autoPlantCode }));
      setFilterPlant(autoPlantCode);
    }
  }, [autoPlantCode]);

  const fetchRecords = useCallback(async () => {
    if (!filterPlant) return;
    setLoadingRecords(true);
    setRecordsError(null);
    try {
      const res = await dailyPlantAvailabilityApi.getAll({ plantCode: filterPlant });
      setRecords(res.data.sort((a, b) => b.logDate.localeCompare(a.logDate)));
    } catch {
      setRecordsError('Failed to load records.');
    } finally {
      setLoadingRecords(false);
    }
  }, [filterPlant]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const activeForm = editTarget
    ? (updateForm as unknown as Record<string, unknown>)
    : (form as unknown as Record<string, unknown>);

  const fv = (key: string) => String(activeForm[key] ?? '');
  const setField = (key: string, val: string) => {
    if (editTarget) setUpdateForm((prev) => ({ ...prev, [key]: val }));
    else setForm((prev) => ({ ...prev, [key]: val } as DailyPlantAvailabilityForm));
  };

  // Live preview computations
  const period = 24;
  const forcedHrs = toN(activeForm.forcedOutageU1) + toN(activeForm.forcedOutageU2) +
    toN(activeForm.forcedOutageU3) + toN(activeForm.startingFailure) + toN(activeForm.forcedOutageOutsideMgmt);
  const maintHrs = toN(activeForm.maintenanceOutage) + toN(activeForm.extendedMaintenanceOutage) +
    toN(activeForm.maintenanceOutageOutsideMgmt);
  const plannedHrs = toN(activeForm.plannedOutage) + toN(activeForm.extendedPlannedOutage) +
    toN(activeForm.plannedOutageOutsideMgmt);
  const unavailHrs = forcedHrs + maintHrs + plannedHrs;
  const availHrs = period - unavailHrs;
  const serviceHrs = toN(activeForm.serviceHours);
  const runHrs = toN(activeForm.runHours);

  const liveAF  = (availHrs / period) * 100;
  const liveFOF = (forcedHrs / period) * 100;
  const liveCF  = (serviceHrs / period) * 100;
  const livePOF = (plannedHrs / period) * 100;
  const liveMOF = (maintHrs / period) * 100;
  const liveSOF = ((plannedHrs + maintHrs) / period) * 100;
  const liveUF  = (runHrs / period) * 100;

  const selectedPlantType = editTarget
    ? editTarget.classificationType
    : plants.find((p) => p.plantCode === form.plantCode)?.classificationType;

  const openEdit = (row: DailyPlantAvailability) => {
    setEditTarget(row);
    setSaveError(null);
    setSaveSuccess(false);
    setUpdateForm({
      reserveShutdownHours: row.reserveShutdownHours, serviceHours: row.serviceHours,
      runHours: row.runHours,
      forcedOutageU1: row.forcedOutageU1, forcedOutageU2: row.forcedOutageU2,
      forcedOutageU3: row.forcedOutageU3, startingFailure: row.startingFailure,
      forcedOutageOutsideMgmt: row.forcedOutageOutsideMgmt,
      maintenanceOutage: row.maintenanceOutage,
      extendedMaintenanceOutage: row.extendedMaintenanceOutage,
      maintenanceOutageOutsideMgmt: row.maintenanceOutageOutsideMgmt,
      plannedOutage: row.plannedOutage, extendedPlannedOutage: row.extendedPlannedOutage,
      plannedOutageOutsideMgmt: row.plannedOutageOutsideMgmt,
    });
  };

  const cancelEdit = () => { setEditTarget(null); setUpdateForm({}); };

  const buildPayload = (f: Record<string, unknown>) => ({
    reserveShutdownHours: toN(f.reserveShutdownHours), serviceHours: toN(f.serviceHours),
    runHours: toN(f.runHours),
    forcedOutageU1: toN(f.forcedOutageU1), forcedOutageU2: toN(f.forcedOutageU2),
    forcedOutageU3: toN(f.forcedOutageU3), startingFailure: toN(f.startingFailure),
    forcedOutageOutsideMgmt: toN(f.forcedOutageOutsideMgmt),
    maintenanceOutage: toN(f.maintenanceOutage),
    extendedMaintenanceOutage: toN(f.extendedMaintenanceOutage),
    maintenanceOutageOutsideMgmt: toN(f.maintenanceOutageOutsideMgmt),
    plannedOutage: toN(f.plannedOutage), extendedPlannedOutage: toN(f.extendedPlannedOutage),
    plannedOutageOutsideMgmt: toN(f.plannedOutageOutsideMgmt),
  });

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      if (editTarget) {
        await dailyPlantAvailabilityApi.update(editTarget.id, buildPayload(updateForm as Record<string, unknown>));
        cancelEdit();
      } else {
        await dailyPlantAvailabilityApi.create({
          plantCode: form.plantCode, logDate: form.logDate,
          ...buildPayload(form as unknown as Record<string, unknown>),
        });
        setForm(emptyForm);
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
      await dailyPlantAvailabilityApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchRecords();
    } catch {
      setRecordsError('Failed to delete record.');
    } finally {
      setDeleting(false);
    }
  };

  const isFormValid = editTarget ? true : form.plantCode && form.logDate;

  return (
    <Box>
      <PageHeader
        title="Daily Plant Availability"
        subtitle="Daily availability hours and reliability indices per plant"
        breadcrumbs={[{ label: 'Daily Readings' }, { label: 'Plant Availability' }]}
      />

      <Grid container spacing={3}>
        {/* ── Left: Entry form ── */}
        <Grid size={{ xs: 12, lg: 7 }}>
          <Card>
            <CardHeader
              title={
                <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1.5}>
                  <AccessTime sx={{ color: '#1565C0' }} />
                  <Typography sx={{ fontWeight: 700 }}>
                    {editTarget
                      ? `Editing: ${editTarget.plantCode} — ${editTarget.logDate?.split('T')[0]}`
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
              {saveError && <Alert severity="error" onClose={() => setSaveError(null)} sx={{ mb: 2 }}>{saveError}</Alert>}
              {saveSuccess && <Alert severity="success" onClose={() => setSaveSuccess(false)} sx={{ mb: 2 }}>Reading saved successfully.</Alert>}

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
                      <Select label="Power Plant"
                        value={editTarget ? editTarget.plantCode : form.plantCode}
                        onChange={(e) => setForm((prev) => ({ ...prev, plantCode: e.target.value }))}>
                        {availablePlants.map((p: PowerPlant) => (
                          <MenuItem key={p.id} value={p.plantCode}>
                            {p.plantName} ({p.plantCode}) — {p.classificationType}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Log Date" type="date" fullWidth required
                      value={editTarget ? editTarget.logDate?.split('T')[0] : form.logDate}
                      onChange={(e) => setForm((prev) => ({ ...prev, logDate: e.target.value }))}
                      disabled={!!editTarget}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid>
                  {selectedPlantType && (
                    <Grid size={{ xs: 12 }}>
                      <Chip label={selectedPlantType} size="small"
                        color={selectedPlantType === 'Hydro' ? 'info' : 'error'} variant="outlined" />
                    </Grid>
                  )}
                </Grid>
              </Paper>

              {/* Operational hours */}
              <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary"
                  sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                  Operational Hours
                </Typography>
                <Grid container spacing={2}>
                  {[
                    { key: 'reserveShutdownHours', label: 'Reserve Shutdown' },
                    { key: 'serviceHours', label: 'Service Hours' },
                    { key: 'runHours', label: 'Run Hours' },
                  ].map(({ key, label }) => (
                    <Grid key={key} size={{ xs: 12, sm: 4 }}>
                      <TextField label={label} type="number" fullWidth size="small"
                        value={fv(key)} onChange={(e) => setField(key, e.target.value)}
                        slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">hrs</Typography> } }}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Paper>

              {/* Outage sections */}
              {OUTAGE_SECTIONS.map((section) => (
                <Paper key={section.key} variant="outlined" sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
                  <Box sx={{
                    px: 2, py: 1.2, backgroundColor: `${section.color}14`,
                    borderBottom: collapsed[section.key] ? 'none' : '1px solid', borderColor: 'divider',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
                  }}
                    onClick={() => setCollapsed((prev) => ({ ...prev, [section.key]: !prev[section.key] }))}>
                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: section.color }}>
                      {section.title}
                    </Typography>
                    <IconButton size="small">
                      {collapsed[section.key] ? <ExpandMore fontSize="small" /> : <ExpandLess fontSize="small" />}
                    </IconButton>
                  </Box>
                  <Collapse in={!collapsed[section.key]}>
                    <Box sx={{ p: 2 }}>
                      <Grid container spacing={2}>
                        {section.fields.map(({ key, label }) => (
                          <Grid key={key} size={{ xs: 12, sm: 4 }}>
                            <TextField label={label} type="number" fullWidth size="small"
                              value={fv(key)} onChange={(e) => setField(key, e.target.value)}
                              slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">hrs</Typography> } }}
                            />
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  </Collapse>
                </Paper>
              ))}

              {/* Live computed factors */}
              <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2, backgroundColor: 'action.hover' }}>
                <Typography variant="caption" color="text.secondary"
                  sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                  Computed Preview
                </Typography>
                <Grid container spacing={1.5}>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary">Available Hrs</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700 }}>{availHrs.toFixed(1)}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary">Unavailable Hrs</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700 }}>{unavailHrs.toFixed(1)}</Typography>
                  </Grid>
                  {[
                    { label: 'Availability Factor', value: pct(liveAF) },
                    { label: 'Forced Outage Factor', value: pct(liveFOF) },
                    { label: 'Capacity Factor', value: pct(liveCF) },
                    { label: 'Planned Outage Factor', value: pct(livePOF) },
                    { label: 'Scheduled Outage Factor', value: pct(liveSOF) },
                    ...(selectedPlantType === 'Hydro' ? [{ label: 'Utilization Factor (Hydro)', value: pct(liveUF) }] : []),
                    ...(selectedPlantType === 'Thermal' ? [{ label: 'Maintenance Outage Factor (Thermal)', value: pct(liveMOF) }] : []),
                  ].map(({ label, value }) => (
                    <Grid key={label} size={{ xs: 6, sm: 3 }}>
                      <Typography variant="caption" color="text.secondary">{label}</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 700 }}>{value}</Typography>
                    </Grid>
                  ))}
                </Grid>
              </Paper>

              <Stack direction="row" spacing={1.5}>
                {editTarget && <Button variant="outlined" onClick={cancelEdit} disabled={saving}>Cancel</Button>}
                {(editTarget ? canEdit : canCreate) && (
                <Button variant="contained" onClick={handleSave}
                  disabled={saving || !isFormValid}
                  startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />}
                  sx={{ minWidth: 140 }}>
                  {saving ? 'Saving...' : editTarget ? 'Update Reading' : 'Save Reading'}
                </Button>
              )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* ── Right: Records ── */}
        <Grid size={{ xs: 12, lg: 5 }}>
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
              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Plant</InputLabel>
                  <Select label="Plant" value={filterPlant} onChange={(e) => setFilterPlant(e.target.value)} disabled={plantLocked}>
                    <MenuItem value="">Select plant…</MenuItem>
                    {availablePlants.map((p: PowerPlant) => (
                      <MenuItem key={p.id} value={p.plantCode}>{p.plantName} ({p.classificationType})</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button variant="outlined" size="small"
                  startIcon={loadingRecords ? <CircularProgress size={14} /> : <Search />}
                  onClick={fetchRecords} disabled={!filterPlant || loadingRecords}>
                  {loadingRecords ? 'Loading...' : 'Load'}
                </Button>
              </Stack>

              {recordsError && <Alert severity="error" onClose={() => setRecordsError(null)} sx={{ mb: 1.5 }}>{recordsError}</Alert>}

              {records.length === 0 && !loadingRecords ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <AccessTime sx={{ fontSize: '2rem', color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    {filterPlant ? 'No records found.' : 'Select a plant and click Load.'}
                  </Typography>
                </Box>
              ) : (
                <TableContainer sx={{ maxHeight: 520 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Avail Hrs</TableCell>
                        <TableCell>AF %</TableCell>
                        <TableCell>CF %</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {records.map((row) => (
                        <TableRow key={row.id} selected={editTarget?.id === row.id} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.logDate.split('T')[0]}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{row.availableHours.toFixed(1)}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={`${row.availabilityFactor.toFixed(1)}%`} size="small"
                              color={row.availabilityFactor >= 80 ? 'success' : row.availabilityFactor >= 60 ? 'warning' : 'error'}
                              variant="outlined" sx={{ fontWeight: 700, fontSize: 11 }} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{row.capacityFactor.toFixed(1)}%</Typography>
                          </TableCell>
                          <TableCell align="right">
                            {canEdit && (
                              <Tooltip title="Edit">
                              <IconButton size="small" color="primary" onClick={() => openEdit(row)}>
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
        message={`Delete plant availability record for ${deleteTarget?.plantCode} on ${deleteTarget?.logDate?.split('T')[0]}?`}
        confirmLabel="Delete" loading={deleting}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
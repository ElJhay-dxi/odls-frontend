import {
  Box, Card, CardContent, CardHeader, TextField, Button,
  CircularProgress, Alert, Typography, MenuItem, FormControl,
  InputLabel, Select, Grid, Divider, Chip, Stack, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, IconButton, Tooltip,
} from '@mui/material';
import { Save, Search, Edit, Delete, Warning, History } from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { dailyPlantTripApi } from '../../api/daily/dailyPlantTripApi';
import type { PowerPlant } from '../../types/masterData';
import type { DailyPlantTrip, DailyPlantTripForm } from '../../types/dailyPlantTrip';
import { useSectionPermissions, usePlantFilter } from '../../hooks/usePermission';

const emptyForm: DailyPlantTripForm = {
  plantCode: '', logDate: new Date().toISOString().split('T')[0],
  pls: '', primeMoverLowSteamTempPlst: '', protectiveLoadSheddingTrip: '',
  shutdown: '', lowLoadTrip: '', highLoadTrip: '',
  preIgnition: '', preSync: '', partialLoadTrip: '', fullLoadTrip: '',
};

const COMMON_FIELDS = [
  { key: 'pls', label: 'PLS' },
  { key: 'shutdown', label: 'Shutdown' },
  { key: 'lowLoadTrip', label: 'Low Load Trip' },
  { key: 'highLoadTrip', label: 'High Load Trip' },
  { key: 'preIgnition', label: 'Pre-Ignition' },
  { key: 'preSync', label: 'Pre-Sync' },
  { key: 'partialLoadTrip', label: 'Partial Load Trip' },
  { key: 'fullLoadTrip', label: 'Full Load Trip' },
];

const THERMAL_FIELDS = [
  { key: 'primeMoverLowSteamTempPlst', label: 'Prime Mover Low Steam Temp / PLST' },
  { key: 'protectiveLoadSheddingTrip', label: 'Protective Load Shedding Trip' },
];

const toInt = (v: unknown) => v === '' || v === undefined || v === null ? 0 : Number(v);

export default function DailyPlantTripPage() {
  const { canCreate, canEdit, canDelete } = useSectionPermissions('daily.plant_trips');
  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const { availablePlants, plantLocked, autoPlantCode } = usePlantFilter(plants);

  const [form, setForm] = useState<DailyPlantTripForm>(emptyForm);
  const [updateForm, setUpdateForm] = useState<Partial<DailyPlantTripForm>>({});
  const [editTarget, setEditTarget] = useState<DailyPlantTrip | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [filterPlant, setFilterPlant] = useState('');
  const [records, setRecords] = useState<DailyPlantTrip[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<DailyPlantTrip | null>(null);
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
      const res = await dailyPlantTripApi.getAll({ plantCode: filterPlant });
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
    else setForm((prev) => ({ ...prev, [key]: val } as DailyPlantTripForm));
  };

  const selectedPlantType = editTarget
    ? editTarget.classificationType
    : plants.find((p) => p.plantCode === form.plantCode)?.classificationType;

  const isThermal = selectedPlantType === 'Thermal';

  const openEdit = (row: DailyPlantTrip) => {
    setEditTarget(row);
    setSaveError(null);
    setSaveSuccess(false);
    setUpdateForm({
      pls: row.pls, primeMoverLowSteamTempPlst: row.primeMoverLowSteamTempPlst ?? '',
      protectiveLoadSheddingTrip: row.protectiveLoadSheddingTrip ?? '',
      shutdown: row.shutdown, lowLoadTrip: row.lowLoadTrip, highLoadTrip: row.highLoadTrip,
      preIgnition: row.preIgnition, preSync: row.preSync,
      partialLoadTrip: row.partialLoadTrip, fullLoadTrip: row.fullLoadTrip,
    });
  };

  const cancelEdit = () => { setEditTarget(null); setUpdateForm({}); };

  const buildPayload = (f: Record<string, unknown>, thermal: boolean) => ({
    pls: toInt(f.pls),
    primeMoverLowSteamTempPlst: thermal ? toInt(f.primeMoverLowSteamTempPlst) : null,
    protectiveLoadSheddingTrip: thermal ? toInt(f.protectiveLoadSheddingTrip) : null,
    shutdown: toInt(f.shutdown), lowLoadTrip: toInt(f.lowLoadTrip),
    highLoadTrip: toInt(f.highLoadTrip), preIgnition: toInt(f.preIgnition),
    preSync: toInt(f.preSync), partialLoadTrip: toInt(f.partialLoadTrip),
    fullLoadTrip: toInt(f.fullLoadTrip),
  });

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      if (editTarget) {
        await dailyPlantTripApi.update(editTarget.id,
          buildPayload(updateForm as Record<string, unknown>, editTarget.classificationType === 'Thermal'));
        cancelEdit();
      } else {
        await dailyPlantTripApi.create({
          plantCode: form.plantCode, logDate: form.logDate,
          ...buildPayload(form as unknown as Record<string, unknown>, isThermal),
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
      await dailyPlantTripApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchRecords();
    } catch {
      setRecordsError('Failed to delete record.');
    } finally {
      setDeleting(false);
    }
  };

  const isFormValid = editTarget ? true : form.plantCode && form.logDate;

  // Total trips for quick summary
  const totalTrips = COMMON_FIELDS.reduce((sum, f) => sum + toInt(activeForm[f.key]), 0)
    + (isThermal ? THERMAL_FIELDS.reduce((sum, f) => sum + toInt(activeForm[f.key]), 0) : 0);

  return (
    <Box>
      <PageHeader
        title="Daily Plant Trips"
        subtitle="Daily trip event counts per plant"
        breadcrumbs={[{ label: 'Daily Readings' }, { label: 'Plant Trips' }]}
      />

      <Grid container spacing={3}>
        {/* ── Left: Entry form ── */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card>
            <CardHeader
              title={
                <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1.5}>
                  <Warning sx={{ color: '#B71C1C' }} />
                  <Typography sx={{ fontWeight: 700 }}>
                    {editTarget
                      ? `Editing: ${editTarget.plantCode} — ${editTarget.logDate?.split('T')[0]}`
                      : 'New Daily Record'}
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
              {saveSuccess && <Alert severity="success" onClose={() => setSaveSuccess(false)} sx={{ mb: 2 }}>Record saved successfully.</Alert>}

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

              {/* Trip counts */}
              <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2 }}>
                <Stack direction="row" sx={{ mb: 1.5 , alignItems: 'center',justifyContent: 'space-between'}}>
                  <Typography variant="caption" color="text.secondary"
                    sx={{ textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                    Trip Counts
                  </Typography>
                  {totalTrips > 0 && (
                    <Chip label={`Total: ${totalTrips}`} size="small" color="error" variant="outlined" sx={{ fontWeight: 700 }} />
                  )}
                </Stack>
                <Grid container spacing={2}>
                  {COMMON_FIELDS.map(({ key, label }) => (
                    <Grid key={key} size={{ xs: 12, sm: 6 }}>
                      <TextField label={label} type="number" fullWidth size="small"
                        value={fv(key)} onChange={(e) => setField(key, e.target.value)}
                        slotProps={{ input: { inputProps: { min: 0 } } }}
                      />
                    </Grid>
                  ))}

                  {/* Thermal-only fields */}
                  {isThermal && (
                    <>
                      <Grid size={{ xs: 12 }}>
                        <Typography variant="caption" color="error.main" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                          Thermal Only
                        </Typography>
                      </Grid>
                      {THERMAL_FIELDS.map(({ key, label }) => (
                        <Grid key={key} size={{ xs: 12, sm: 6 }}>
                          <TextField label={label} type="number" fullWidth size="small"
                            value={fv(key)} onChange={(e) => setField(key, e.target.value)}
                            slotProps={{ input: { inputProps: { min: 0 } } }}
                          />
                        </Grid>
                      ))}
                    </>
                  )}
                </Grid>
              </Paper>

              <Stack direction="row" spacing={1.5}>
                {editTarget && <Button variant="outlined" onClick={cancelEdit} disabled={saving}>Cancel</Button>}
                {(editTarget ? canEdit : canCreate) && (
                <Button variant="contained" onClick={handleSave}
                  disabled={saving || !isFormValid}
                  startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />}
                  sx={{ minWidth: 140 }}>
                  {saving ? 'Saving...' : editTarget ? 'Update Record' : 'Save Record'}
                </Button>
              )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* ── Right: Records ── */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card>
            <CardHeader
              title={
                <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1}>
                  <History sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
                  <Typography sx={{ fontWeight: 700 }}>Logged Records</Typography>
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
                  <Warning sx={{ fontSize: '2rem', color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    {filterPlant ? 'No records found.' : 'Select a plant and click Load.'}
                  </Typography>
                </Box>
              ) : (
                <TableContainer sx={{ maxHeight: 540 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>PLS</TableCell>
                        <TableCell>Shutdown</TableCell>
                        <TableCell>Low Load</TableCell>
                        <TableCell>High Load</TableCell>
                        <TableCell>Full Load</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {records.map((row) => {
                        const total = row.pls + row.shutdown + row.lowLoadTrip + row.highLoadTrip +
                          row.preIgnition + row.preSync + row.partialLoadTrip + row.fullLoadTrip +
                          (row.primeMoverLowSteamTempPlst ?? 0) + (row.protectiveLoadSheddingTrip ?? 0);
                        return (
                          <TableRow key={row.id} selected={editTarget?.id === row.id} hover>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.logDate.split('T')[0]}</Typography>
                            </TableCell>
                            <TableCell><Typography variant="body2">{row.pls}</Typography></TableCell>
                            <TableCell><Typography variant="body2">{row.shutdown}</Typography></TableCell>
                            <TableCell><Typography variant="body2">{row.lowLoadTrip}</Typography></TableCell>
                            <TableCell><Typography variant="body2">{row.highLoadTrip}</Typography></TableCell>
                            <TableCell>
                              {total > 0 ? (
                                <Chip label={total} size="small" color="error" variant="outlined" sx={{ fontWeight: 700, fontSize: 11 }} />
                              ) : (
                                <Typography variant="body2">{row.fullLoadTrip}</Typography>
                              )}
                            </TableCell>
                            <TableCell align="right">
                              <Tooltip title="Edit">
                                <IconButton size="small" color="primary" onClick={() => openEdit(row)}>
                                  <Edit fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton size="small" color="error" onClick={() => setDeleteTarget(row)}>
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        );
                      })}
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
        title="Delete Record"
        message={`Delete plant trip record for ${deleteTarget?.plantCode} on ${deleteTarget?.logDate?.split('T')[0]}?`}
        confirmLabel="Delete" loading={deleting}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
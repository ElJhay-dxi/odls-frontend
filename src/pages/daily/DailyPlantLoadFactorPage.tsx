import {
  Box, Card, CardContent, CardHeader, TextField, Button,
  CircularProgress, Alert, Typography, MenuItem, FormControl,
  InputLabel, Select, Grid, Divider, Chip, Stack, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, IconButton, Tooltip,
} from '@mui/material';
import { Save, Search, Edit, Delete, TrendingUp, History } from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { dailyPlantLoadFactorApi } from '../../api/daily/dailyPlantLoadFactorApi';
import type { PowerPlant } from '../../types/masterData';
import type {
  DailyPlantLoadFactor, DailyPlantLoadFactorForm, EnergyGeneratedPreview,
} from '../../types/dailyPlantLoadFactor';

const emptyForm: DailyPlantLoadFactorForm = {
  plantCode: '',
  logDate: new Date().toISOString().split('T')[0],
  plantPeakLoadMW: '',
  associatedTime: '',
};

export default function DailyPlantLoadFactorPage() {
  const [plants, setPlants] = useState<PowerPlant[]>([]);

  const [form, setForm] = useState<DailyPlantLoadFactorForm>(emptyForm);
  const [updateForm, setUpdateForm] = useState<Partial<DailyPlantLoadFactorForm>>({});
  const [editTarget, setEditTarget] = useState<DailyPlantLoadFactor | null>(null);

  // Energy generated auto-pull
  const [energyPreview, setEnergyPreview] = useState<EnergyGeneratedPreview | null>(null);
  const [loadingEnergy, setLoadingEnergy] = useState(false);
  const [energyError, setEnergyError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [filterPlant, setFilterPlant] = useState('');
  const [records, setRecords] = useState<DailyPlantLoadFactor[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<DailyPlantLoadFactor | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    powerPlantApi.getAll().then((res) => setPlants(res.data));
  }, []);

  // Auto-fetch energy generated when plant and date are both set (create mode only)
  useEffect(() => {
    if (editTarget || !form.plantCode || !form.logDate) {
      setEnergyPreview(null);
      setEnergyError(null);
      return;
    }
    setLoadingEnergy(true);
    setEnergyError(null);
    setEnergyPreview(null);
    dailyPlantLoadFactorApi.getEnergyPreview(form.plantCode, form.logDate)
      .then((res) => setEnergyPreview(res.data))
      .catch(() => setEnergyError('No energy generation record found for this plant and date. Please log energy generation first.'))
      .finally(() => setLoadingEnergy(false));
  }, [form.plantCode, form.logDate, editTarget]);

  const fetchRecords = useCallback(async () => {
    if (!filterPlant) return;
    setLoadingRecords(true);
    setRecordsError(null);
    try {
      const res = await dailyPlantLoadFactorApi.getAll({ plantCode: filterPlant });
      setRecords(res.data.sort((a, b) => b.logDate.localeCompare(a.logDate)));
    } catch {
      setRecordsError('Failed to load records.');
    } finally {
      setLoadingRecords(false);
    }
  }, [filterPlant]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const fv = (key: string) => String(
    editTarget
      ? (updateForm as unknown as Record<string, unknown>)[key] ?? ''
      : (form as unknown as Record<string, unknown>)[key] ?? ''
  );
  const setField = (key: string, val: string) => {
    if (editTarget) setUpdateForm((prev) => ({ ...prev, [key]: val }));
    else setForm((prev) => ({ ...prev, [key]: val } as DailyPlantLoadFactorForm));
  };

  // Live preview
  const energyMWh = editTarget ? editTarget.energyGeneratedMWh : (energyPreview?.energyGeneratedMWh ?? 0);
  const peakLoad = Number(fv('plantPeakLoadMW')) || 0;
  const previewLoadFactor = peakLoad > 0 ? (energyMWh / (peakLoad * 24)) * 100 : null;

  const openEdit = (row: DailyPlantLoadFactor) => {
    setEditTarget(row);
    setSaveError(null);
    setSaveSuccess(false);
    setUpdateForm({
      plantPeakLoadMW: row.plantPeakLoadMW,
      associatedTime: row.associatedTime ?? '',
    });
  };

  const cancelEdit = () => { setEditTarget(null); setUpdateForm({}); };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      if (editTarget) {
        await dailyPlantLoadFactorApi.update(editTarget.id, {
          plantPeakLoadMW: Number(updateForm.plantPeakLoadMW),
          associatedTime: updateForm.associatedTime || undefined,
        });
        cancelEdit();
      } else {
        await dailyPlantLoadFactorApi.create({
          plantCode: form.plantCode,
          logDate: form.logDate,
          plantPeakLoadMW: Number(form.plantPeakLoadMW),
          associatedTime: form.associatedTime || undefined,
        });
        setForm(emptyForm);
        setEnergyPreview(null);
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
      await dailyPlantLoadFactorApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchRecords();
    } catch {
      setRecordsError('Failed to delete record.');
    } finally {
      setDeleting(false);
    }
  };

  const isFormValid = editTarget
    ? updateForm.plantPeakLoadMW !== '' && updateForm.plantPeakLoadMW !== undefined
    : form.plantCode && form.logDate && form.plantPeakLoadMW !== '' && energyPreview !== null;

  return (
    <Box>
      <PageHeader
        title="Plant Load Factor"
        subtitle="Daily plant peak load and load factor computation per plant"
        breadcrumbs={[{ label: 'Daily Readings' }, { label: 'Plant Load Factor' }]}
      />

      <Grid container spacing={3}>
        {/* ── Left: Entry form ── */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card>
            <CardHeader
              title={
                <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1.5}>
                  <TrendingUp sx={{ color: '#1565C0' }} />
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
                    <FormControl fullWidth required disabled={!!editTarget}>
                      <InputLabel>Power Plant</InputLabel>
                      <Select label="Power Plant"
                        value={editTarget ? editTarget.plantCode : form.plantCode}
                        onChange={(e) => setForm((prev) => ({ ...prev, plantCode: e.target.value }))}>
                        {plants.map((p) => (
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
                </Grid>
              </Paper>

              {/* Energy Generated — auto-pulled */}
              <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary"
                  sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                  Energy Generated (Referenced)
                </Typography>
                {editTarget ? (
                  <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>{editTarget.energyGeneratedMWh.toFixed(2)}</Typography>
                    <Typography variant="body2" color="text.secondary">MWh</Typography>
                    <Chip label={editTarget.classificationType} size="small"
                      color={editTarget.classificationType === 'Hydro' ? 'info' : 'error'} variant="outlined" />
                  </Stack>
                ) : loadingEnergy ? (
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <CircularProgress size={16} />
                    <Typography variant="body2" color="text.secondary">Fetching energy generation…</Typography>
                  </Stack>
                ) : energyError ? (
                  <Alert severity="warning" sx={{ py: 0.5 }}>{energyError}</Alert>
                ) : energyPreview ? (
                  <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>{energyPreview.energyGeneratedMWh.toFixed(2)}</Typography>
                    <Typography variant="body2" color="text.secondary">MWh</Typography>
                    <Chip label={energyPreview.source} size="small"
                      color={energyPreview.source === 'Hydro' ? 'info' : 'error'} variant="outlined" />
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Select a plant and date to auto-load energy generated.
                  </Typography>
                )}
              </Paper>

              {/* User inputs */}
              <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary"
                  sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                  Peak Load
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Plant Peak Load" type="number" fullWidth required
                      value={fv('plantPeakLoadMW')}
                      onChange={(e) => setField('plantPeakLoadMW', e.target.value)}
                      slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">MW</Typography> } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Associated Time" type="time" fullWidth
                      value={fv('associatedTime')}
                      onChange={(e) => setField('associatedTime', e.target.value)}
                      helperText="Time the peak occurred"
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid>
                </Grid>
              </Paper>

              {/* Computed preview */}
              <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2, backgroundColor: 'action.hover' }}>
                <Typography variant="caption" color="text.secondary"
                  sx={{ mb: 1, display: 'block', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                  Computed Preview
                </Typography>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
                  <Typography variant="h5" sx={{
                    fontWeight: 700,
                    color: previewLoadFactor == null ? 'text.secondary'
                      : previewLoadFactor >= 80 ? 'success.main'
                      : previewLoadFactor >= 60 ? 'warning.main'
                      : 'error.main',
                  }}>
                    {previewLoadFactor != null ? `${previewLoadFactor.toFixed(2)}%` : '—'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Load Factor</Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  Energy Generated ÷ (Peak Load × 24h) × 100
                </Typography>
              </Paper>

              <Stack direction="row" spacing={1.5}>
                {editTarget && <Button variant="outlined" onClick={cancelEdit} disabled={saving}>Cancel</Button>}
                <Button variant="contained" onClick={handleSave}
                  disabled={saving || !isFormValid}
                  startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />}
                  sx={{ minWidth: 140 }}>
                  {saving ? 'Saving...' : editTarget ? 'Update Record' : 'Save Record'}
                </Button>
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
                  <Select label="Plant" value={filterPlant} onChange={(e) => setFilterPlant(e.target.value)}>
                    <MenuItem value="">Select plant…</MenuItem>
                    {plants.map((p) => (
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
                  <TrendingUp sx={{ fontSize: '2rem', color: 'text.disabled', mb: 1 }} />
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
                        <TableCell>Energy (MWh)</TableCell>
                        <TableCell>Peak Load (MW)</TableCell>
                        <TableCell>Load Factor</TableCell>
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
                            <Typography variant="body2">{row.energyGeneratedMWh.toFixed(1)}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{row.plantPeakLoadMW.toFixed(1)}</Typography>
                          </TableCell>
                          <TableCell>
                            {row.loadFactorPct != null ? (
                              <Chip
                                label={`${row.loadFactorPct.toFixed(1)}%`}
                                size="small"
                                color={row.loadFactorPct >= 80 ? 'success' : row.loadFactorPct >= 60 ? 'warning' : 'error'}
                                variant="outlined"
                                sx={{ fontWeight: 700, fontSize: 11 }}
                              />
                            ) : (
                              <Typography variant="body2" color="text.disabled">—</Typography>
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
        title="Delete Record"
        message={`Delete plant load factor record for ${deleteTarget?.plantCode} on ${deleteTarget?.logDate?.split('T')[0]}?`}
        confirmLabel="Delete" loading={deleting}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
import {
  Box, Card, CardContent, CardHeader, TextField, Button,
  CircularProgress, Alert, Typography, MenuItem, FormControl,
  InputLabel, Select, Grid, Divider, Chip, Stack, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, IconButton, Tooltip,
} from '@mui/material';
import { Save, Search, Edit, Delete, ElectricMeter, History } from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { dailyStationEnergyConsumptionApi } from '../../api/daily/dailyStationEnergyConsumptionApi';
import type { PowerPlant } from '../../types/masterData';
import type {
  DailyStationEnergyConsumption,
  DailyStationEnergyConsumptionForm,
} from '../../types/dailyStationEnergyConsumption';
import { useSectionPermissions } from '../../hooks/usePermission';

const emptyForm: DailyStationEnergyConsumptionForm = {
  plantCode: '',
  logDate: new Date().toISOString().split('T')[0],
  currentReading: '',
};

export default function DailyStationEnergyConsumptionPage() {
  const { canCreate, canEdit, canDelete } = useSectionPermissions('daily.station_energy');
  const [plants, setPlants] = useState<PowerPlant[]>([]);

  const [form, setForm] = useState<DailyStationEnergyConsumptionForm>(emptyForm);
  const [updateForm, setUpdateForm] = useState<{ currentReading: number | string }>({ currentReading: '' });
  const [editTarget, setEditTarget] = useState<DailyStationEnergyConsumption | null>(null);

  const [manualPreviousReading, setManualPreviousReading] = useState('');
  const [priorRecord, setPriorRecord] = useState<DailyStationEnergyConsumption | null>(null);
  const [loadingPrior, setLoadingPrior] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [filterPlant, setFilterPlant] = useState('');
  const [records, setRecords] = useState<DailyStationEnergyConsumption[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<DailyStationEnergyConsumption | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    powerPlantApi.getAll().then((res) => setPlants(res.data));
  }, []);

  useEffect(() => {
    if (editTarget || !form.plantCode || !form.logDate) {
      setPriorRecord(null);
      return;
    }
    setLoadingPrior(true);
    dailyStationEnergyConsumptionApi.getAll({ plantCode: form.plantCode })
      .then((res) => {
        const prior = res.data
          .filter((r) => r.logDate.split('T')[0] < form.logDate)
          .sort((a, b) => b.logDate.localeCompare(a.logDate))[0];
        setPriorRecord(prior ?? null);
        if (prior) setManualPreviousReading('');
      })
      .catch(() => setPriorRecord(null))
      .finally(() => setLoadingPrior(false));
  }, [form.plantCode, form.logDate, editTarget]);

  const fetchRecords = useCallback(async () => {
    if (!filterPlant) return;
    setLoadingRecords(true);
    setRecordsError(null);
    try {
      const res = await dailyStationEnergyConsumptionApi.getAll({ plantCode: filterPlant });
      setRecords(res.data.sort((a, b) => b.logDate.localeCompare(a.logDate)));
    } catch {
      setRecordsError('Failed to load records.');
    } finally {
      setLoadingRecords(false);
    }
  }, [filterPlant]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const isFirstEntry = !editTarget && !priorRecord && !loadingPrior;
  const previewPreviousReading = editTarget
    ? editTarget.previousReading
    : priorRecord
    ? priorRecord.currentReading
    : Number(manualPreviousReading) || 0;
  const previewPriorProgressiveTotal = editTarget
    ? editTarget.progressiveTotal - editTarget.difference
    : (priorRecord?.progressiveTotal ?? 0);
  const currentVal = Number(editTarget ? updateForm.currentReading : form.currentReading) || 0;
  const previewDifference = currentVal - previewPreviousReading;
  const previewProgressiveTotal = previewPriorProgressiveTotal + previewDifference;

  const selectedPlant = plants.find((p) => p.plantCode === (editTarget ? editTarget.plantCode : form.plantCode));

  const openEdit = (row: DailyStationEnergyConsumption) => {
    setEditTarget(row);
    setSaveError(null);
    setSaveSuccess(false);
    setUpdateForm({ currentReading: row.currentReading });
  };

  const cancelEdit = () => { setEditTarget(null); setUpdateForm({ currentReading: '' }); };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      if (editTarget) {
        await dailyStationEnergyConsumptionApi.update(editTarget.id, {
          currentReading: Number(updateForm.currentReading),
        });
        cancelEdit();
      } else {
        await dailyStationEnergyConsumptionApi.create({
          plantCode: form.plantCode,
          logDate: form.logDate,
          previousReading: isFirstEntry ? Number(manualPreviousReading) : undefined,
          currentReading: Number(form.currentReading),
        });
        setForm(emptyForm);
        setManualPreviousReading('');
      }
      setSaveSuccess(true);
      fetchRecords();
    } catch (err) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setSaveError(axiosErr.response?.data?.message ?? 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await dailyStationEnergyConsumptionApi.delete(deleteTarget.id);
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
    : form.plantCode && form.logDate && form.currentReading !== '';

  return (
    <Box>
      <PageHeader
        title="Daily Station Energy Consumption"
        subtitle="Daily MWh station energy consumption readings — applies to both Hydro and Thermal plants"
        breadcrumbs={[{ label: 'Daily Readings' }, { label: 'Station Energy Consumption' }]}
      />

      <Grid container spacing={3}>
        {/* ── Left: Entry form ── */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card>
            <CardHeader
              title={
                <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1.5}>
                  <ElectricMeter sx={{ color: '#1565C0' }} />
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
                  {(editTarget || selectedPlant) && (
                    <Grid size={{ xs: 12 }}>
                      <Chip
                        label={editTarget ? editTarget.classificationType : selectedPlant?.classificationType}
                        size="small"
                        color={(editTarget ? editTarget.classificationType : selectedPlant?.classificationType) === 'Hydro' ? 'info' : 'error'}
                        variant="outlined"
                      />
                    </Grid>
                  )}
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
                      type={isFirstEntry ? 'number' : 'text'}
                      disabled={!isFirstEntry}
                      value={isFirstEntry ? manualPreviousReading : loadingPrior ? '…' : previewPreviousReading.toFixed(2)}
                      onChange={(e) => isFirstEntry && setManualPreviousReading(e.target.value)}
                      helperText={isFirstEntry ? 'Enter the prior meter reading (first entry only)' : 'Auto-carried from prior day'}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Current Reading" type="number" fullWidth required
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

              {/* Computed preview */}
              <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2, backgroundColor: 'action.hover' }}>
                <Typography variant="caption" color="text.secondary"
                  sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                  Computed Preview
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary">Difference</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{previewDifference.toFixed(2)} MWh</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary">Progressive Total</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{previewProgressiveTotal.toFixed(2)} MWh</Typography>
                  </Grid>
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
                  <ElectricMeter sx={{ fontSize: '2rem', color: 'text.disabled', mb: 1 }} />
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
                        <TableCell>Current</TableCell>
                        <TableCell>Diff</TableCell>
                        <TableCell>Progressive</TableCell>
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
                            <Typography variant="body2">{row.currentReading.toFixed(1)}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color={row.difference < 0 ? 'error.main' : 'text.primary'}>
                              {row.difference.toFixed(1)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.progressiveTotal.toFixed(1)}</Typography>
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
        message={`Delete station energy consumption record for ${deleteTarget?.plantCode} on ${deleteTarget?.logDate?.split('T')[0]}? This will recompute progressive totals for any later readings.`}
        confirmLabel="Delete" loading={deleting}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
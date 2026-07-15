import {
  Box, Card, CardContent, CardHeader, TextField, Button,
  CircularProgress, Alert, Typography, MenuItem, FormControl,
  InputLabel, Select, Grid, Divider, Chip, Stack, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, IconButton, Tooltip,
} from '@mui/material';
import { Save, Search, Edit, Delete, Speed, History } from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { dailyPlantReliabilityApi } from '../../api/daily/dailyPlantReliabilityApi';
import type { PowerPlant } from '../../types/masterData';
import type { DailyPlantReliability, DailyPlantReliabilityForm } from '../../types/dailyPlantReliability';
import { useSectionPermissions } from '../../hooks/usePermission';

const emptyForm: DailyPlantReliabilityForm = {
  plantCode: '',
  logDate: new Date().toISOString().split('T')[0],
  mtbf: '', successfulStarts: '', unsuccessfulStarts: '',
};

export default function DailyPlantReliabilityPage() {
  const { canCreate, canEdit, canDelete } = useSectionPermissions('daily.plant_reliability');
  const [plants, setPlants] = useState<PowerPlant[]>([]);

  const [form, setForm] = useState<DailyPlantReliabilityForm>(emptyForm);
  const [updateForm, setUpdateForm] = useState<Partial<DailyPlantReliabilityForm>>({});
  const [editTarget, setEditTarget] = useState<DailyPlantReliability | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [filterPlant, setFilterPlant] = useState('');
  const [records, setRecords] = useState<DailyPlantReliability[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<DailyPlantReliability | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    powerPlantApi.getAll().then((res) => setPlants(res.data));
  }, []);

  const fetchRecords = useCallback(async () => {
    if (!filterPlant) return;
    setLoadingRecords(true);
    setRecordsError(null);
    try {
      const res = await dailyPlantReliabilityApi.getAll({ plantCode: filterPlant });
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
    else setForm((prev) => ({ ...prev, [key]: val } as DailyPlantReliabilityForm));
  };

  // Live preview
  const successful = Math.max(0, Number(fv('successfulStarts')) || 0);
  const unsuccessful = Math.max(0, Number(fv('unsuccessfulStarts')) || 0);
  const attempts = successful + unsuccessful;
  const reliability = attempts > 0 ? (successful / attempts) * 100 : null;

  const openEdit = (row: DailyPlantReliability) => {
    setEditTarget(row);
    setSaveError(null);
    setSaveSuccess(false);
    setUpdateForm({
      mtbf: row.mtbf,
      successfulStarts: row.successfulStarts,
      unsuccessfulStarts: row.unsuccessfulStarts,
    });
  };

  const cancelEdit = () => { setEditTarget(null); setUpdateForm({}); };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      if (editTarget) {
        await dailyPlantReliabilityApi.update(editTarget.id, {
          mtbf: Number(updateForm.mtbf),
          successfulStarts: Number(updateForm.successfulStarts),
          unsuccessfulStarts: Number(updateForm.unsuccessfulStarts),
        });
        cancelEdit();
      } else {
        await dailyPlantReliabilityApi.create({
          plantCode: form.plantCode, logDate: form.logDate,
          mtbf: Number(form.mtbf),
          successfulStarts: Number(form.successfulStarts),
          unsuccessfulStarts: Number(form.unsuccessfulStarts),
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
      await dailyPlantReliabilityApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchRecords();
    } catch {
      setRecordsError('Failed to delete record.');
    } finally {
      setDeleting(false);
    }
  };

  const isFormValid = editTarget
    ? updateForm.successfulStarts !== '' && updateForm.unsuccessfulStarts !== '' && updateForm.mtbf !== ''
    : form.plantCode && form.logDate && form.mtbf !== '' && form.successfulStarts !== '' && form.unsuccessfulStarts !== '';

  return (
    <Box>
      <PageHeader
        title="Daily Plant Reliability"
        subtitle="Daily start attempts and reliability index per plant"
        breadcrumbs={[{ label: 'Daily Readings' }, { label: 'Plant Reliability' }]}
      />

      <Grid container spacing={3}>
        {/* ── Left: Entry form ── */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card>
            <CardHeader
              title={
                <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1.5}>
                  <Speed sx={{ color: '#1565C0' }} />
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

              {/* Reliability inputs */}
              <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary"
                  sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                  Reliability Data
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField label="MTBF" type="number" fullWidth required
                      value={fv('mtbf')} onChange={(e) => setField('mtbf', e.target.value)}
                      helperText="Mean Time Between Failures"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField label="Successful Starts" type="number" fullWidth required
                      value={fv('successfulStarts')} onChange={(e) => setField('successfulStarts', e.target.value)}
                      slotProps={{ input: { inputProps: { min: 0 } } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField label="Unsuccessful Starts" type="number" fullWidth required
                      value={fv('unsuccessfulStarts')} onChange={(e) => setField('unsuccessfulStarts', e.target.value)}
                      slotProps={{ input: { inputProps: { min: 0 } } }}
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
                    <Typography variant="caption" color="text.secondary">Start Attempts</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>{attempts}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary">Starting Reliability</Typography>
                    <Typography variant="h5" sx={{
                      fontWeight: 700,
                      color: reliability == null ? 'text.secondary'
                        : reliability >= 90 ? 'success.main'
                        : reliability >= 70 ? 'warning.main'
                        : 'error.main',
                    }}>
                      {reliability != null ? `${reliability.toFixed(2)}%` : '—'}
                    </Typography>
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
                  <Speed sx={{ fontSize: '2rem', color: 'text.disabled', mb: 1 }} />
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
                        <TableCell>MTBF</TableCell>
                        <TableCell>Attempts</TableCell>
                        <TableCell>Successful</TableCell>
                        <TableCell>Reliability %</TableCell>
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
                            <Typography variant="body2">{row.mtbf.toFixed(1)}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{row.startAttempts}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{row.successfulStarts}</Typography>
                          </TableCell>
                          <TableCell>
                            {row.startingReliabilityPct != null ? (
                              <Chip
                                label={`${row.startingReliabilityPct.toFixed(1)}%`}
                                size="small"
                                color={row.startingReliabilityPct >= 90 ? 'success' : row.startingReliabilityPct >= 70 ? 'warning' : 'error'}
                                variant="outlined"
                                sx={{ fontWeight: 700, fontSize: 11 }}
                              />
                            ) : (
                              <Typography variant="body2" color="text.disabled">—</Typography>
                            )}
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
        title="Delete Record"
        message={`Delete plant reliability record for ${deleteTarget?.plantCode} on ${deleteTarget?.logDate?.split('T')[0]}?`}
        confirmLabel="Delete" loading={deleting}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
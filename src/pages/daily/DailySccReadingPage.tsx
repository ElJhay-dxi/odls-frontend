import {
  Box, Card, CardContent, CardHeader, TextField, Button,
  CircularProgress, Alert, Typography, MenuItem, FormControl,
  InputLabel, Select, Grid, Divider, Chip, Stack, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, IconButton, Tooltip,
} from '@mui/material';
import { Save, Search, Edit, Delete, ElectricBolt, History } from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { dailySccReadingApi } from '../../api/daily/dailySccReadingApi';
import type { PowerPlant } from '../../types/masterData';
import type { DailySccReading, DailySccReadingForm } from '../../types/dailySccReading';
import { useSectionPermissions } from '../../hooks/usePermission';

const emptyForm: DailySccReadingForm = {
  plantCode: '',
  logDate: new Date().toISOString().split('T')[0],
  totalGenerationKwh: '',
  stationServiceKwh: '',
};

export default function DailySccReadingPage() {
  const { canCreate, canEdit, canDelete } = useSectionPermissions('daily.scc');
  const [plants, setPlants] = useState<PowerPlant[]>([]);

  const [form, setForm] = useState<DailySccReadingForm>(emptyForm);
  const [updateForm, setUpdateForm] = useState<Partial<DailySccReadingForm>>({});
  const [editTarget, setEditTarget] = useState<DailySccReading | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [filterPlant, setFilterPlant] = useState('');
  const [records, setRecords] = useState<DailySccReading[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<DailySccReading | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    powerPlantApi.getAll().then((res) =>
      setPlants(res.data.filter((p) => p.classificationType === 'Thermal'))
    );
  }, []);

  const fetchRecords = useCallback(async () => {
    if (!filterPlant) return;
    setLoadingRecords(true);
    setRecordsError(null);
    try {
      const res = await dailySccReadingApi.getAll({ plantCode: filterPlant });
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
    else setForm((prev) => ({ ...prev, [key]: val } as DailySccReadingForm));
  };

  // Live preview of Net Generation
  const totalVal = Number(fv('totalGenerationKwh')) || 0;
  const serviceVal = Number(fv('stationServiceKwh')) || 0;
  const previewNet = totalVal - serviceVal;

  const openEdit = (row: DailySccReading) => {
    setEditTarget(row);
    setSaveError(null);
    setSaveSuccess(false);
    setUpdateForm({
      totalGenerationKwh: row.totalGenerationKwh,
      stationServiceKwh: row.stationServiceKwh,
    });
  };

  const cancelEdit = () => { setEditTarget(null); setUpdateForm({}); };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      if (editTarget) {
        await dailySccReadingApi.update(editTarget.id, {
          totalGenerationKwh: Number(updateForm.totalGenerationKwh),
          stationServiceKwh: Number(updateForm.stationServiceKwh),
        });
        cancelEdit();
      } else {
        await dailySccReadingApi.create({
          plantCode: form.plantCode,
          logDate: form.logDate,
          totalGenerationKwh: Number(form.totalGenerationKwh),
          stationServiceKwh: Number(form.stationServiceKwh),
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
      await dailySccReadingApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchRecords();
    } catch {
      setRecordsError('Failed to delete record.');
    } finally {
      setDeleting(false);
    }
  };

  const isFormValid = editTarget
    ? updateForm.totalGenerationKwh !== '' && updateForm.stationServiceKwh !== ''
    : form.plantCode && form.logDate && form.totalGenerationKwh !== '' && form.stationServiceKwh !== '';

  return (
    <Box>
      <PageHeader
        title="Daily SCC System Readings"
        subtitle="Daily total generation, station service and net generation readings for thermal plants"
        breadcrumbs={[{ label: 'Daily Readings' }, { label: 'SCC System Readings' }]}
      />

      <Grid container spacing={3}>
        {/* ── Left: Entry form ── */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card>
            <CardHeader
              title={
                <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1.5}>
                  <ElectricBolt sx={{ color: '#B71C1C' }} />
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
                          <MenuItem key={p.id} value={p.plantCode}>{p.plantName} ({p.plantCode})</MenuItem>
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

              {/* Readings */}
              <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary"
                  sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                  SCC Readings (kWh)
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Total Generation" type="number" fullWidth required
                      value={fv('totalGenerationKwh')}
                      onChange={(e) => setField('totalGenerationKwh', e.target.value)}
                      slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">kWh</Typography> } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Station Service" type="number" fullWidth required
                      value={fv('stationServiceKwh')}
                      onChange={(e) => setField('stationServiceKwh', e.target.value)}
                      slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">kWh</Typography> } }}
                    />
                  </Grid>
                </Grid>
              </Paper>

              {/* Net Generation preview */}
              <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2, backgroundColor: 'action.hover' }}>
                <Typography variant="caption" color="text.secondary"
                  sx={{ mb: 1, display: 'block', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                  Computed Preview
                </Typography>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    {previewNet.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">kWh Net Generation</Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  Total Generation − Station Service
                </Typography>
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
                      <MenuItem key={p.id} value={p.plantCode}>{p.plantName}</MenuItem>
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
                  <ElectricBolt sx={{ fontSize: '2rem', color: 'text.disabled', mb: 1 }} />
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
                        <TableCell>Total Gen (kWh)</TableCell>
                        <TableCell>Stn Service (kWh)</TableCell>
                        <TableCell>Net Gen (kWh)</TableCell>
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
                            <Typography variant="body2">{row.totalGenerationKwh.toLocaleString()}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{row.stationServiceKwh.toLocaleString()}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 700 }} color="primary.main">
                              {row.netGenerationKwh.toLocaleString()}
                            </Typography>
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
        message={`Delete SCC reading for ${deleteTarget?.plantCode} on ${deleteTarget?.logDate?.split('T')[0]}?`}
        confirmLabel="Delete" loading={deleting}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
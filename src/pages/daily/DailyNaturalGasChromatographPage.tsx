import {
  Box, Card, CardContent, CardHeader, TextField, Button,
  CircularProgress, Alert, Typography, MenuItem, FormControl,
  InputLabel, Select, Grid, Divider, Chip, Stack, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, IconButton, Tooltip,
} from '@mui/material';
import { Save, Search, Edit, Delete, LocalFireDepartment, History } from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { plantUnitApi } from '../../api/masterData/plantUnitApi';
import { dailyNaturalGasChromatographApi } from '../../api/daily/dailyNaturalGasChromatographApi';
import type { PowerPlant, PlantUnit } from '../../types/masterData';
import type {
  DailyNaturalGasChromatograph,
  DailyNaturalGasChromatographForm,
} from '../../types/dailyNaturalGasChromatograph';

const emptyForm: DailyNaturalGasChromatographForm = {
  plantCode: '', unitCode: '',
  logDate: new Date().toISOString().split('T')[0],
  logTime: '', readingMMscf: '', heatingValue: '',
};

const fmt = (v?: number, dec = 2) => v != null ? v.toFixed(dec) : '—';

export default function DailyNaturalGasChromatographPage() {
  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const [allUnits, setAllUnits] = useState<PlantUnit[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<PlantUnit[]>([]);

  const [form, setForm] = useState<DailyNaturalGasChromatographForm>(emptyForm);
  const [updateForm, setUpdateForm] = useState<Partial<DailyNaturalGasChromatographForm>>({});
  const [editTarget, setEditTarget] = useState<DailyNaturalGasChromatograph | null>(null);

  const [priorRecord, setPriorRecord] = useState<DailyNaturalGasChromatograph | null>(null);
  const [loadingPrior, setLoadingPrior] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [filterPlant, setFilterPlant] = useState('');
  const [filterUnit, setFilterUnit] = useState('');
  const [filterPanelUnits, setFilterPanelUnits] = useState<PlantUnit[]>([]);
  const [records, setRecords] = useState<DailyNaturalGasChromatograph[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<DailyNaturalGasChromatograph | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([powerPlantApi.getAll(), plantUnitApi.getAll()]).then(([p, u]) => {
      setPlants(p.data.filter((pl) => pl.classificationType === 'Thermal'));
      setAllUnits(u.data);
    });
  }, []);

  useEffect(() => {
    const code = editTarget ? editTarget.plantCode : form.plantCode;
    setFilteredUnits(code ? allUnits.filter((u) => u.plantCode === code) : []);
    if (!editTarget) setForm((prev) => ({ ...prev, unitCode: '' }));
  }, [form.plantCode, allUnits, editTarget]);

  useEffect(() => {
    setFilterPanelUnits(filterPlant ? allUnits.filter((u) => u.plantCode === filterPlant) : []);
  }, [filterPlant, allUnits]);

  useEffect(() => {
    if (editTarget || !form.plantCode || !form.unitCode || !form.logDate) {
      setPriorRecord(null);
      return;
    }
    setLoadingPrior(true);
    dailyNaturalGasChromatographApi.getAll({ plantCode: form.plantCode, unitCode: form.unitCode })
      .then((res) => {
        const prior = res.data
          .filter((r) => r.logDate.split('T')[0] < form.logDate)
          .sort((a, b) => b.logDate.localeCompare(a.logDate))[0];
        setPriorRecord(prior ?? null);
      })
      .catch(() => setPriorRecord(null))
      .finally(() => setLoadingPrior(false));
  }, [form.plantCode, form.unitCode, form.logDate, editTarget]);

  const fetchRecords = useCallback(async () => {
    if (!filterPlant) return;
    setLoadingRecords(true);
    setRecordsError(null);
    try {
      const res = await dailyNaturalGasChromatographApi.getAll({
        plantCode: filterPlant, unitCode: filterUnit || undefined,
      });
      setRecords(res.data.sort((a, b) => b.logDate.localeCompare(a.logDate)));
    } catch {
      setRecordsError('Failed to load records.');
    } finally {
      setLoadingRecords(false);
    }
  }, [filterPlant, filterUnit]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  // Live preview
  const previewPriorTotal = editTarget
    ? editTarget.progressiveTotal - editTarget.readingMMscf
    : (priorRecord?.progressiveTotal ?? 0);
  const readingVal = Number(editTarget ? updateForm.readingMMscf : form.readingMMscf) || 0;
  const hvVal = Number(editTarget ? updateForm.heatingValue : form.heatingValue) || 0;
  const previewProgressive = previewPriorTotal + readingVal;
  const previewMMBtu = readingVal * hvVal;

  const fv = (key: string) => String(
    editTarget
      ? (updateForm as unknown as Record<string, unknown>)[key] ?? ''
      : (form as unknown as Record<string, unknown>)[key] ?? ''
  );
  const setField = (key: string, val: string) => {
    if (editTarget) setUpdateForm((prev) => ({ ...prev, [key]: val }));
    else setForm((prev) => ({ ...prev, [key]: val } as DailyNaturalGasChromatographForm));
  };

  const openEdit = (row: DailyNaturalGasChromatograph) => {
    setEditTarget(row);
    setSaveError(null);
    setSaveSuccess(false);
    setUpdateForm({
      logTime: row.logTime ?? '',
      readingMMscf: row.readingMMscf,
      heatingValue: row.heatingValue,
    });
  };

  const cancelEdit = () => { setEditTarget(null); setUpdateForm({}); };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      if (editTarget) {
        await dailyNaturalGasChromatographApi.update(editTarget.id, {
          logTime: updateForm.logTime || undefined,
          readingMMscf: Number(updateForm.readingMMscf),
          heatingValue: Number(updateForm.heatingValue),
        });
        cancelEdit();
      } else {
        await dailyNaturalGasChromatographApi.create({
          plantCode: form.plantCode, unitCode: form.unitCode,
          logDate: form.logDate, logTime: form.logTime || undefined,
          readingMMscf: Number(form.readingMMscf),
          heatingValue: Number(form.heatingValue),
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
      await dailyNaturalGasChromatographApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchRecords();
    } catch {
      setRecordsError('Failed to delete record.');
    } finally {
      setDeleting(false);
    }
  };

  const isFormValid = editTarget
    ? updateForm.readingMMscf !== '' && updateForm.heatingValue !== ''
    : form.plantCode && form.unitCode && form.logDate &&
      form.readingMMscf !== '' && form.heatingValue !== '';

  return (
    <Box>
      <PageHeader
        title="Daily Natural Gas — Chromatograph"
        subtitle="Daily chromatograph readings in MMscf with consumption and heat rate computations"
        breadcrumbs={[{ label: 'Daily Readings' }, { label: 'Natural Gas (Chromatograph)' }]}
      />

      <Grid container spacing={3}>
        {/* ── Left: Entry form ── */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card>
            <CardHeader
              title={
                <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1.5}>
                  <LocalFireDepartment sx={{ color: '#4A148C' }} />
                  <Typography sx={{ fontWeight: 700 }}>
                    {editTarget
                      ? `Editing: ${editTarget.unitCode} — ${editTarget.logDate?.split('T')[0]}`
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
                    <FormControl fullWidth required disabled={!!editTarget || !form.plantCode}>
                      <InputLabel>Unit</InputLabel>
                      <Select label="Unit"
                        value={editTarget ? editTarget.unitCode : form.unitCode}
                        onChange={(e) => setForm((prev) => ({ ...prev, unitCode: e.target.value }))}>
                        {(editTarget
                          ? allUnits.filter((u) => u.plantCode === editTarget.plantCode)
                          : filteredUnits
                        ).map((u) => (
                          <MenuItem key={u.id} value={u.unitCode}>{u.unitName} ({u.unitCode})</MenuItem>
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
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Log Time" type="time" fullWidth
                      value={fv('logTime')}
                      onChange={(e) => setField('logTime', e.target.value)}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid>
                </Grid>
              </Paper>

              {/* Readings */}
              <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary"
                  sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                  Instrument Reading
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Reading (MMscf)" type="number" fullWidth required
                      value={fv('readingMMscf')}
                      onChange={(e) => setField('readingMMscf', e.target.value)}
                      helperText="Direct reading from chromatograph"
                      slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">MMscf</Typography> } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Heating Value (LHV)" type="number" fullWidth required
                      value={fv('heatingValue')}
                      onChange={(e) => setField('heatingValue', e.target.value)}
                      helperText="BTU/scf"
                      slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">BTU/scf</Typography> } }}
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
                <Grid container spacing={1.5}>
                  {[
                    { label: 'Progressive Total', value: `${fmt(previewProgressive, 4)} MMscf` },
                    { label: 'Consumption (MMBtu)', value: fmt(previewMMBtu, 2) },
                  ].map(({ label, value }) => (
                    <Grid key={label} size={{ xs: 12, sm: 6 }}>
                      <Typography variant="caption" color="text.secondary">{label}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{value}</Typography>
                    </Grid>
                  ))}
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="caption" color="text.secondary">
                      Prior Progressive Total: {loadingPrior ? '…' : fmt(previewPriorTotal, 4)} MMscf
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              <Stack direction="row" spacing={1.5}>
                {editTarget && <Button variant="outlined" onClick={cancelEdit} disabled={saving}>Cancel</Button>}
                <Button variant="contained" onClick={handleSave}
                  disabled={saving || !isFormValid}
                  startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />}
                  sx={{ minWidth: 140 }}>
                  {saving ? 'Saving...' : editTarget ? 'Update Reading' : 'Save Reading'}
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
                  <Typography sx={{ fontWeight: 700 }}>Logged Readings</Typography>
                </Stack>
              }
            />
            <Divider />
            <CardContent>
              <Stack spacing={1.5} sx={{ mb: 2 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Plant</InputLabel>
                  <Select label="Plant" value={filterPlant}
                    onChange={(e) => { setFilterPlant(e.target.value); setFilterUnit(''); }}>
                    <MenuItem value="">Select plant…</MenuItem>
                    {plants.map((p) => (
                      <MenuItem key={p.id} value={p.plantCode}>{p.plantName}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Stack direction="row" spacing={1}>
                  <FormControl size="small" sx={{ flex: 1 }} disabled={!filterPlant}>
                    <InputLabel>Unit</InputLabel>
                    <Select label="Unit" value={filterUnit} onChange={(e) => setFilterUnit(e.target.value)}>
                      <MenuItem value="">All Units</MenuItem>
                      {filterPanelUnits.map((u) => (
                        <MenuItem key={u.id} value={u.unitCode}>{u.unitName}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Button variant="outlined" size="small"
                    startIcon={loadingRecords ? <CircularProgress size={14} /> : <Search />}
                    onClick={fetchRecords} disabled={!filterPlant || loadingRecords}>
                    {loadingRecords ? 'Loading...' : 'Load'}
                  </Button>
                </Stack>
              </Stack>

              {recordsError && <Alert severity="error" onClose={() => setRecordsError(null)} sx={{ mb: 1.5 }}>{recordsError}</Alert>}

              {records.length === 0 && !loadingRecords ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <LocalFireDepartment sx={{ fontSize: '2rem', color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    {filterPlant ? 'No records found.' : 'Select a plant and click Load.'}
                  </Typography>
                </Box>
              ) : (
                <TableContainer sx={{ maxHeight: 480 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Unit</TableCell>
                        <TableCell>Reading (MMscf)</TableCell>
                        <TableCell>Progressive</TableCell>
                        <TableCell>MMBtu</TableCell>
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
                            <Chip label={row.unitCode} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{row.readingMMscf.toFixed(4)}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.progressiveTotal.toFixed(4)}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{row.consumptionMMBtu.toFixed(2)}</Typography>
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
        title="Delete Reading"
        message={`Delete chromatograph reading for ${deleteTarget?.unitCode} on ${deleteTarget?.logDate?.split('T')[0]}? This will recompute progressive totals for any later readings.`}
        confirmLabel="Delete" loading={deleting}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
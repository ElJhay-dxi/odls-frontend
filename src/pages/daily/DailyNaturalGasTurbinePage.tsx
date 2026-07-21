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
import { dailyNaturalGasTurbineApi } from '../../api/daily/dailyNaturalGasTurbineApi';
import type { PowerPlant, PlantUnit } from '../../types/masterData';
import type { DailyNaturalGasTurbine, DailyNaturalGasTurbineForm } from '../../types/dailyNaturalGasTurbine';
import { useSectionPermissions, usePlantFilter } from '../../hooks/usePermission';

const emptyForm: DailyNaturalGasTurbineForm = {
  plantCode: '', unitCode: '',
  logDate: new Date().toISOString().split('T')[0],
  logTime: '', currentReading: '', heatingValue: '',
};

const toNum = (v: unknown) => v === '' || v === undefined || v === null ? undefined : Number(v);
const fmt = (v?: number, dec = 2) => v != null ? v.toFixed(dec) : '—';

export default function DailyNaturalGasTurbinePage() {
  const { canCreate, canEdit, canDelete } = useSectionPermissions('daily.gas_turbine');
  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const { availablePlants, plantLocked, autoPlantCode } = usePlantFilter(plants);
  const [allUnits, setAllUnits] = useState<PlantUnit[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<PlantUnit[]>([]);

  const [form, setForm] = useState<DailyNaturalGasTurbineForm>(emptyForm);
  const [updateForm, setUpdateForm] = useState<Partial<DailyNaturalGasTurbineForm>>({});
  const [editTarget, setEditTarget] = useState<DailyNaturalGasTurbine | null>(null);

  const [priorRecord, setPriorRecord] = useState<DailyNaturalGasTurbine | null>(null);
  const [loadingPrior, setLoadingPrior] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [filterPlant, setFilterPlant] = useState('');
  const [filterUnit, setFilterUnit] = useState('');
  const [filterPanelUnits, setFilterPanelUnits] = useState<PlantUnit[]>([]);
  const [records, setRecords] = useState<DailyNaturalGasTurbine[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<DailyNaturalGasTurbine | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([powerPlantApi.getAll(), plantUnitApi.getAll()]).then(([p, u]) => {
      setPlants(p.data.filter((pl) => pl.classificationType === 'Thermal'));
      setAllUnits(u.data);
    });
  }, []);

  useEffect(() => {
    if (autoPlantCode) {
      setForm((prev) => ({ ...prev, plantCode: autoPlantCode }));
      setFilterPlant(autoPlantCode);
    }
  }, [autoPlantCode]);

  useEffect(() => {
    const code = editTarget ? editTarget.plantCode : form.plantCode;
    setFilteredUnits(code ? allUnits.filter((u) => u.plantCode === code) : []);
    if (!editTarget) { setForm((prev) => ({ ...prev, unitCode: '' })); }
  }, [form.plantCode, allUnits, editTarget]);

  useEffect(() => {
    setFilterPanelUnits(filterPlant ? allUnits.filter((u) => u.plantCode === filterPlant) : []);
  }, [filterPlant, allUnits]);

  // Fetch prior record for Previous Reading preview
  useEffect(() => {
    if (editTarget || !form.plantCode || !form.unitCode || !form.logDate) {
      setPriorRecord(null);
      return;
    }
    setLoadingPrior(true);
    dailyNaturalGasTurbineApi.getAll({ plantCode: form.plantCode, unitCode: form.unitCode })
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
      const res = await dailyNaturalGasTurbineApi.getAll({
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

  // Live preview computations
  const previewPrevious = editTarget ? editTarget.previousReading : (priorRecord?.currentReading ?? 0);
  const previewPriorProgressive = editTarget
    ? editTarget.progressiveTotal - editTarget.difference
    : (priorRecord?.progressiveTotal ?? 0);
  const currentVal = Number(editTarget ? updateForm.currentReading : form.currentReading) || 0;
  const hvVal = Number(editTarget ? updateForm.heatingValue : form.heatingValue) || 0;
  const previewDiff = currentVal - previewPrevious;
  const previewProgressive = previewPriorProgressive + previewDiff;
  const previewMMscf = previewDiff / 1000;
  const previewMMBtu = previewMMscf * hvVal;
  const previewAvgLoad = previewDiff > 0 ? previewDiff / 24 : null;
  const previewLhvBtu = previewAvgLoad && previewAvgLoad > 0
    ? (previewMMBtu * 1_000_000) / (previewAvgLoad * 24 * 1000) : null;
  const previewLhvKj = previewLhvBtu ? previewLhvBtu * 1.05506 : null;
  const previewHhvBtu = previewLhvBtu ? previewLhvBtu * 1.1 : null;
  const previewHhvKj = previewLhvKj ? previewLhvKj * 1.1 : null;

  const fv = (key: string) => String(
    editTarget
      ? (updateForm as unknown as Record<string, unknown>)[key] ?? ''
      : (form as unknown as Record<string, unknown>)[key] ?? ''
  );
  const setField = (key: string, val: string) => {
    if (editTarget) setUpdateForm((prev) => ({ ...prev, [key]: val }));
    else setForm((prev) => ({ ...prev, [key]: val } as DailyNaturalGasTurbineForm));
  };

  const openEdit = (row: DailyNaturalGasTurbine) => {
    setEditTarget(row);
    setSaveError(null);
    setSaveSuccess(false);
    setUpdateForm({
      logTime: row.logTime ?? '',
      currentReading: row.currentReading,
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
        await dailyNaturalGasTurbineApi.update(editTarget.id, {
          logTime: updateForm.logTime || undefined,
          currentReading: Number(updateForm.currentReading),
          heatingValue: Number(updateForm.heatingValue),
        });
        cancelEdit();
      } else {
        await dailyNaturalGasTurbineApi.create({
          plantCode: form.plantCode, unitCode: form.unitCode,
          logDate: form.logDate, logTime: form.logTime || undefined,
          currentReading: Number(form.currentReading),
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
      await dailyNaturalGasTurbineApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchRecords();
    } catch {
      setRecordsError('Failed to delete record.');
    } finally {
      setDeleting(false);
    }
  };

  const isFormValid = editTarget
    ? updateForm.currentReading !== '' && updateForm.heatingValue !== ''
    : form.plantCode && form.unitCode && form.logDate && form.currentReading !== '' && form.heatingValue !== '';

  return (
    <Box>
      <PageHeader
        title="Daily Natural Gas — Turbine Meter"
        subtitle="Daily natural gas meter readings with heat rate computations per thermal unit"
        breadcrumbs={[{ label: 'Daily Readings' }, { label: 'Natural Gas (Turbine Meter)' }]}
      />

      <Grid container spacing={3}>
        {/* ── Left: Entry form ── */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card>
            <CardHeader
              title={
                <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1.5}>
                  <LocalFireDepartment sx={{ color: '#E65100' }} />
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
                    <FormControl fullWidth required disabled={plantLocked || !!editTarget}>
                      <InputLabel>Power Plant</InputLabel>
                      <Select label="Power Plant"
                        value={editTarget ? editTarget.plantCode : form.plantCode}
                        onChange={(e) => setForm((prev) => ({ ...prev, plantCode: e.target.value }))}>
                        {availablePlants.map((p: PowerPlant) => (
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

              {/* Meter readings */}
              <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary"
                  sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                  Meter Readings
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Previous Reading" fullWidth disabled
                      value={loadingPrior ? '…' : previewPrevious.toFixed(2)}
                      helperText="Auto-carried from prior day (same plant + unit)"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Current Reading" type="number" fullWidth required
                      value={fv('currentReading')}
                      onChange={(e) => setField('currentReading', e.target.value)}
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
                    { label: 'Difference', value: fmt(previewDiff) },
                    { label: 'Progressive Total', value: fmt(previewProgressive) },
                    { label: 'Consumption (MMscf)', value: fmt(previewMMscf, 4) },
                    { label: 'Consumption (MMBtu)', value: fmt(previewMMBtu, 2) },
                    { label: 'Average Load', value: previewAvgLoad != null ? `${fmt(previewAvgLoad)} MW` : '—' },
                    { label: 'Heat Rate LHV (kJ/kWh)', value: previewLhvKj != null ? fmt(previewLhvKj) : '—' },
                    { label: 'Heat Rate LHV (Btu/kWh)', value: previewLhvBtu != null ? fmt(previewLhvBtu) : '—' },
                    { label: 'Heat Rate HHV (kJ/kWh)', value: previewHhvKj != null ? fmt(previewHhvKj) : '—' },
                    { label: 'Heat Rate HHV (Btu/kWh)', value: previewHhvBtu != null ? fmt(previewHhvBtu) : '—' },
                  ].map(({ label, value }) => (
                    <Grid key={label} size={{ xs: 6, sm: 4 }}>
                      <Typography variant="caption" color="text.secondary">{label}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{value}</Typography>
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
                    onChange={(e) => { setFilterPlant(e.target.value); setFilterUnit(''); }} disabled={plantLocked}>
                    <MenuItem value="">Select plant…</MenuItem>
                    {availablePlants.map((p: PowerPlant) => (
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
                        <TableCell>Diff</TableCell>
                        <TableCell>MMscf</TableCell>
                        <TableCell>LHV (Btu/kWh)</TableCell>
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
                            <Typography variant="body2">{row.difference.toFixed(1)}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{row.consumptionMMscf.toFixed(4)}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{row.heatRateLhvBtuKwh != null ? row.heatRateLhvBtuKwh.toFixed(0) : '—'}</Typography>
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
        message={`Delete natural gas turbine reading for ${deleteTarget?.unitCode} on ${deleteTarget?.logDate?.split('T')[0]}? This will recompute the chain for any later readings.`}
        confirmLabel="Delete" loading={deleting}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
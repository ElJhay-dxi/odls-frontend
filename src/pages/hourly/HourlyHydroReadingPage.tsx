import {
  Box, Card, CardContent, CardHeader, TextField, Button,
  CircularProgress, Alert, Typography, MenuItem, FormControl,
  InputLabel, Select, Grid, Divider, Chip, Stack, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, IconButton, Tooltip, Collapse,
} from '@mui/material';
import {
  Save, Search, Edit, Delete, WaterDrop,
  ExpandMore, ExpandLess, History,
} from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { plantUnitApi } from '../../api/masterData/plantUnitApi';
import { hourlyHydroApi } from '../../api/hourly/hourlyHydroApi';
import type { PowerPlant, PlantUnit } from '../../types/masterData';
import type {
  HourlyHydroReading,
  CreateHourlyHydroReadingForm,
  UpdateHourlyHydroReadingForm,
} from '../../types/hourlyReadings';
import { useSectionPermissions } from '../../hooks/usePermission';

const HOURS = Array.from({ length: 24 }, (_, i) => i + 1);

const emptyForm: CreateHourlyHydroReadingForm = {
  plantCode: '', unitCode: '',
  logDate: new Date().toISOString().split('T')[0],
  logHour: new Date().getHours() + 1,
  frequency: '', activePowerMW: '', reactivePowerMVar: '',
  voltageKV: '', currentAmps: '', powerFactor: '',
  statorTemperature: '', generatorFieldVoltage: '',
  generatorFieldCurrent: '', exciterCurrent: '',
  gatePosition: '', turbineDischarge: '', spillwayDischarge: '',
  transformerOilTemperature: '', transformerWindingTemperature: '',
  remarks: '',
};

const emptyUpdateForm: UpdateHourlyHydroReadingForm = {
  frequency: '', activePowerMW: '', reactivePowerMVar: '',
  voltageKV: '', currentAmps: '', powerFactor: '',
  statorTemperature: '', generatorFieldVoltage: '',
  generatorFieldCurrent: '', exciterCurrent: '',
  gatePosition: '', turbineDischarge: '', spillwayDischarge: '',
  transformerOilTemperature: '', transformerWindingTemperature: '',
  remarks: '',
};

type FormField = keyof CreateHourlyHydroReadingForm;
type UpdateField = keyof UpdateHourlyHydroReadingForm;

const SECTIONS = [
  {
    title: 'Generator', color: '#1565C0',
    fields: [
      { key: 'frequency', label: 'Frequency', unit: 'Hz' },
      { key: 'activePowerMW', label: 'Active Power', unit: 'MW' },
      { key: 'reactivePowerMVar', label: 'Reactive Power', unit: 'MVar' },
      { key: 'voltageKV', label: 'Voltage', unit: 'kV' },
      { key: 'currentAmps', label: 'Current', unit: 'A' },
      { key: 'powerFactor', label: 'Power Factor', unit: '' },
      { key: 'statorTemperature', label: 'Stator Temp', unit: '°C' },
      { key: 'generatorFieldVoltage', label: 'Field Voltage', unit: 'V' },
      { key: 'generatorFieldCurrent', label: 'Field Current', unit: 'A' },
      { key: 'exciterCurrent', label: 'Exciter Current', unit: 'A' },
    ],
  },
  {
    title: 'Turbine', color: '#1B5E20',
    fields: [
      { key: 'gatePosition', label: 'Gate Position', unit: '%' },
      { key: 'turbineDischarge', label: 'Turbine Discharge', unit: 'm³/s' },
      { key: 'spillwayDischarge', label: 'Spillway Discharge', unit: 'm³/s' },
    ],
  },
  {
    title: 'Transformer', color: '#4A148C',
    fields: [
      { key: 'transformerOilTemperature', label: 'Oil Temperature', unit: '°C' },
      { key: 'transformerWindingTemperature', label: 'Winding Temperature', unit: '°C' },
    ],
  },
];

export default function HourlyHydroReadingPage() {
  const { canCreate, canEdit, canDelete } = useSectionPermissions('hourly.hydro_units');
  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const [units, setUnits] = useState<PlantUnit[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<PlantUnit[]>([]);

  const [filterPlant, setFilterPlant] = useState('');
  const [filterUnit, setFilterUnit] = useState('');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

  const [records, setRecords] = useState<HourlyHydroReading[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  const [form, setForm] = useState<CreateHourlyHydroReadingForm>(emptyForm);
  const [updateForm, setUpdateForm] = useState<UpdateHourlyHydroReadingForm>(emptyUpdateForm);
  const [editTarget, setEditTarget] = useState<HourlyHydroReading | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<HourlyHydroReading | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    Promise.all([powerPlantApi.getAll(), plantUnitApi.getAll()])
      .then(([p, u]) => {
        setPlants(p.data.filter((pl) => pl.classificationType?.toLowerCase() === 'hydro'));
        setUnits(u.data);
      })
      .catch(() => setRecordsError('Failed to load reference data.'));
  }, []);

  useEffect(() => {
    setFilteredUnits(form.plantCode ? units.filter((u) => u.plantCode === form.plantCode) : []);
    setForm((prev) => ({ ...prev, unitCode: '' }));
  }, [form.plantCode, units]);

  const filterPlantUnits = filterPlant ? units.filter((u) => u.plantCode === filterPlant) : [];

  const fetchRecords = useCallback(async () => {
    if (!filterPlant) return;
    setLoadingRecords(true);
    setRecordsError(null);
    try {
      const res = await hourlyHydroApi.getAll({
        plantCode: filterPlant,
        unitCode: filterUnit || undefined,
        date: filterDate || undefined,
      });
      setRecords(res.data);
    } catch {
      setRecordsError('Failed to load records.');
    } finally {
      setLoadingRecords(false);
    }
  }, [filterPlant, filterUnit, filterDate]);

  const setFormField = (key: FormField, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setUpdateField = (key: UpdateField, value: string) =>
    setUpdateForm((prev) => ({ ...prev, [key]: value }));

  const activeValue = (key: string): string => {
    if (editTarget) return String((updateForm as unknown as Record<string, unknown>)[key] ?? '');
    return String((form as unknown as Record<string, unknown>)[key] ?? '');
  };

  const handleFieldChange = (key: string, value: string) => {
    if (editTarget) setUpdateField(key as UpdateField, value);
    else setFormField(key as FormField, value);
  };

  const openEdit = (row: HourlyHydroReading) => {
    setEditTarget(row);
    setSaveSuccess(false);
    setSaveError(null);
    setUpdateForm({
      frequency: row.frequency ?? '', activePowerMW: row.activePowerMW ?? '',
      reactivePowerMVar: row.reactivePowerMVar ?? '', voltageKV: row.voltageKV ?? '',
      currentAmps: row.currentAmps ?? '', powerFactor: row.powerFactor ?? '',
      statorTemperature: row.statorTemperature ?? '',
      generatorFieldVoltage: row.generatorFieldVoltage ?? '',
      generatorFieldCurrent: row.generatorFieldCurrent ?? '',
      exciterCurrent: row.exciterCurrent ?? '', gatePosition: row.gatePosition ?? '',
      turbineDischarge: row.turbineDischarge ?? '', spillwayDischarge: row.spillwayDischarge ?? '',
      transformerOilTemperature: row.transformerOilTemperature ?? '',
      transformerWindingTemperature: row.transformerWindingTemperature ?? '',
      remarks: row.remarks ?? '',
    });
    setForm((prev) => ({
      ...prev, plantCode: row.plantCode, unitCode: row.unitCode,
      logDate: row.logDate.split('T')[0], logHour: row.logHour,
    }));
  };

  const cancelEdit = () => { setEditTarget(null); setUpdateForm(emptyUpdateForm); };

  const handleSave = async () => {
    setSaving(true); setSaveError(null); setSaveSuccess(false);
    try {
      const toNum = (v: string | number | undefined) =>
        v === '' || v === undefined ? undefined : Number(v);

      if (editTarget) {
        await hourlyHydroApi.update(editTarget.id, {
          frequency: toNum(updateForm.frequency),
          activePowerMW: toNum(updateForm.activePowerMW),
          reactivePowerMVar: toNum(updateForm.reactivePowerMVar),
          voltageKV: toNum(updateForm.voltageKV),
          currentAmps: toNum(updateForm.currentAmps),
          powerFactor: toNum(updateForm.powerFactor),
          statorTemperature: toNum(updateForm.statorTemperature),
          generatorFieldVoltage: toNum(updateForm.generatorFieldVoltage),
          generatorFieldCurrent: toNum(updateForm.generatorFieldCurrent),
          exciterCurrent: toNum(updateForm.exciterCurrent),
          gatePosition: toNum(updateForm.gatePosition),
          turbineDischarge: toNum(updateForm.turbineDischarge),
          spillwayDischarge: toNum(updateForm.spillwayDischarge),
          transformerOilTemperature: toNum(updateForm.transformerOilTemperature),
          transformerWindingTemperature: toNum(updateForm.transformerWindingTemperature),
          remarks: updateForm.remarks || undefined,
        });
        setEditTarget(null); setUpdateForm(emptyUpdateForm);
      } else {
        await hourlyHydroApi.create({
          plantCode: form.plantCode, unitCode: form.unitCode,
          logDate: form.logDate, logHour: Number(form.logHour),
          frequency: toNum(form.frequency),
          activePowerMW: toNum(form.activePowerMW),
          reactivePowerMVar: toNum(form.reactivePowerMVar),
          voltageKV: toNum(form.voltageKV), currentAmps: toNum(form.currentAmps),
          powerFactor: toNum(form.powerFactor),
          statorTemperature: toNum(form.statorTemperature),
          generatorFieldVoltage: toNum(form.generatorFieldVoltage),
          generatorFieldCurrent: toNum(form.generatorFieldCurrent),
          exciterCurrent: toNum(form.exciterCurrent),
          gatePosition: toNum(form.gatePosition),
          turbineDischarge: toNum(form.turbineDischarge),
          spillwayDischarge: toNum(form.spillwayDischarge),
          transformerOilTemperature: toNum(form.transformerOilTemperature),
          transformerWindingTemperature: toNum(form.transformerWindingTemperature),
          remarks: form.remarks || undefined,
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
      await hourlyHydroApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchRecords();
    } catch {
      setRecordsError('Failed to delete record.');
    } finally {
      setDeleting(false);
    }
  };

  const isFormValid = editTarget ? true : form.plantCode && form.unitCode && form.logDate && form.logHour;
  const toggleSection = (title: string) =>
    setCollapsed((prev) => ({ ...prev, [title]: !prev[title] }));

  return (
    <Box>
      <PageHeader
        title="Hourly Unit Readings — Hydro"
        subtitle="Record hourly operational parameters for hydro generating units"
        breadcrumbs={[{ label: 'Hourly Readings' }, { label: 'Unit Readings (Hydro)' }]}
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Card>
            <CardHeader
              title={
                <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1.5}>
                  <WaterDrop sx={{ color: '#1565C0' }} />
                  <Typography sx={{ fontWeight: 700 }}>
                    {editTarget
                      ? `Editing: ${editTarget.unitName} — ${editTarget.logDate?.split('T')[0]} Hour ${editTarget.logHour}`
                      : 'New Reading'}
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
                        onChange={(e) => setFormField('plantCode', e.target.value)}>
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
                        onChange={(e) => setFormField('unitCode', e.target.value)}>
                        {(editTarget
                          ? units.filter((u) => u.plantCode === editTarget.plantCode)
                          : filteredUnits
                        ).map((u) => (
                          <MenuItem key={u.id} value={u.unitCode}>{u.unitName} ({u.unitCode})</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Log Date" type="date"
                      value={editTarget ? editTarget.logDate?.split('T')[0] : form.logDate}
                      onChange={(e) => setFormField('logDate', e.target.value)}
                      fullWidth required disabled={!!editTarget}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth required disabled={!!editTarget}>
                      <InputLabel>Hour</InputLabel>
                      <Select label="Hour"
                        value={editTarget ? editTarget.logHour : form.logHour}
                        onChange={(e) => setFormField('logHour', String(e.target.value))}>
                        {HOURS.map((h) => (
                          <MenuItem key={h} value={h}>{String(h).padStart(2, '0')}:00</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Paper>

              {SECTIONS.map((section) => (
                <Paper key={section.title} variant="outlined" sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
                  <Box sx={{
                    px: 2, py: 1.2,
                    backgroundColor: `${section.color}14`,
                    borderBottom: collapsed[section.title] ? 'none' : '1px solid',
                    borderColor: 'divider',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    cursor: 'pointer',
                  }}
                    onClick={() => toggleSection(section.title)}>
                    <Typography variant="caption"
                      sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: section.color }}>
                      {section.title}
                    </Typography>
                    <IconButton size="small">
                      {collapsed[section.title] ? <ExpandMore fontSize="small" /> : <ExpandLess fontSize="small" />}
                    </IconButton>
                  </Box>
                  <Collapse in={!collapsed[section.title]}>
                    <Box sx={{ p: 2 }}>
                      <Grid container spacing={2}>
                        {section.fields.map((field) => (
                          <Grid key={field.key} size={{ xs: 12, sm: 6, md: 4 }}>
                            <TextField label={field.label} type="number"
                              value={activeValue(field.key)}
                              onChange={(e) => handleFieldChange(field.key, e.target.value)}
                              fullWidth size="small"
                              slotProps={{
                                input: field.unit ? {
                                  endAdornment: (
                                    <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5, whiteSpace: 'nowrap' }}>
                                      {field.unit}
                                    </Typography>
                                  ),
                                } : undefined,
                              }}
                            />
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  </Collapse>
                </Paper>
              ))}

              <TextField label="Remarks"
                value={activeValue('remarks')}
                onChange={(e) => handleFieldChange('remarks', e.target.value)}
                fullWidth multiline rows={2}
                placeholder="Optional remarks or observations..."
              />

              <Stack direction="row" spacing={1.5} sx={{ mt: 2.5 }}>
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
                      {filterPlantUnits.map((u) => (
                        <MenuItem key={u.id} value={u.unitCode}>{u.unitName}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField label="Date" type="date" size="small" value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)} sx={{ flex: 1 }}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Stack>
                <Button variant="outlined" size="small" fullWidth
                  startIcon={loadingRecords ? <CircularProgress size={14} /> : <Search />}
                  onClick={fetchRecords} disabled={!filterPlant || loadingRecords}>
                  {loadingRecords ? 'Loading...' : 'Load Records'}
                </Button>
              </Stack>

              {recordsError && <Alert severity="error" onClose={() => setRecordsError(null)} sx={{ mb: 1.5 }}>{recordsError}</Alert>}

              {records.length === 0 && !loadingRecords ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <WaterDrop sx={{ fontSize: '2rem', color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    {filterPlant ? 'No records found for selected filters.' : 'Select a plant and click Load Records.'}
                  </Typography>
                </Box>
              ) : (
                <TableContainer sx={{ maxHeight: 480 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Unit</TableCell>
                        <TableCell>Hour</TableCell>
                        <TableCell>MW</TableCell>
                        <TableCell>MVar</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {records.map((row) => (
                        <TableRow key={row.id} selected={editTarget?.id === row.id} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.unitCode}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={`${String(row.logHour).padStart(2, '0')}:00`}
                              size="small" variant="outlined"
                              sx={{ fontFamily: 'monospace', fontWeight: 600 }} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{row.activePowerMW != null ? row.activePowerMW : '—'}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{row.reactivePowerMVar != null ? row.reactivePowerMVar : '—'}</Typography>
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

          {records.length > 0 && (
            <Card sx={{ mt: 2 }}>
              <CardContent sx={{ py: '12px !important' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}
                  color="text.secondary">
                  Day Summary — {filterDate}
                </Typography>
                <Stack direction="row" spacing={3} sx={{ mt: 1 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }} color="primary">
                      {records.filter((r) => r.activePowerMW != null).length > 0
                        ? (records.reduce((s, r) => s + (r.activePowerMW ?? 0), 0) /
                          records.filter(r => r.activePowerMW != null).length).toFixed(1)
                        : '—'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Avg MW</Typography>
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }} color="success.main">
                      {records.filter((r) => r.activePowerMW != null).length > 0
                        ? Math.max(...records.map((r) => r.activePowerMW ?? 0)).toFixed(1)
                        : '—'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Peak MW</Typography>
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{records.length}</Typography>
                    <Typography variant="caption" color="text.secondary">Hours Logged</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Reading"
        message={`Delete the reading for ${deleteTarget?.unitCode} on ${deleteTarget?.logDate?.split('T')[0]} hour ${deleteTarget?.logHour}?`}
        confirmLabel="Delete" loading={deleting}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
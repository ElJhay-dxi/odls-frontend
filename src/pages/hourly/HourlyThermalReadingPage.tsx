import {
  Box, Card, CardContent, CardHeader, TextField, Button,
  CircularProgress, Alert, Typography, MenuItem, FormControl,
  InputLabel, Select, Grid, Divider, Chip, Stack, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, IconButton, Tooltip, Collapse,
} from '@mui/material';
import {
  Save, Search, Edit, Delete, ElectricBolt,
  ExpandMore, ExpandLess, History,
} from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { plantUnitApi } from '../../api/masterData/plantUnitApi';
import { hourlyThermalApi } from '../../api/hourly/hourlyThermalApi';
import type { PowerPlant, PlantUnit } from '../../types/masterData';
import type {
  HourlyThermalReading,
  CreateHourlyThermalReadingForm,
  UpdateHourlyThermalReadingForm,
} from '../../types/hourlyReadings';

const HOURS = Array.from({ length: 24 }, (_, i) => i + 1);

const emptyForm: CreateHourlyThermalReadingForm = {
  plantCode: '', unitCode: '',
  logDate: new Date().toISOString().split('T')[0],
  logHour: new Date().getHours() + 1,
  // Generator
  genMW: '', genMVar: '', genKV: '', genTNHRpm: '',
  genColdGasTemp: '', genHotGasTemp: '', genMaxStatorTemp: '',
  // Compressor
  compAmbTemp: '', compIgvPos: '', compAfq: '', compCpd: '', compCdt: '',
  // Turbine
  turbGasPressCtrl: '', turbGasInterValvePress: '', turbGasFuelFlow: '',
  turbGasFuelTemp: '', turbLiquidFuelFlow: '', turbH2OInjFlow: '',
  turbMaxBrgVib: '', turbExhSprd: '', turbAllwSprd: '',
  turbExhstTemp: '', turbLoadTunnTemp: '', turbBrgHdTemp: '',
  // Bearing metal
  brgMetal1: '', brgMetal2: '', brgMetal3: '', brgMetal4: '', brgMetal5: '',
  brgThrustActiveAcc: '', brgThrustInactiveAcc: '',
  // Bearing drain
  brgDrain1: '', brgDrain2: '', brgDrain3: '', brgDrain4: '', brgDrain5: '',
  atomAirTemp: '',
  // EX2000
  ex2000FldCurr: '', ex2000FldVolt: '', ex2000RotorTemp: '',
  // STG
  stgMW: '', stgMVar: '', stgKV: '', stgTNHRpm: '', stgSteamFlow: '',
  stgTurbInletTemp: '', stgTurbInletPress: '',
  stgTurbExhaustTemp: '', stgTurbExhaustPress: '',
  stgSealSteamTemp: '', stgSealSteamPress: '', stgHydOilPress: '',
  stgBrgHeaderTemp: '', stgBrgHeaderPress: '',
  stgThrustMaxAct: '', stgThrustMaxInact: '',
  stgJournalMaxMetal: '', stgJournalMaxDrain: '',
  stgVibAmpBbmax: '', stgProx: '',
  stgShellExp: '', stgAxialExp: '', stgDiffExp: '',
  stgEx2000FldAmp: '', stgEx2000FldVolts: '', stgEx2000RotorTemp: '',
  remarks: '',
};

const SECTIONS = [
  {
    title: 'Generator',
    color: '#B71C1C',
    fields: [
      { key: 'genMW', label: 'MW', unit: 'MW' },
      { key: 'genMVar', label: 'MVar', unit: 'MVar' },
      { key: 'genKV', label: 'kV', unit: 'kV' },
      { key: 'genTNHRpm', label: 'TNH', unit: 'RPM' },
      { key: 'genColdGasTemp', label: 'Cold Gas Temp', unit: '°C' },
      { key: 'genHotGasTemp', label: 'Hot Gas Temp', unit: '°C' },
      { key: 'genMaxStatorTemp', label: 'Max Stator Temp', unit: '°C' },
    ],
  },
  {
    title: 'Compressor',
    color: '#E65100',
    fields: [
      { key: 'compAmbTemp', label: 'AMB Temp', unit: '°C' },
      { key: 'compIgvPos', label: 'IGV Pos', unit: 'DGA' },
      { key: 'compAfq', label: 'AFQ', unit: '' },
      { key: 'compCpd', label: 'CPD', unit: 'bar' },
      { key: 'compCdt', label: 'CDT', unit: '°C' },
    ],
  },
  {
    title: 'Turbine',
    color: '#1A237E',
    fields: [
      { key: 'turbGasPressCtrl', label: 'Gas Press Ctrl', unit: 'bar' },
      { key: 'turbGasInterValvePress', label: 'Gas Inter Valve Press', unit: 'bar' },
      { key: 'turbGasFuelFlow', label: 'Gas Fuel Flow', unit: 'Kg/s' },
      { key: 'turbGasFuelTemp', label: 'Gas Fuel Temp', unit: '°C' },
      { key: 'turbLiquidFuelFlow', label: 'Liquid Fuel Flow', unit: 'Kg/s' },
      { key: 'turbH2OInjFlow', label: 'H₂O Inj Flow', unit: 'Kg/s' },
      { key: 'turbMaxBrgVib', label: 'Max Brg Vib', unit: '' },
      { key: 'turbExhSprd', label: 'Exh Spread', unit: '°C' },
      { key: 'turbAllwSprd', label: 'Allw Spread', unit: '°C' },
      { key: 'turbExhstTemp', label: 'Exhaust Temp', unit: '°C' },
      { key: 'turbLoadTunnTemp', label: 'Load Tunn Temp', unit: '°C' },
      { key: 'turbBrgHdTemp', label: 'Brg Hd Temp', unit: '°C' },
      { key: 'atomAirTemp', label: 'Atom Air Temp', unit: '°C' },
    ],
  },
  {
    title: 'Bearing Metal Temperatures',
    color: '#4A148C',
    fields: [
      { key: 'brgMetal1', label: 'Brg #1 Metal', unit: '°C' },
      { key: 'brgMetal2', label: 'Brg #2 Metal', unit: '°C' },
      { key: 'brgMetal3', label: 'Brg #3 Metal', unit: '°C' },
      { key: 'brgMetal4', label: 'Brg #4 Metal', unit: '°C' },
      { key: 'brgMetal5', label: 'Brg #5 Metal', unit: '°C' },
      { key: 'brgThrustActiveAcc', label: 'Thrust Active', unit: '°C' },
      { key: 'brgThrustInactiveAcc', label: 'Thrust Inactive', unit: '°C' },
    ],
  },
  {
    title: 'Bearing Drain Temperatures',
    color: '#006064',
    fields: [
      { key: 'brgDrain1', label: 'Drain #1', unit: '°C' },
      { key: 'brgDrain2', label: 'Drain #2', unit: '°C' },
      { key: 'brgDrain3', label: 'Drain #3', unit: '°C' },
      { key: 'brgDrain4', label: 'Drain #4', unit: '°C' },
      { key: 'brgDrain5', label: 'Drain #5', unit: '°C' },
    ],
  },
  {
    title: 'EX2000',
    color: '#33691E',
    fields: [
      { key: 'ex2000FldCurr', label: 'Field Current', unit: 'A' },
      { key: 'ex2000FldVolt', label: 'Field Voltage', unit: 'V' },
      { key: 'ex2000RotorTemp', label: 'Rotor Temp', unit: '°C' },
    ],
  },
  {
    title: 'Steam Turbine Generator (STG)',
    color: '#37474F',
    subtitle: 'Combined cycle units only',
    fields: [
      { key: 'stgMW', label: 'MW', unit: 'MW' },
      { key: 'stgMVar', label: 'MVar', unit: 'MVar' },
      { key: 'stgKV', label: 'kV', unit: 'kV' },
      { key: 'stgTNHRpm', label: 'TNH', unit: 'rpm' },
      { key: 'stgSteamFlow', label: 'Steam Flow', unit: 't/h' },
      { key: 'stgTurbInletTemp', label: 'Inlet Temp', unit: '°C' },
      { key: 'stgTurbInletPress', label: 'Inlet Press', unit: 'bar' },
      { key: 'stgTurbExhaustTemp', label: 'Exhaust Temp', unit: '°C' },
      { key: 'stgTurbExhaustPress', label: 'Exhaust Press', unit: 'mmHg' },
      { key: 'stgSealSteamTemp', label: 'Seal Steam Temp', unit: '°C' },
      { key: 'stgSealSteamPress', label: 'Seal Steam Press', unit: 'bar' },
      { key: 'stgHydOilPress', label: 'Hyd Oil Press', unit: 'bar' },
      { key: 'stgBrgHeaderTemp', label: 'Brg Header Temp', unit: '°C' },
      { key: 'stgBrgHeaderPress', label: 'Brg Header Press', unit: 'bar' },
      { key: 'stgThrustMaxAct', label: 'Thrust Max Act', unit: '°C' },
      { key: 'stgThrustMaxInact', label: 'Thrust Max Inact', unit: '°C' },
      { key: 'stgJournalMaxMetal', label: 'Journal Max Metal', unit: '°C' },
      { key: 'stgJournalMaxDrain', label: 'Journal Max Drain', unit: '°C' },
      { key: 'stgVibAmpBbmax', label: 'Vib Amp BBMAX', unit: 'mm/s' },
      { key: 'stgProx', label: 'Prox', unit: '' },
      { key: 'stgShellExp', label: 'Shell Exp', unit: 'mm' },
      { key: 'stgAxialExp', label: 'Axial Exp', unit: 'mm' },
      { key: 'stgDiffExp', label: 'Diff Exp', unit: 'mm' },
      { key: 'stgEx2000FldAmp', label: 'EX2000 Fld Amp', unit: 'A' },
      { key: 'stgEx2000FldVolts', label: 'EX2000 Fld Volts', unit: 'V' },
      { key: 'stgEx2000RotorTemp', label: 'EX2000 Rotor Temp', unit: '°C' },
    ],
  },
];

export default function HourlyThermalReadingPage() {
  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const [units, setUnits] = useState<PlantUnit[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<PlantUnit[]>([]);

  const [filterPlant, setFilterPlant] = useState('');
  const [filterUnit, setFilterUnit] = useState('');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

  const [records, setRecords] = useState<HourlyThermalReading[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  const [form, setForm] = useState<CreateHourlyThermalReadingForm>(emptyForm);
  const [updateForm, setUpdateForm] = useState<Partial<UpdateHourlyThermalReadingForm>>({});
  const [editTarget, setEditTarget] = useState<HourlyThermalReading | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<HourlyThermalReading | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ 'Steam Turbine Generator (STG)': true });

  useEffect(() => {
    Promise.all([powerPlantApi.getAll(), plantUnitApi.getAll()])
      .then(([p, u]) => {
        const thermalPlants = p.data.filter(
          (pl) => pl.classificationType?.toLowerCase() === 'thermal'
        );
        setPlants(thermalPlants);
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
      const res = await hourlyThermalApi.getAll({
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

  const activeValue = (key: string): string => {
    if (editTarget) return String((updateForm as unknown as Record<string, unknown>)[key] ?? '');
    return String((form as unknown as Record<string, unknown>)[key] ?? '');
  };

  const handleFieldChange = (key: string, value: string) => {
    if (editTarget) setUpdateForm((prev) => ({ ...prev, [key]: value }));
    else setForm((prev) => ({ ...prev, [key]: value }));
  };

  const openEdit = (row: HourlyThermalReading) => {
    setEditTarget(row);
    setSaveSuccess(false);
    setSaveError(null);
    // Populate updateForm with all reading fields from the row
    const fields = [
      'genMW','genMVar','genKV','genTNHRpm','genColdGasTemp','genHotGasTemp','genMaxStatorTemp',
      'compAmbTemp','compIgvPos','compAfq','compCpd','compCdt',
      'turbGasPressCtrl','turbGasInterValvePress','turbGasFuelFlow','turbGasFuelTemp',
      'turbLiquidFuelFlow','turbH2OInjFlow','turbMaxBrgVib','turbExhSprd','turbAllwSprd',
      'turbExhstTemp','turbLoadTunnTemp','turbBrgHdTemp',
      'brgMetal1','brgMetal2','brgMetal3','brgMetal4','brgMetal5',
      'brgThrustActiveAcc','brgThrustInactiveAcc',
      'brgDrain1','brgDrain2','brgDrain3','brgDrain4','brgDrain5',
      'atomAirTemp','ex2000FldCurr','ex2000FldVolt','ex2000RotorTemp',
      'stgMW','stgMVar','stgKV','stgTNHRpm','stgSteamFlow',
      'stgTurbInletTemp','stgTurbInletPress','stgTurbExhaustTemp','stgTurbExhaustPress',
      'stgSealSteamTemp','stgSealSteamPress','stgHydOilPress',
      'stgBrgHeaderTemp','stgBrgHeaderPress','stgThrustMaxAct','stgThrustMaxInact',
      'stgJournalMaxMetal','stgJournalMaxDrain','stgVibAmpBbmax','stgProx',
      'stgShellExp','stgAxialExp','stgDiffExp',
      'stgEx2000FldAmp','stgEx2000FldVolts','stgEx2000RotorTemp','remarks',
    ];
    const populated: Record<string, string> = {};
    fields.forEach((f) => {
      const v = (row as unknown as Record<string, unknown>)[f];
      populated[f] = v != null ? String(v) : '';
    });
    setUpdateForm(populated);
    setForm((prev) => ({
      ...prev,
      plantCode: row.plantCode,
      unitCode: row.unitCode,
      logDate: row.logDate.split('T')[0],
      logHour: row.logHour,
    }));
  };

  const cancelEdit = () => {
    setEditTarget(null);
    setUpdateForm({});
  };

  const toNum = (v: string | number | undefined) =>
    v === '' || v === undefined ? undefined : Number(v);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      if (editTarget) {
        const payload: Record<string, unknown> = {};
        Object.entries(updateForm).forEach(([k, v]) => {
          payload[k] = k === 'remarks' ? (v || undefined) : toNum(v as string);
        });
        await hourlyThermalApi.update(editTarget.id, payload);
        setEditTarget(null);
        setUpdateForm({});
      } else {
        const payload: Record<string, unknown> = {
          plantCode: form.plantCode,
          unitCode: form.unitCode,
          logDate: form.logDate,
          logHour: Number(form.logHour),
        };
        const numFields = Object.keys(emptyForm).filter(
          (k) => !['plantCode','unitCode','logDate','logHour','remarks'].includes(k)
        );
        numFields.forEach((k) => {
          payload[k] = toNum((form as unknown as Record<string, unknown>)[k] as string);
        });
        payload.remarks = form.remarks || undefined;
        await hourlyThermalApi.create(payload);
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
      await hourlyThermalApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchRecords();
    } catch {
      setRecordsError('Failed to delete record.');
    } finally {
      setDeleting(false);
    }
  };

  const isFormValid = editTarget
    ? true
    : form.plantCode && form.unitCode && form.logDate && form.logHour;

  const toggleSection = (title: string) =>
    setCollapsed((prev) => ({ ...prev, [title]: !prev[title] }));

  return (
    <Box>
      <PageHeader
        title="Hourly Unit Readings — Thermal"
        subtitle="Record hourly operational parameters for thermal generating units"
        breadcrumbs={[{ label: 'Hourly Readings' }, { label: 'Unit Readings (Thermal)' }]}
      />

      <Grid container spacing={3}>
        {/* ── Left: Entry Form ── */}
        <Grid size={{ xs: 12, lg: 7 }}>
          <Card>
            <CardHeader
              title={
                <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1.5}>
                  <ElectricBolt sx={{ color: '#B71C1C' }} />
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
              {saveError && (
                <Alert severity="error" onClose={() => setSaveError(null)} sx={{ mb: 2 }}>{saveError}</Alert>
              )}
              {saveSuccess && (
                <Alert severity="success" onClose={() => setSaveSuccess(false)} sx={{ mb: 2 }}>
                  Reading saved successfully.
                </Alert>
              )}

              {/* Identity */}
              <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2 }}>
                <Typography variant="caption"
                  sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1,fontWeight: 700, color: 'text.secondary' }}>
                  Log Identity
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth required disabled={!!editTarget}>
                      <InputLabel>Power Plant</InputLabel>
                      <Select
                        label="Power Plant"
                        value={editTarget ? editTarget.plantCode : form.plantCode}
                        onChange={(e) => setForm((prev) => ({ ...prev, plantCode: e.target.value }))}
                      >
                        {plants.map((p) => (
                          <MenuItem key={p.id} value={p.plantCode}>
                            {p.plantName} ({p.plantCode})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth required disabled={!!editTarget || !form.plantCode}>
                      <InputLabel>Unit</InputLabel>
                      <Select
                        label="Unit"
                        value={editTarget ? editTarget.unitCode : form.unitCode}
                        onChange={(e) => setForm((prev) => ({ ...prev, unitCode: e.target.value }))}
                      >
                        {(editTarget
                          ? units.filter((u) => u.plantCode === editTarget.plantCode)
                          : filteredUnits
                        ).map((u) => (
                          <MenuItem key={u.id} value={u.unitCode}>
                            {u.unitName} ({u.unitCode})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Log Date" type="date"
                      value={editTarget ? editTarget.logDate?.split('T')[0] : form.logDate}
                      onChange={(e) => setForm((prev) => ({ ...prev, logDate: e.target.value }))}
                      fullWidth required disabled={!!editTarget}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth required disabled={!!editTarget}>
                      <InputLabel>Hour</InputLabel>
                      <Select
                        label="Hour"
                        value={editTarget ? editTarget.logHour : form.logHour}
                        onChange={(e) => setForm((prev) => ({ ...prev, logHour: Number(e.target.value) }))}
                      >
                        {HOURS.map((h) => (
                          <MenuItem key={h} value={h}>{String(h).padStart(2, '0')}:00</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Paper>

              {/* Reading sections */}
              {SECTIONS.map((section) => (
                <Paper key={section.title} variant="outlined" sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
                  <Box
                    sx={{
                      px: 2, py: 1.2,
                      backgroundColor: `${section.color}14`,
                      borderBottom: collapsed[section.title] ? 'none' : '1px solid',
                      borderColor: 'divider',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      cursor: 'pointer',
                    }}
                    onClick={() => toggleSection(section.title)}
                  >
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: section.color }}>
                        {section.title}
                      </Typography>
                      {'subtitle' in section && section.subtitle && (
                        <Typography variant="caption" color="text.disabled" sx={{ ml: 1 }}>
                          — {section.subtitle}
                        </Typography>
                      )}
                    </Box>
                    <IconButton size="small">
                      {collapsed[section.title] ? <ExpandMore fontSize="small" /> : <ExpandLess fontSize="small" />}
                    </IconButton>
                  </Box>
                  <Collapse in={!collapsed[section.title]}>
                    <Box sx={{ p: 2 }}>
                      <Grid container spacing={2}>
                        {section.fields.map((field) => (
                          <Grid key={field.key} size={{ xs: 12, sm: 6, md: 4 }}>
                            <TextField
                              label={field.label}
                              type="number"
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

              {/* Remarks */}
              <TextField
                label="Remarks"
                value={activeValue('remarks')}
                onChange={(e) => handleFieldChange('remarks', e.target.value)}
                fullWidth multiline rows={2}
                placeholder="Optional remarks or observations..."
              />

              <Stack direction="row" spacing={1.5} sx={{ mt: 2.5 }}>
                {editTarget && (
                  <Button variant="outlined" onClick={cancelEdit} disabled={saving}>Cancel</Button>
                )}
                <Button
                  variant="contained"
                  onClick={handleSave}
                  disabled={saving || !isFormValid}
                  startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />}
                  sx={{ minWidth: 140 }}
                >
                  {saving ? 'Saving...' : editTarget ? 'Update Reading' : 'Save Reading'}
                </Button>
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
                  <TextField
                    label="Date" type="date" size="small" value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    sx={{ flex: 1 }}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Stack>
                <Button
                  variant="outlined" size="small" fullWidth
                  startIcon={loadingRecords ? <CircularProgress size={14} /> : <Search />}
                  onClick={fetchRecords}
                  disabled={!filterPlant || loadingRecords}
                >
                  {loadingRecords ? 'Loading...' : 'Load Records'}
                </Button>
              </Stack>

              {recordsError && (
                <Alert severity="error" onClose={() => setRecordsError(null)} sx={{ mb: 1.5 }}>{recordsError}</Alert>
              )}

              {records.length === 0 && !loadingRecords ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <ElectricBolt sx={{ fontSize: '2rem', color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    {filterPlant ? 'No records found.' : 'Select a plant and click Load Records.'}
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
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {row.unitCode}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={`${String(row.logHour).padStart(2, '0')}:00`}
                              size="small" variant="outlined"
                              sx={{ fontFamily: 'monospace', fontWeight: 600 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {row.genMW != null ? row.genMW : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {row.genMVar != null ? row.genMVar : '—'}
                            </Typography>
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

          {records.length > 0 && (
            <Card sx={{ mt: 2 }}>
              <CardContent sx={{ py: '12px !important' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>
                  Day Summary — {filterDate}
                </Typography>
                <Stack direction="row" spacing={3} sx={{ mt: 1 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'error.main' }}>
                      {records.filter((r) => r.genMW != null).length > 0
                        ? (records.reduce((s, r) => s + (r.genMW ?? 0), 0) / records.filter(r => r.genMW != null).length).toFixed(1)
                        : '—'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Avg MW</Typography>
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'success.main' }}>
                      {records.filter((r) => r.genMW != null).length > 0
                        ? Math.max(...records.map((r) => r.genMW ?? 0)).toFixed(1)
                        : '—'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Peak MW</Typography>
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {records.length}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Hours Logged</Typography>
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
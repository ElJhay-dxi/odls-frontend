import {
  Box, Card, CardContent, CardHeader, TextField, Button,
  CircularProgress, Alert, Typography, MenuItem, FormControl,
  InputLabel, Select, Grid, Divider, Chip, Stack, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, IconButton, Tooltip, Collapse, Checkbox, FormControlLabel,
} from '@mui/material';
import {
  Save, Search, Edit, Delete, ElectricBolt,
  ExpandMore, ExpandLess, History, Remove,
} from '@mui/icons-material';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { plantUnitApi } from '../../api/masterData/plantUnitApi';
import { hourlyThermalApi, bearingMetalApi, bearingDrainApi } from '../../api/hourly/hourlyThermalApi';
import type { PowerPlant, PlantUnit } from '../../types/masterData';
import type { BearingMetal, BearingDrain, BearingMetalReadingRow, BearingDrainReadingRow } from '../../types/bearings';
import type { HourlyThermalReading, CreateHourlyThermalReadingForm } from '../../types/hourlyReadings';
import { useSectionPermissions, usePlantFilter } from '../../hooks/usePermission';
import { usePlantTypeGuard } from '../../hooks/usePlantTypeGuard';

type FormKey = keyof CreateHourlyThermalReadingForm;
type NumericFormKey = Exclude<FormKey, 'plantCode' | 'unitCode' | 'logDate' | 'logHour' | 'remarks'>;

interface SectionField { key: NumericFormKey; label: string; unit: string; }
interface Section { title: string; color: string; subtitle?: string; fields: SectionField[]; }

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const emptyForm: CreateHourlyThermalReadingForm = {
  plantCode: '', unitCode: '',
  logDate: new Date().toISOString().split('T')[0],
  logHour: new Date().getHours(),
  genMW: '', genMVar: '', genKV: '', genTNHRpm: '',
  genColdGasTemp: '', genHotGasTemp: '', genMaxStatorTemp: '',
  compAmbTemp: '', compIgvPos: '', compAfq: '', compCpd: '', compCdt: '',
  turbGasPressCtrl: '', turbGasInterValvePress: '', turbGasFuelFlow: '',
  turbGasFuelTemp: '', turbLiquidFuelFlow: '', turbH2OInjFlow: '',
  turbMaxBrgVib: '', turbExhSprd: '', turbAllwSprd: '',
  turbExhstTemp: '', turbLoadTunnTemp: '', turbBrgHdTemp: '',
  atomAirTemp: '',
  ex2000FldCurr: '', ex2000FldVolt: '', ex2000RotorTemp: '',
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

const SECTIONS: Section[] = [
  {
    title: 'Generator', color: '#B71C1C',
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
    title: 'Compressor', color: '#E65100',
    fields: [
      { key: 'compAmbTemp', label: 'AMB Temp', unit: '°C' },
      { key: 'compIgvPos', label: 'IGV Pos', unit: 'DGA' },
      { key: 'compAfq', label: 'AFQ', unit: '' },
      { key: 'compCpd', label: 'CPD', unit: 'bar' },
      { key: 'compCdt', label: 'CDT', unit: '°C' },
    ],
  },
  {
    title: 'Turbine', color: '#1A237E',
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
    title: 'EX2000 - Excitation System', color: '#33691E',
    fields: [
      { key: 'ex2000FldCurr', label: 'Field Current', unit: 'A' },
      { key: 'ex2000FldVolt', label: 'Field Voltage', unit: 'V' },
      { key: 'ex2000RotorTemp', label: 'Rotor Temp', unit: '°C' },
    ],
  },
  {
    title: 'Steam Turbine Generator (STG)', color: '#37474F',
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
  const { canCreate, canEdit, canDelete } = useSectionPermissions('hourly.thermal_units');
  const isWrongPlantType = usePlantTypeGuard('thermal');
  const navigate = useNavigate();
  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const [units, setUnits] = useState<PlantUnit[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<PlantUnit[]>([]);

  const [bearingMetals, setBearingMetals] = useState<BearingMetal[]>([]);
  const [bearingDrains, setBearingDrains] = useState<BearingDrain[]>([]);
  const [metalRows, setMetalRows] = useState<BearingMetalReadingRow[]>([]);
  const [drainRows, setDrainRows] = useState<BearingDrainReadingRow[]>([]);
  const pendingMetalRows = useRef<BearingMetalReadingRow[] | null>(null);
  const pendingDrainRows = useRef<BearingDrainReadingRow[] | null>(null);

  const [filterPlant, setFilterPlant] = useState('');
  const [filterUnit, setFilterUnit] = useState('');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

  const [records, setRecords] = useState<HourlyThermalReading[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  const [form, setForm] = useState<CreateHourlyThermalReadingForm>(emptyForm);
  const [updateForm, setUpdateForm] = useState<Partial<CreateHourlyThermalReadingForm>>({});
  const [editTarget, setEditTarget] = useState<HourlyThermalReading | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [unitDown, setUnitDown] = useState(false);
  const [missingHours, setMissingHours] = useState<number[] | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<HourlyThermalReading | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    'Steam Turbine Generator (STG)': true,
    'Bearing Metal Temperatures': false,
    'Bearing Drain Temperatures': false,
  });

  useEffect(() => {
    Promise.all([powerPlantApi.getAll(), plantUnitApi.getAll()])
      .then(([p, u]) => {
        setPlants(p.data.filter((pl) => pl.classificationType === 'Thermal'));
        setUnits(u.data);
      })
      .catch(() => setRecordsError('Failed to load reference data.'));
  }, []);

  // Plant filter hook — restricts dropdown to user's assigned plants
  const { availablePlants, plantLocked, autoPlantCode } = usePlantFilter(plants);

  // Auto-select plant when user has only one assigned
  useEffect(() => {
    if (autoPlantCode) {
      setFilterPlant(autoPlantCode);
      setForm((prev) => ({ ...prev, plantCode: autoPlantCode }));
    }
  }, [autoPlantCode]);

  useEffect(() => {
    setFilteredUnits(form.plantCode ? units.filter((u) => u.plantCode === form.plantCode) : []);
    if (!editTarget) {
      setForm((prev) => ({ ...prev, unitCode: '' }));
      setBearingMetals([]); setBearingDrains([]);
      setMetalRows([]); setDrainRows([]);
    }
  }, [form.plantCode, units]);

  useEffect(() => {
    const code = editTarget ? editTarget.unitCode : form.unitCode;
    const plant = editTarget ? editTarget.plantCode : form.plantCode;
    if (!plant || !code) return;
    Promise.all([bearingMetalApi.getAll(plant, code), bearingDrainApi.getAll(plant, code)])
      .then(([m, d]) => {
        setBearingMetals(m.data); setBearingDrains(d.data);
        // Show every configured bearing as a row up front — pre-fill from the record being edited, blank otherwise.
        const existingMetal = pendingMetalRows.current ?? [];
        const existingDrain = pendingDrainRows.current ?? [];
        setMetalRows(m.data.map((b) => {
          const existing = existingMetal.find((r) => r.bearingCode === b.bearingCode);
          return { bearingCode: b.bearingCode, bearingName: b.bearingName, metalTemperature: existing ? String(existing.metalTemperature) : '' };
        }));
        setDrainRows(d.data.map((dr) => {
          const existing = existingDrain.find((r) => r.drainCode === dr.drainCode);
          return { drainCode: dr.drainCode, drainName: dr.drainName, drainTemperature: existing ? String(existing.drainTemperature) : '', tempDiff: existing?.tempDiff ?? null };
        }));
        pendingMetalRows.current = null; pendingDrainRows.current = null;
      }).catch(() => {});
  }, [form.unitCode, editTarget]);

  const filterPlantUnits = filterPlant ? units.filter((u) => u.plantCode === filterPlant) : [];

  const fetchRecords = useCallback(async () => {
    if (!filterPlant) return;
    setLoadingRecords(true); setRecordsError(null);
    try {
      const res = await hourlyThermalApi.getAll({
        plantCode: filterPlant, unitCode: filterUnit || undefined, date: filterDate || undefined,
      });
      setRecords(res.data);
    } catch { setRecordsError('Failed to load records.'); }
    finally { setLoadingRecords(false); }
  }, [filterPlant, filterUnit, filterDate]);

  const activeValue = (key: FormKey): string => {
    if (editTarget) return String(updateForm[key] ?? '');
    return String(form[key] ?? '');
  };

  const handleFieldChange = (key: FormKey, value: string) => {
    if (editTarget) setUpdateForm((prev) => ({ ...prev, [key]: value }));
    else setForm((prev) => ({ ...prev, [key]: value }));
  };

  // "Remove" just clears the value — the row stays visible since it mirrors a configured bearing/drain.
  const removeMetalRow = (code: number) =>
    setMetalRows((prev) => prev.map((r) => r.bearingCode === code ? { ...r, metalTemperature: '' } : r));

  const removeDrainRow = (code: number) =>
    setDrainRows((prev) => prev.map((r) => r.drainCode === code ? { ...r, drainTemperature: '' } : r));

  const openEdit = (row: HourlyThermalReading) => {
    setEditTarget(row); setSaveSuccess(false); setSaveError(null);
    const fields = (Object.keys(emptyForm) as FormKey[]).filter(
      (k) => !(['plantCode', 'unitCode', 'logDate', 'logHour'] as FormKey[]).includes(k)
    );
    const populated: Partial<CreateHourlyThermalReadingForm> = {};
    fields.forEach((f) => {
      const v = row[f as keyof HourlyThermalReading];
      (populated as Record<string, string>)[f] = v != null ? String(v) : '';
    });
    setUpdateForm(populated);
    pendingMetalRows.current = row.bearingMetalReadings ?? [];
    pendingDrainRows.current = row.bearingDrainReadings ?? [];
    setForm((prev) => ({
      ...prev, plantCode: row.plantCode, unitCode: row.unitCode,
      logDate: row.logDate.split('T')[0], logHour: row.logHour,
    }));
  };

  const cancelEdit = () => {
    setEditTarget(null); setUpdateForm({});
    setMetalRows([]); setDrainRows([]);
    pendingMetalRows.current = null; pendingDrainRows.current = null;
    setUnitDown(false);
  };

  const toNum = (v: string | number | undefined) => v === '' || v === undefined ? undefined : Number(v);

  const numericFieldKeys = (Object.keys(emptyForm) as FormKey[]).filter(
    (k): k is NumericFormKey => !(['plantCode', 'unitCode', 'logDate', 'logHour', 'remarks'] as FormKey[]).includes(k)
  );

  const handleUnitDownToggle = (checked: boolean) => {
    setUnitDown(checked);
    if (!checked) return;
    const zeroed: Record<string, string> = {};
    numericFieldKeys.forEach((k) => { zeroed[k] = '0'; });
    if (editTarget) setUpdateForm((prev) => ({ ...prev, ...zeroed }));
    else setForm((prev) => ({ ...prev, ...zeroed }));
    setMetalRows((prev) => prev.map((r) => ({ ...r, metalTemperature: '0' })));
    setDrainRows((prev) => prev.map((r) => ({ ...r, drainTemperature: '0' })));
  };

  const checkMissingHours = async (plantCode: string, unitCode: string, logDate: string) => {
    try {
      const res = await hourlyThermalApi.getAll({ plantCode, unitCode, date: logDate });
      const loggedHours = new Set(res.data.map((r) => r.logHour));
      const missing = HOURS.filter((h) => !loggedHours.has(h));
      setMissingHours(missing.length > 0 ? missing : null);
    } catch { /* non-critical — skip the missing-hours notice on failure */ }
  };

  const handleSave = async () => {
    setSaving(true); setSaveError(null); setSaveSuccess(false);
    const savedPlantCode = editTarget ? editTarget.plantCode : form.plantCode;
    const savedUnitCode = editTarget ? editTarget.unitCode : form.unitCode;
    const savedLogDate = editTarget ? editTarget.logDate.split('T')[0] : form.logDate;
    try {
      const bearingMetalReadings = metalRows
        .filter((r) => r.metalTemperature !== '' && !isNaN(Number(r.metalTemperature)))
        .map((r) => ({ bearingCode: r.bearingCode, metalTemperature: Number(r.metalTemperature) }));
      const bearingDrainReadings = drainRows
        .filter((r) => r.drainTemperature !== '' && !isNaN(Number(r.drainTemperature)))
        .map((r) => ({ drainCode: r.drainCode, drainTemperature: Number(r.drainTemperature) }));

      if (editTarget) {
        const payload: Record<string, unknown> = { bearingMetalReadings, bearingDrainReadings };
        numericFieldKeys.forEach((k) => { payload[k] = toNum(updateForm[k] as string); });
        payload.remarks = updateForm.remarks || undefined;
        await hourlyThermalApi.update(editTarget.id, payload);
        setEditTarget(null); setUpdateForm({});
      } else {
        const payload: Record<string, unknown> = {
          plantCode: form.plantCode, unitCode: form.unitCode,
          logDate: form.logDate, logHour: Number(form.logHour),
          bearingMetalReadings, bearingDrainReadings,
        };
        numericFieldKeys.forEach((k) => { payload[k] = toNum(form[k] as string); });
        payload.remarks = form.remarks || undefined;
        await hourlyThermalApi.create(payload);
        setForm(emptyForm);
      }
      setMetalRows([]); setDrainRows([]);
      setUnitDown(false);
      setSaveSuccess(true);
      fetchRecords();
      checkMissingHours(savedPlantCode, savedUnitCode, savedLogDate);
    } catch (err) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setSaveError(axiosErr.response?.data?.message ?? 'Failed to save. Please try again.');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await hourlyThermalApi.delete(deleteTarget.id);
      setDeleteTarget(null); fetchRecords();
    } catch { setRecordsError('Failed to delete record.'); }
    finally { setDeleting(false); }
  };

  const isFormValid = editTarget ? true : form.plantCode && form.unitCode && form.logDate && form.logHour !== '' && form.logHour !== undefined;
  const toggleSection = (title: string) => setCollapsed((prev) => ({ ...prev, [title]: !prev[title] }));
  const currentUnitCode = editTarget ? editTarget.unitCode : form.unitCode;

  // ── Plant type guard ─────────────────────────────────────────────────────────
  if (isWrongPlantType) return (
    <Box>
      <PageHeader
        title="Hourly Unit Readings — Thermal"
        subtitle="Record hourly operational parameters for thermal generating units"
        breadcrumbs={[{ label: 'Hourly Readings' }, { label: 'Unit Readings (Thermal)' }]}
      />
      <Alert severity="error" sx={{ mt: 2 }}
        action={<Button color="error" size="small" variant="outlined" onClick={() => navigate(-1)}>Go Back</Button>}>
        You do not have access to this page. Your plant assignment is hydro only.
      </Alert>
    </Box>
  );

  return (
    <Box>
      <PageHeader
        title="Hourly Unit Readings — Thermal"
        subtitle="Record hourly operational parameters for thermal generating units"
        breadcrumbs={[{ label: 'Hourly Readings' }, { label: 'Unit Readings (Thermal)' }]}
      />

      <Grid container spacing={3}>
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
                  {editTarget && <Chip label="Edit Mode" size="small" color="warning" onDelete={cancelEdit} />}
                </Stack>
              }
            />
            <Divider />
            <CardContent>
              {saveError && <Alert severity="error" onClose={() => setSaveError(null)} sx={{ mb: 2 }}>{saveError}</Alert>}
              {saveSuccess && <Alert severity="success" onClose={() => setSaveSuccess(false)} sx={{ mb: 2 }}>Reading saved successfully.</Alert>}
              {missingHours && missingHours.length > 0 && (
                <Alert severity="warning" onClose={() => setMissingHours(null)} sx={{ mb: 2 }}>
                  Missing hours today: {missingHours.map((h) => `${String(h).padStart(2, '0')}:00`).join(', ')}
                </Alert>
              )}

              <FormControlLabel
                sx={{ mb: 1.5 }}
                control={<Checkbox checked={unitDown} onChange={(e) => handleUnitDownToggle(e.target.checked)} color="error" />}
                label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Unit Down — zero out all readings for this hour</Typography>}
              />

              <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary"
                  sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                  Log Identity
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth required disabled={!!editTarget || plantLocked}>
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
                        {(editTarget ? units.filter((u) => u.plantCode === editTarget.plantCode) : filteredUnits).map((u) => (
                          <MenuItem key={u.id} value={u.unitCode}>{u.unitName} ({u.unitCode})</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Log Date" type="date"
                      value={editTarget ? editTarget.logDate?.split('T')[0] : form.logDate}
                      onChange={(e) => setForm((prev) => ({ ...prev, logDate: e.target.value }))}
                      fullWidth required disabled={!!editTarget}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth required disabled={!!editTarget || plantLocked}>
                      <InputLabel>Hour</InputLabel>
                      <Select label="Hour"
                        value={editTarget ? editTarget.logHour : form.logHour}
                        onChange={(e) => setForm((prev) => ({ ...prev, logHour: Number(e.target.value) }))}>
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
                    px: 2, py: 1.2, backgroundColor: `${section.color}14`,
                    borderBottom: collapsed[section.title] ? 'none' : '1px solid',
                    borderColor: 'divider',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
                  }} onClick={() => toggleSection(section.title)}>
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: section.color }}>
                        {section.title}
                      </Typography>
                      {'subtitle' in section && section.subtitle && (
                        <Typography variant="caption" color="text.disabled" sx={{ ml: 1 }}>— {section.subtitle}</Typography>
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
                            <TextField label={field.label} type="number" size="small" fullWidth
                              value={activeValue(field.key)}
                              onChange={(e) => handleFieldChange(field.key, e.target.value)}
                              slotProps={{ input: field.unit ? { endAdornment: <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5, whiteSpace: 'nowrap' }}>{field.unit}</Typography> } : undefined }}
                            />
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  </Collapse>
                </Paper>
              ))}

              {/* Bearing Metal Temperatures */}
              <Paper variant="outlined" sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
                <Box sx={{
                  px: 2, py: 1.2, backgroundColor: '#4A148C14',
                  borderBottom: collapsed['Bearing Metal Temperatures'] ? 'none' : '1px solid',
                  borderColor: 'divider',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
                }} onClick={() => toggleSection('Bearing Metal Temperatures')}>
                  <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1}>
                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#4A148C' }}>
                      Bearing Metal Temperatures
                    </Typography>
                    {metalRows.length > 0 && (
                      <Chip label={`${metalRows.filter((r) => r.metalTemperature !== '').length}/${metalRows.length}`} size="small" sx={{ height: 18, fontSize: 11, backgroundColor: '#4A148C22', color: '#4A148C' }} />
                    )}
                  </Stack>
                  <IconButton size="small">
                    {collapsed['Bearing Metal Temperatures'] ? <ExpandMore fontSize="small" /> : <ExpandLess fontSize="small" />}
                  </IconButton>
                </Box>
                <Collapse in={!collapsed['Bearing Metal Temperatures']}>
                  <Box sx={{ p: 2 }}>
                    {!currentUnitCode ? (
                      <Typography variant="body2" color="text.secondary">Select a unit to load bearings.</Typography>
                    ) : bearingMetals.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">No bearings configured for this unit.</Typography>
                    ) : (
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Bearing</TableCell>
                              <TableCell>Metal Temp (°C)</TableCell>
                              <TableCell width={40} />
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {metalRows.map((row) => (
                              <TableRow key={row.bearingCode}>
                                <TableCell>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>#{row.bearingCode} — {row.bearingName}</Typography>
                                </TableCell>
                                <TableCell>
                                  <TextField type="number" size="small" sx={{ width: 110 }}
                                    value={row.metalTemperature}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setMetalRows((prev) => prev.map((r) => r.bearingCode === row.bearingCode ? { ...r, metalTemperature: val } : r));
                                    }}
                                    slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">°C</Typography> } }}
                                  />
                                </TableCell>
                                <TableCell>
                                  {row.metalTemperature !== '' && (
                                    <Tooltip title="Clear (leave unrecorded)">
                                      <IconButton size="small" color="error" onClick={() => removeMetalRow(row.bearingCode)}>
                                        <Remove fontSize="small" />
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
                  </Box>
                </Collapse>
              </Paper>

              {/* Bearing Drain Temperatures */}
              <Paper variant="outlined" sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
                <Box sx={{
                  px: 2, py: 1.2, backgroundColor: '#00606414',
                  borderBottom: collapsed['Bearing Drain Temperatures'] ? 'none' : '1px solid',
                  borderColor: 'divider',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
                }} onClick={() => toggleSection('Bearing Drain Temperatures')}>
                  <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1}>
                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#006064' }}>
                      Bearing Drain Temperatures
                    </Typography>
                    {drainRows.length > 0 && (
                      <Chip label={`${drainRows.filter((r) => r.drainTemperature !== '').length}/${drainRows.length}`} size="small" sx={{ height: 18, fontSize: 11, backgroundColor: '#00606422', color: '#006064' }} />
                    )}
                  </Stack>
                  <IconButton size="small">
                    {collapsed['Bearing Drain Temperatures'] ? <ExpandMore fontSize="small" /> : <ExpandLess fontSize="small" />}
                  </IconButton>
                </Box>
                <Collapse in={!collapsed['Bearing Drain Temperatures']}>
                  <Box sx={{ p: 2 }}>
                    {!currentUnitCode ? (
                      <Typography variant="body2" color="text.secondary">Select a unit to load drains.</Typography>
                    ) : bearingDrains.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">No drains configured for this unit.</Typography>
                    ) : (
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Drain</TableCell>
                              <TableCell>Drain Temp (°C)</TableCell>
                              <TableCell>Temp Diff</TableCell>
                              <TableCell width={40} />
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {drainRows.map((row) => {
                              const matchingMetal = metalRows.find((m) => m.bearingCode === row.drainCode);
                              const diff = matchingMetal && matchingMetal.metalTemperature !== '' && row.drainTemperature !== ''
                                ? Number(matchingMetal.metalTemperature) - Number(row.drainTemperature) : null;
                              return (
                                <TableRow key={row.drainCode}>
                                  <TableCell>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>#{row.drainCode} — {row.drainName}</Typography>
                                  </TableCell>
                                  <TableCell>
                                    <TextField type="number" size="small" sx={{ width: 110 }}
                                      value={row.drainTemperature}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setDrainRows((prev) => prev.map((r) => r.drainCode === row.drainCode ? { ...r, drainTemperature: val } : r));
                                      }}
                                      slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">°C</Typography> } }}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    {diff != null ? (
                                      <Chip label={`${diff >= 0 ? '+' : ''}${diff.toFixed(1)} °C`} size="small"
                                        color={diff > 10 ? 'error' : diff > 5 ? 'warning' : 'success'} variant="outlined" />
                                    ) : (
                                      <Typography variant="caption" color="text.disabled">— no metal</Typography>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {row.drainTemperature !== '' && (
                                      <Tooltip title="Clear (leave unrecorded)">
                                        <IconButton size="small" color="error" onClick={() => removeDrainRow(row.drainCode)}>
                                          <Remove fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Box>
                </Collapse>
              </Paper>

              <TextField label="Remarks" value={activeValue('remarks')}
                onChange={(e) => handleFieldChange('remarks', e.target.value)}
                fullWidth multiline rows={2} placeholder="Optional remarks or observations..." />

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
                    onChange={(e) => { setFilterPlant(e.target.value); setFilterUnit(''); }} disabled={plantLocked}>
                    <MenuItem value="">Select plant…</MenuItem>
                    {availablePlants.map((p: PowerPlant) => <MenuItem key={p.id} value={p.plantCode}>{p.plantName}</MenuItem>)}
                  </Select>
                </FormControl>
                <Stack direction="row" spacing={1}>
                  <FormControl size="small" sx={{ flex: 1 }} disabled={!filterPlant}>
                    <InputLabel>Unit</InputLabel>
                    <Select label="Unit" value={filterUnit} onChange={(e) => setFilterUnit(e.target.value)}>
                      <MenuItem value="">All Units</MenuItem>
                      {filterPlantUnits.map((u) => <MenuItem key={u.id} value={u.unitCode}>{u.unitName}</MenuItem>)}
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
                        <TableCell>Bearings</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {records.map((row) => (
                        <TableRow key={row.id} selected={editTarget?.id === row.id} hover>
                          <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{row.unitCode}</Typography></TableCell>
                          <TableCell>
                            <Chip label={`${String(row.logHour).padStart(2, '0')}:00`} size="small" variant="outlined"
                              sx={{ fontFamily: 'monospace', fontWeight: 600 }} />
                          </TableCell>
                          <TableCell><Typography variant="body2">{row.genMW ?? '—'}</Typography></TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">
                              {row.bearingMetalReadings?.length ?? 0}M / {row.bearingDrainReadings?.length ?? 0}D
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

          {records.length > 0 && (
            <Card sx={{ mt: 2 }}>
              <CardContent sx={{ py: '12px !important' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }} color="text.secondary">
                  Day Summary — {filterDate}
                </Typography>
                <Stack direction="row" spacing={3} sx={{ mt: 1 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }} color="error.main">
                      {records.filter((r) => r.genMW != null).length > 0
                        ? (records.reduce((s, r) => s + (r.genMW ?? 0), 0) / records.filter(r => r.genMW != null).length).toFixed(1)
                        : '—'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Avg MW</Typography>
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }} color="success.main">
                      {records.filter((r) => r.genMW != null).length > 0
                        ? Math.max(...records.map((r) => r.genMW ?? 0)).toFixed(1)
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
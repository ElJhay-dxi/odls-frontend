import {
  Box, Card, CardContent, CardHeader, TextField, Button,
  CircularProgress, Alert, Typography, MenuItem, FormControl,
  InputLabel, Select, Grid, Divider, Chip, Stack, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, IconButton, Tooltip,
} from '@mui/material';
import {
  Save, Search, Edit, Delete, BarChart, History,
} from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { hourlySystemConditionApi } from '../../api/hourly/hourlySystemConditionApi';
import type { HourlySystemCondition, SystemConditionForm } from '../../types/hourlySystemCondition';

const HOURS = Array.from({ length: 24 }, (_, i) => i + 1);

// Station config — category used for colour coding only
const HYDRO_COLOR = '#1565C0';
const THERMAL_COLOR = '#B71C1C';
const SOLAR_COLOR = '#F9A825';
const LOAD_COLOR = '#6A1B9A';
const CIE_COLOR = '#37474F';

const STATIONS = [
  // Hydro
  { key: 'a1Gs', label: 'A1GS', category: 'Hydro', color: HYDRO_COLOR, mvarEnabled: true },
  { key: 'z19Gs', label: 'Z19GS', category: 'Hydro', color: HYDRO_COLOR, mvarEnabled: true },
  { key: 'bu54', label: 'BU54', category: 'Hydro', color: HYDRO_COLOR, mvarEnabled: true },
  // Thermal
  { key: 'tt32Tapco', label: 'TT32–TAPCO', category: 'Thermal', color: THERMAL_COLOR, mvarEnabled: true },
  { key: 'tt32Tico', label: 'TT32–TICO', category: 'Thermal', color: THERMAL_COLOR, mvarEnabled: true },
  { key: 'tp47', label: 'TP47', category: 'Thermal', color: THERMAL_COLOR, mvarEnabled: true },
  { key: 'cenit', label: 'CENIT', category: 'Thermal', color: THERMAL_COLOR, mvarEnabled: true },
  { key: 'am84', label: 'AM84', category: 'Thermal', color: THERMAL_COLOR, mvarEnabled: true },
  { key: 'asgliSg51', label: 'ASORGLI (SG51)', category: 'Thermal', color: THERMAL_COLOR, mvarEnabled: true },
  { key: 'at91', label: 'AT91', category: 'Thermal', color: THERMAL_COLOR, mvarEnabled: true },
  { key: 'ka77', label: 'KA77', category: 'Thermal', color: THERMAL_COLOR, mvarEnabled: true },
  { key: 'cp76', label: 'CP76', category: 'Thermal', color: THERMAL_COLOR, mvarEnabled: true },
  { key: 'ak79', label: 'AK79', category: 'Thermal', color: THERMAL_COLOR, mvarEnabled: true },
  // Solar
  { key: 'buiSolar', label: 'BUI Solar', category: 'Solar', color: SOLAR_COLOR, mvarEnabled: true },
  // Customer load
  { key: 'valco', label: 'VALCO', category: 'Load', color: LOAD_COLOR, mvarEnabled: false },
  // CIE
  { key: 'cie', label: 'CIE', category: 'CIE', color: CIE_COLOR, mvarEnabled: true },
];

const emptyForm: SystemConditionForm = {
  logDate: new Date().toISOString().split('T')[0],
  logHour: new Date().getHours() + 1,
  frequency: '',
  a1GsMW: '', a1GsMVar: '',
  z19GsMW: '', z19GsMVar: '',
  bu54MW: '', bu54MVar: '',
  tt32TapcoMW: '', tt32TapcoMVar: '',
  tt32TicoMW: '', tt32TicoMVar: '',
  tp47MW: '', tp47MVar: '',
  cenitMW: '', cenitMVar: '',
  am84MW: '', am84MVar: '',
  asgliSg51MW: '', asgliSg51MVar: '',
  at91MW: '', at91MVar: '',
  ka77MW: '', ka77MVar: '',
  cp76MW: '', cp76MVar: '',
  ak79MW: '', ak79MVar: '',
  buiSolarMW: '', buiSolarMVar: '',
  valcoMW: '',
  cieMW: '', cieMVar: '',
};

const toNum = (v: string | number | undefined) =>
  v === '' || v === undefined ? undefined : Number(v);

const sum = (...vals: unknown[]) =>
  vals.reduce<number>((acc, v) => acc + (Number(v) || 0), 0);

export default function HourlySystemConditionPage() {
  const [form, setForm] = useState<SystemConditionForm>(emptyForm);
  const [updateForm, setUpdateForm] = useState<Partial<SystemConditionForm>>({});
  const [editTarget, setEditTarget] = useState<HourlySystemCondition | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState<HourlySystemCondition[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<HourlySystemCondition | null>(null);
  const [deleting, setDeleting] = useState(false);

  const activeForm = editTarget
    ? (updateForm as unknown as Record<string, unknown>)
    : (form as unknown as Record<string, unknown>);

  const fv = (key: string) => String(activeForm[key] ?? '');
  const setField = (key: string, val: string) => {
    if (editTarget) setUpdateForm((prev) => ({ ...prev, [key]: val }));
    else setForm((prev) => ({ ...prev, [key]: val } as SystemConditionForm));
  };

  // Live-compute totals from current form values
  const liveHydroMW   = sum(activeForm.a1GsMW, activeForm.z19GsMW, activeForm.bu54MW);
  const liveHydroMVar = sum(activeForm.a1GsMVar, activeForm.z19GsMVar, activeForm.bu54MVar);
  const liveSolarMW   = sum(activeForm.buiSolarMW);
  const liveSolarMVar = sum(activeForm.buiSolarMVar);
  const liveThermalMW = sum(
    activeForm.tt32TapcoMW, activeForm.tt32TicoMW, activeForm.tp47MW,
    activeForm.cenitMW, activeForm.am84MW, activeForm.asgliSg51MW,
    activeForm.at91MW, activeForm.ka77MW, activeForm.cp76MW, activeForm.ak79MW
  );
  const liveThermalMVar = sum(
    activeForm.tt32TapcoMVar, activeForm.tt32TicoMVar, activeForm.tp47MVar,
    activeForm.cenitMVar, activeForm.am84MVar, activeForm.asgliSg51MVar,
    activeForm.at91MVar, activeForm.ka77MVar, activeForm.cp76MVar, activeForm.ak79MVar
  );
  const liveSystemMW   = liveHydroMW + liveSolarMW + liveThermalMW;
  const liveSystemMVar = liveHydroMVar + liveSolarMVar + liveThermalMVar;
  const liveGrandMW    = liveSystemMW - (Number(activeForm.cieMW) || 0);
  const liveGrandMVar  = liveSystemMVar - (Number(activeForm.cieMVar) || 0);

  const fetchRecords = useCallback(async () => {
    setLoadingRecords(true);
    setRecordsError(null);
    try {
      const res = await hourlySystemConditionApi.getAll(filterDate);
      setRecords(res.data);
    } catch {
      setRecordsError('Failed to load records.');
    } finally {
      setLoadingRecords(false);
    }
  }, [filterDate]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const openEdit = (row: HourlySystemCondition) => {
    setEditTarget(row);
    setSaveError(null);
    setSaveSuccess(false);
    setUpdateForm({
      frequency: row.frequency ?? '',
      a1GsMW: row.a1GsMW ?? '', a1GsMVar: row.a1GsMVar ?? '',
      z19GsMW: row.z19GsMW ?? '', z19GsMVar: row.z19GsMVar ?? '',
      bu54MW: row.bu54MW ?? '', bu54MVar: row.bu54MVar ?? '',
      tt32TapcoMW: row.tt32TapcoMW ?? '', tt32TapcoMVar: row.tt32TapcoMVar ?? '',
      tt32TicoMW: row.tt32TicoMW ?? '', tt32TicoMVar: row.tt32TicoMVar ?? '',
      tp47MW: row.tp47MW ?? '', tp47MVar: row.tp47MVar ?? '',
      cenitMW: row.cenitMW ?? '', cenitMVar: row.cenitMVar ?? '',
      am84MW: row.am84MW ?? '', am84MVar: row.am84MVar ?? '',
      asgliSg51MW: row.asgliSg51MW ?? '', asgliSg51MVar: row.asgliSg51MVar ?? '',
      at91MW: row.at91MW ?? '', at91MVar: row.at91MVar ?? '',
      ka77MW: row.ka77MW ?? '', ka77MVar: row.ka77MVar ?? '',
      cp76MW: row.cp76MW ?? '', cp76MVar: row.cp76MVar ?? '',
      ak79MW: row.ak79MW ?? '', ak79MVar: row.ak79MVar ?? '',
      buiSolarMW: row.buiSolarMW ?? '', buiSolarMVar: row.buiSolarMVar ?? '',
      valcoMW: row.valcoMW ?? '',
      cieMW: row.cieMW ?? '', cieMVar: row.cieMVar ?? '',
    });
  };

  const cancelEdit = () => { setEditTarget(null); setUpdateForm({}); };

  const buildPayload = (f: Record<string, unknown>) => ({
    frequency: toNum(f.frequency as string),
    a1GsMW: toNum(f.a1GsMW as string), a1GsMVar: toNum(f.a1GsMVar as string),
    z19GsMW: toNum(f.z19GsMW as string), z19GsMVar: toNum(f.z19GsMVar as string),
    bu54MW: toNum(f.bu54MW as string), bu54MVar: toNum(f.bu54MVar as string),
    tt32TapcoMW: toNum(f.tt32TapcoMW as string), tt32TapcoMVar: toNum(f.tt32TapcoMVar as string),
    tt32TicoMW: toNum(f.tt32TicoMW as string), tt32TicoMVar: toNum(f.tt32TicoMVar as string),
    tp47MW: toNum(f.tp47MW as string), tp47MVar: toNum(f.tp47MVar as string),
    cenitMW: toNum(f.cenitMW as string), cenitMVar: toNum(f.cenitMVar as string),
    am84MW: toNum(f.am84MW as string), am84MVar: toNum(f.am84MVar as string),
    asgliSg51MW: toNum(f.asgliSg51MW as string), asgliSg51MVar: toNum(f.asgliSg51MVar as string),
    at91MW: toNum(f.at91MW as string), at91MVar: toNum(f.at91MVar as string),
    ka77MW: toNum(f.ka77MW as string), ka77MVar: toNum(f.ka77MVar as string),
    cp76MW: toNum(f.cp76MW as string), cp76MVar: toNum(f.cp76MVar as string),
    ak79MW: toNum(f.ak79MW as string), ak79MVar: toNum(f.ak79MVar as string),
    buiSolarMW: toNum(f.buiSolarMW as string), buiSolarMVar: toNum(f.buiSolarMVar as string),
    valcoMW: toNum(f.valcoMW as string),
    cieMW: toNum(f.cieMW as string), cieMVar: toNum(f.cieMVar as string),
  });

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      if (editTarget) {
        await hourlySystemConditionApi.update(editTarget.id, buildPayload(updateForm as Record<string, unknown>));
        cancelEdit();
      } else {
        await hourlySystemConditionApi.create({
          logDate: form.logDate,
          logHour: Number(form.logHour),
          ...buildPayload(form as unknown as Record<string, unknown>),
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
      await hourlySystemConditionApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchRecords();
    } catch {
      setRecordsError('Failed to delete record.');
    } finally {
      setDeleting(false);
    }
  };

  const isFormValid = editTarget ? true : form.logDate && form.logHour;

  const TotalRow = ({ label, mw, mvar, bold = false, color = 'text.primary' }: {
    label: string; mw: number; mvar: number; bold?: boolean; color?: string;
  }) => (
    <TableRow sx={{ backgroundColor: bold ? 'action.hover' : undefined }}>
      <TableCell sx={{ fontWeight: bold ? 700 : 400, color, fontSize: '0.8rem' }}>{label}</TableCell>
      <TableCell sx={{ fontWeight: bold ? 700 : 400, color, fontSize: '0.8rem', textAlign: 'right' }}>
        {mw.toFixed(1)}
      </TableCell>
      <TableCell sx={{ fontWeight: bold ? 700 : 400, color, fontSize: '0.8rem', textAlign: 'right' }}>
        {mvar.toFixed(1)}
      </TableCell>
    </TableRow>
  );

  return (
    <Box>
      <PageHeader
        title="Hourly System Conditions"
        subtitle="Grid-wide hourly MW and MVar readings entered by AGS"
        breadcrumbs={[{ label: 'Hourly Readings' }, { label: 'System Conditions' }]}
      />

      <Grid container spacing={3}>
        {/* ── Left: Entry form ── */}
        <Grid size={{ xs: 12, lg: 7 }}>
          <Card>
            <CardHeader
              title={
                <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1.5}>
                  <BarChart sx={{ color: '#1565C0' }} />
                  <Typography sx={{ fontWeight: 700 }}>
                    {editTarget
                      ? `Editing: ${editTarget.logDate?.split('T')[0]} Hour ${editTarget.logHour}`
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
                <Typography variant="caption" color="text.secondary"
                  sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                  Log Identity
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      label="Log Date" type="date" fullWidth required
                      value={editTarget ? editTarget.logDate?.split('T')[0] : form.logDate}
                      onChange={(e) => setForm((prev) => ({ ...prev, logDate: e.target.value }))}
                      disabled={!!editTarget}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
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
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      label="Frequency" type="number" fullWidth
                      value={fv('frequency')}
                      onChange={(e) => setField('frequency', e.target.value)}
                      slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">Hz</Typography> } }}
                    />
                  </Grid>
                </Grid>
              </Paper>

              {/* Station readings table */}
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 700, width: '40%' }}>Station</TableCell>
                      <TableCell sx={{ fontWeight: 700, width: '30%' }}>MW</TableCell>
                      <TableCell sx={{ fontWeight: 700, width: '30%' }}>MVar</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {STATIONS.map((s, idx) => {
                      const mwKey = `${s.key}MW`;
                      const mvarKey = `${s.key}MVar`;
                      const isDivider = idx > 0 && STATIONS[idx - 1].category !== s.category;
                      return (
                        <TableRow key={s.key} sx={{ borderTop: isDivider ? '2px solid' : undefined, borderColor: 'divider' }}>
                          <TableCell>
                            <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1}>
                              <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: s.color, flexShrink: 0 }} />
                              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{s.label}</Typography>
                              <Chip label={s.category} size="small"
                                sx={{ height: 16, fontSize: 10, backgroundColor: `${s.color}20`, color: s.color, fontWeight: 600 }} />
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <TextField
                              type="number" size="small" fullWidth
                              value={fv(mwKey)}
                              onChange={(e) => setField(mwKey, e.target.value)}
                              slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>MW</Typography> } }}
                              sx={{ '& .MuiInputBase-input': { fontSize: '0.8rem', py: 0.5 } }}
                            />
                          </TableCell>
                          <TableCell>
                            {s.mvarEnabled ? (
                              <TextField
                                type="number" size="small" fullWidth
                                value={fv(mvarKey)}
                                onChange={(e) => setField(mvarKey, e.target.value)}
                                slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>MVar</Typography> } }}
                                sx={{ '& .MuiInputBase-input': { fontSize: '0.8rem', py: 0.5 } }}
                              />
                            ) : (
                              <Typography variant="caption" color="text.disabled">MW only</Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              <Stack direction="row" sx={{ mt: 2.5, alignItems: 'center' }} spacing={1.5}>
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

        {/* ── Right: Live totals + records ── */}
        <Grid size={{ xs: 12, lg: 5 }}>
          {/* Live totals */}
          <Card sx={{ mb: 2 }}>
            <CardHeader
              title={<Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>Live Totals</Typography>}
              sx={{ pb: 0 }}
            />
            <Divider />
            <CardContent sx={{ pt: 1 }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Category</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', textAlign: 'right' }}>MW</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', textAlign: 'right' }}>MVar</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TotalRow label="Total Hydro" mw={liveHydroMW} mvar={liveHydroMVar} color={HYDRO_COLOR} />
                    <TotalRow label="Total Solar" mw={liveSolarMW} mvar={liveSolarMVar} color={SOLAR_COLOR} />
                    <TotalRow label="Total Thermal" mw={liveThermalMW} mvar={liveThermalMVar} color={THERMAL_COLOR} />
                    <TotalRow label="Total System" mw={liveSystemMW} mvar={liveSystemMVar} bold />
                    <TotalRow label="CIE" mw={Number(activeForm.cieMW) || 0} mvar={Number(activeForm.cieMVar) || 0} color={CIE_COLOR} />
                    <TotalRow label="Grand Total (System − CIE)" mw={liveGrandMW} mvar={liveGrandMVar} bold color="primary.main" />
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {/* Records */}
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
                <TextField
                  label="Date" type="date" size="small" value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  sx={{ flex: 1 }}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <Button
                  variant="outlined" size="small"
                  startIcon={loadingRecords ? <CircularProgress size={14} /> : <Search />}
                  onClick={fetchRecords}
                  disabled={loadingRecords}
                >
                  {loadingRecords ? 'Loading...' : 'Load'}
                </Button>
              </Stack>

              {recordsError && (
                <Alert severity="error" onClose={() => setRecordsError(null)} sx={{ mb: 1.5 }}>{recordsError}</Alert>
              )}

              {records.length === 0 && !loadingRecords ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <BarChart sx={{ fontSize: '2rem', color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">No records for selected date.</Typography>
                </Box>
              ) : (
                <TableContainer sx={{ maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Hour</TableCell>
                        <TableCell>Freq (Hz)</TableCell>
                        <TableCell>System MW</TableCell>
                        <TableCell>Grand Total</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {records.map((row) => (
                        <TableRow key={row.id} selected={editTarget?.id === row.id} hover>
                          <TableCell>
                            <Chip
                              label={`${String(row.logHour).padStart(2, '0')}:00`}
                              size="small" variant="outlined"
                              sx={{ fontFamily: 'monospace', fontWeight: 600 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{row.frequency ?? '—'}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {row.totalSystemMW?.toFixed(1) ?? '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="primary.main" sx={{ fontWeight: 700 }}>
                              {row.grandTotalMW?.toFixed(1) ?? '—'}
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
        </Grid>
      </Grid>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Record"
        message={`Delete system condition for ${deleteTarget?.logDate?.split('T')[0]} hour ${deleteTarget?.logHour}?`}
        confirmLabel="Delete" loading={deleting}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
import {
  Box, Card, CardContent, TextField, Button,
  CircularProgress, Alert, Typography, MenuItem, FormControl,
  InputLabel, Select, Grid, Chip, Stack, Paper, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tooltip, Collapse,
} from '@mui/material';
import {
  Save, Search, Edit, Delete, History, ExpandMore, ExpandLess,
  LocalGasStation, LocalFireDepartment, OilBarrel,
} from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { plantUnitApi } from '../../api/masterData/plantUnitApi';
import { dailyLcoReadingApi } from '../../api/daily/dailyLcoReadingApi';
import { dailyDfoReadingApi } from '../../api/daily/dailyDfoReadingApi';
import { dailyNaturalGasTurbineApi } from '../../api/daily/dailyNaturalGasTurbineApi';
import { dailyNaturalGasChromatographApi } from '../../api/daily/dailyNaturalGasChromatographApi';
import type { PowerPlant, PlantUnit } from '../../types/masterData';
import type { DailyLcoReading } from '../../types/dailyLcoReading';
import type { DailyDfoReading } from '../../types/dailyDfoReading';
import type { DailyNaturalGasTurbine } from '../../types/dailyNaturalGasTurbine';
import type { DailyNaturalGasChromatograph } from '../../types/dailyNaturalGasChromatograph';
import { useSectionPermissions, usePlantFilter } from '../../hooks/usePermission';
import { usePlantTypeGuard } from '../../hooks/usePlantTypeGuard';

const today = new Date().toISOString().split('T')[0];
const fmt = (v?: number | null, dec = 2) => v != null ? v.toFixed(dec) : '—';

const NOT_CONFIGURED_MESSAGE =
  "This fuel type is not configured for the selected plant's units. You may still record readings if applicable.";

// ─── Shared section chrome ──────────────────────────────────────────────────

interface SectionBaseProps {
  plantCode: string;
  logDate: string;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  configured: boolean;
  collapsed: boolean;
  onToggle: () => void;
}

interface UnitSectionProps extends SectionBaseProps {
  units: PlantUnit[];
}

function SectionHeader({ title, accentColor, configured, collapsed, onToggle }: {
  title: string; accentColor: string; configured: boolean; collapsed: boolean; onToggle: () => void;
}) {
  return (
    <Box sx={{
      px: 2.5, py: 1.5,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      cursor: 'pointer',
      backgroundColor: `${accentColor}14`,
      borderBottom: collapsed ? 'none' : '1px solid',
      borderColor: 'divider',
    }} onClick={onToggle}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: accentColor }}>
          {title}
        </Typography>
        {!configured && (
          <Chip label="Not configured" size="small" variant="outlined" sx={{ fontSize: 10, color: 'text.secondary', borderColor: 'divider' }} />
        )}
      </Stack>
      <IconButton size="small">{collapsed ? <ExpandMore /> : <ExpandLess />}</IconButton>
    </Box>
  );
}

function NotConfiguredNote() {
  return (
    <Alert severity="info" variant="outlined" sx={{ mb: 2.5 }}>
      {NOT_CONFIGURED_MESSAGE}
    </Alert>
  );
}

// ─── Natural Gas (Turbine) ──────────────────────────────────────────────────

function GasTurbineSection({
  plantCode, logDate, units, canCreate, canEdit, canDelete, configured, collapsed, onToggle,
}: UnitSectionProps) {
  const accentColor = '#4A148C';

  const [gasTurbineUnitCode, setGasTurbineUnitCode] = useState('');
  const [gasTurbineForm, setGasTurbineForm] = useState({ logTime: '', currentReading: '', heatingValue: '' });
  const [gasTurbineUpdateForm, setGasTurbineUpdateForm] = useState<{ logTime?: string; currentReading?: string; heatingValue?: string }>({});
  const [gasTurbineEditTarget, setGasTurbineEditTarget] = useState<DailyNaturalGasTurbine | null>(null);

  const [gasTurbinePriorRecord, setGasTurbinePriorRecord] = useState<DailyNaturalGasTurbine | null>(null);
  const [gasTurbineLoadingPrior, setGasTurbineLoadingPrior] = useState(false);

  const [gasTurbineSaving, setGasTurbineSaving] = useState(false);
  const [gasTurbineError, setGasTurbineError] = useState<string | null>(null);
  const [gasTurbineSuccess, setGasTurbineSuccess] = useState(false);

  const [gasTurbineFilterUnit, setGasTurbineFilterUnit] = useState('');
  const [gasTurbineRecords, setGasTurbineRecords] = useState<DailyNaturalGasTurbine[]>([]);
  const [gasTurbineLoadingRecords, setGasTurbineLoadingRecords] = useState(false);
  const [gasTurbineRecordsError, setGasTurbineRecordsError] = useState<string | null>(null);

  const [gasTurbineDeleteTarget, setGasTurbineDeleteTarget] = useState<DailyNaturalGasTurbine | null>(null);
  const [gasTurbineDeleting, setGasTurbineDeleting] = useState(false);

  useEffect(() => { setGasTurbineUnitCode(''); }, [plantCode]);

  useEffect(() => {
    if (gasTurbineEditTarget || !plantCode || !gasTurbineUnitCode || !logDate) {
      setGasTurbinePriorRecord(null);
      return;
    }
    setGasTurbineLoadingPrior(true);
    dailyNaturalGasTurbineApi.getAll({ plantCode, unitCode: gasTurbineUnitCode })
      .then((res) => {
        const prior = res.data
          .filter((r) => r.logDate.split('T')[0] < logDate)
          .sort((a, b) => b.logDate.localeCompare(a.logDate))[0];
        setGasTurbinePriorRecord(prior ?? null);
      })
      .catch(() => setGasTurbinePriorRecord(null))
      .finally(() => setGasTurbineLoadingPrior(false));
  }, [plantCode, gasTurbineUnitCode, logDate, gasTurbineEditTarget]);

  const fetchGasTurbineRecords = useCallback(async () => {
    if (!plantCode) { setGasTurbineRecords([]); return; }
    setGasTurbineLoadingRecords(true);
    setGasTurbineRecordsError(null);
    try {
      const res = await dailyNaturalGasTurbineApi.getAll({ plantCode, unitCode: gasTurbineFilterUnit || undefined });
      setGasTurbineRecords(res.data.sort((a, b) => b.logDate.localeCompare(a.logDate)));
    } catch {
      setGasTurbineRecordsError('Failed to load records.');
    } finally {
      setGasTurbineLoadingRecords(false);
    }
  }, [plantCode, gasTurbineFilterUnit]);

  useEffect(() => { fetchGasTurbineRecords(); }, [fetchGasTurbineRecords]);

  const previewPrevious = gasTurbineEditTarget ? gasTurbineEditTarget.previousReading : (gasTurbinePriorRecord?.currentReading ?? 0);
  const previewPriorProgressive = gasTurbineEditTarget
    ? gasTurbineEditTarget.progressiveTotal - gasTurbineEditTarget.difference
    : (gasTurbinePriorRecord?.progressiveTotal ?? 0);
  const currentVal = Number(gasTurbineEditTarget ? gasTurbineUpdateForm.currentReading : gasTurbineForm.currentReading) || 0;
  const hvVal = Number(gasTurbineEditTarget ? gasTurbineUpdateForm.heatingValue : gasTurbineForm.heatingValue) || 0;
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

  const openEdit = (row: DailyNaturalGasTurbine) => {
    setGasTurbineEditTarget(row);
    setGasTurbineError(null);
    setGasTurbineSuccess(false);
    setGasTurbineUpdateForm({
      logTime: row.logTime ?? '',
      currentReading: String(row.currentReading),
      heatingValue: String(row.heatingValue),
    });
  };

  const cancelEdit = () => { setGasTurbineEditTarget(null); setGasTurbineUpdateForm({}); };

  const handleSave = async () => {
    setGasTurbineSaving(true);
    setGasTurbineError(null);
    setGasTurbineSuccess(false);
    try {
      if (gasTurbineEditTarget) {
        await dailyNaturalGasTurbineApi.update(gasTurbineEditTarget.id, {
          logTime: gasTurbineUpdateForm.logTime || undefined,
          currentReading: Number(gasTurbineUpdateForm.currentReading),
          heatingValue: Number(gasTurbineUpdateForm.heatingValue),
        });
        cancelEdit();
      } else {
        await dailyNaturalGasTurbineApi.create({
          plantCode, unitCode: gasTurbineUnitCode,
          logDate, logTime: gasTurbineForm.logTime || undefined,
          currentReading: Number(gasTurbineForm.currentReading),
          heatingValue: Number(gasTurbineForm.heatingValue),
        });
        setGasTurbineForm({ logTime: '', currentReading: '', heatingValue: '' });
      }
      setGasTurbineSuccess(true);
      fetchGasTurbineRecords();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setGasTurbineError(msg ?? 'Failed to save. Please try again.');
    } finally {
      setGasTurbineSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!gasTurbineDeleteTarget) return;
    setGasTurbineDeleting(true);
    try {
      await dailyNaturalGasTurbineApi.delete(gasTurbineDeleteTarget.id);
      setGasTurbineDeleteTarget(null);
      fetchGasTurbineRecords();
    } catch {
      setGasTurbineRecordsError('Failed to delete record.');
    } finally {
      setGasTurbineDeleting(false);
    }
  };

  const isFormValid = gasTurbineEditTarget
    ? gasTurbineUpdateForm.currentReading !== '' && gasTurbineUpdateForm.heatingValue !== ''
    : !!gasTurbineUnitCode && gasTurbineForm.currentReading !== '' && gasTurbineForm.heatingValue !== '';

  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <SectionHeader title="Natural Gas (Turbine)" accentColor={accentColor} configured={configured} collapsed={collapsed} onToggle={onToggle} />
      <Collapse in={!collapsed} timeout="auto" unmountOnExit>
        <CardContent>
          {!configured && <NotConfiguredNote />}
          {gasTurbineError && <Alert severity="error" onClose={() => setGasTurbineError(null)} sx={{ mb: 2 }}>{gasTurbineError}</Alert>}
          {gasTurbineSuccess && <Alert severity="success" onClose={() => setGasTurbineSuccess(false)} sx={{ mb: 2 }}>Reading saved successfully.</Alert>}

          <Grid container spacing={3}>
            {/* ── Entry form ── */}
            <Grid size={{ xs: 12, lg: 6 }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
                <LocalFireDepartment sx={{ color: accentColor }} />
                <Typography sx={{ fontWeight: 700 }}>
                  {gasTurbineEditTarget
                    ? `Editing: ${gasTurbineEditTarget.unitCode} — ${gasTurbineEditTarget.logDate?.split('T')[0]}`
                    : 'New Daily Reading'}
                </Typography>
                {gasTurbineEditTarget && <Chip label="Edit Mode" size="small" color="warning" onDelete={cancelEdit} />}
              </Stack>

              <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary"
                  sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                  Log Identity
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
                  Plant: <b>{plantCode}</b> &nbsp;·&nbsp; Log Date: <b>{gasTurbineEditTarget ? gasTurbineEditTarget.logDate?.split('T')[0] : logDate}</b>
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth required disabled={!!gasTurbineEditTarget}>
                      <InputLabel>Unit</InputLabel>
                      <Select label="Unit"
                        value={gasTurbineEditTarget ? gasTurbineEditTarget.unitCode : gasTurbineUnitCode}
                        onChange={(e) => setGasTurbineUnitCode(e.target.value)}>
                        {units.map((u) => (
                          <MenuItem key={u.id} value={u.unitCode}>{u.unitName} ({u.unitCode})</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Log Time" type="time" fullWidth
                      value={gasTurbineEditTarget ? (gasTurbineUpdateForm.logTime ?? '') : gasTurbineForm.logTime}
                      onChange={(e) => {
                        if (gasTurbineEditTarget) setGasTurbineUpdateForm((prev) => ({ ...prev, logTime: e.target.value }));
                        else setGasTurbineForm((prev) => ({ ...prev, logTime: e.target.value }));
                      }}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid>
                </Grid>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary"
                  sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                  Meter Readings
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Previous Reading" fullWidth disabled
                      value={gasTurbineLoadingPrior ? '…' : previewPrevious.toFixed(2)}
                      helperText="Auto-carried from prior day (same plant + unit)"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Current Reading" type="number" fullWidth required
                      value={gasTurbineEditTarget ? (gasTurbineUpdateForm.currentReading ?? '') : gasTurbineForm.currentReading}
                      onChange={(e) => {
                        if (gasTurbineEditTarget) setGasTurbineUpdateForm((prev) => ({ ...prev, currentReading: e.target.value }));
                        else setGasTurbineForm((prev) => ({ ...prev, currentReading: e.target.value }));
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Heating Value (LHV)" type="number" fullWidth required
                      value={gasTurbineEditTarget ? (gasTurbineUpdateForm.heatingValue ?? '') : gasTurbineForm.heatingValue}
                      onChange={(e) => {
                        if (gasTurbineEditTarget) setGasTurbineUpdateForm((prev) => ({ ...prev, heatingValue: e.target.value }));
                        else setGasTurbineForm((prev) => ({ ...prev, heatingValue: e.target.value }));
                      }}
                      helperText="BTU/scf"
                      slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">BTU/scf</Typography> } }}
                    />
                  </Grid>
                </Grid>
              </Paper>

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
                    { label: 'Heat Rate LHV (kJ/kWh)', value: fmt(previewLhvKj) },
                    { label: 'Heat Rate LHV (Btu/kWh)', value: fmt(previewLhvBtu) },
                    { label: 'Heat Rate HHV (kJ/kWh)', value: fmt(previewHhvKj) },
                    { label: 'Heat Rate HHV (Btu/kWh)', value: fmt(previewHhvBtu) },
                  ].map(({ label, value }) => (
                    <Grid key={label} size={{ xs: 6, sm: 4 }}>
                      <Typography variant="caption" color="text.secondary">{label}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{value}</Typography>
                    </Grid>
                  ))}
                </Grid>
              </Paper>

              <Stack direction="row" spacing={1.5}>
                {gasTurbineEditTarget && <Button variant="outlined" onClick={cancelEdit} disabled={gasTurbineSaving}>Cancel</Button>}
                {(gasTurbineEditTarget ? canEdit : canCreate) && (
                  <Button variant="contained" onClick={handleSave}
                    disabled={gasTurbineSaving || !isFormValid}
                    startIcon={gasTurbineSaving ? <CircularProgress size={16} color="inherit" /> : <Save />}
                    sx={{ minWidth: 140 }}>
                    {gasTurbineSaving ? 'Saving...' : gasTurbineEditTarget ? 'Update Reading' : 'Save Reading'}
                  </Button>
                )}
              </Stack>
            </Grid>

            {/* ── Records ── */}
            <Grid size={{ xs: 12, lg: 6 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
                <History sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
                <Typography sx={{ fontWeight: 700 }}>Logged Readings</Typography>
              </Stack>

              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>Unit</InputLabel>
                  <Select label="Unit" value={gasTurbineFilterUnit} onChange={(e) => setGasTurbineFilterUnit(e.target.value)}>
                    <MenuItem value="">All Units</MenuItem>
                    {units.map((u) => (
                      <MenuItem key={u.id} value={u.unitCode}>{u.unitName}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button variant="outlined" size="small"
                  startIcon={gasTurbineLoadingRecords ? <CircularProgress size={14} /> : <Search />}
                  onClick={fetchGasTurbineRecords} disabled={gasTurbineLoadingRecords}>
                  {gasTurbineLoadingRecords ? 'Loading...' : 'Load'}
                </Button>
              </Stack>

              {gasTurbineRecordsError && <Alert severity="error" onClose={() => setGasTurbineRecordsError(null)} sx={{ mb: 1.5 }}>{gasTurbineRecordsError}</Alert>}

              {gasTurbineRecords.length === 0 && !gasTurbineLoadingRecords ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <LocalFireDepartment sx={{ fontSize: '2rem', color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">No records found.</Typography>
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
                      {gasTurbineRecords.map((row) => (
                        <TableRow key={row.id} selected={gasTurbineEditTarget?.id === row.id} hover>
                          <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{row.logDate.split('T')[0]}</Typography></TableCell>
                          <TableCell><Chip label={row.unitCode} size="small" variant="outlined" sx={{ fontWeight: 700 }} /></TableCell>
                          <TableCell><Typography variant="body2">{row.difference.toFixed(1)}</Typography></TableCell>
                          <TableCell><Typography variant="body2">{row.consumptionMMscf.toFixed(4)}</Typography></TableCell>
                          <TableCell><Typography variant="body2">{row.heatRateLhvBtuKwh != null ? row.heatRateLhvBtuKwh.toFixed(0) : '—'}</Typography></TableCell>
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
                                <IconButton size="small" color="error" onClick={() => setGasTurbineDeleteTarget(row)}>
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
            </Grid>
          </Grid>
        </CardContent>
      </Collapse>

      <ConfirmDialog
        open={!!gasTurbineDeleteTarget}
        title="Delete Reading"
        message={`Delete natural gas turbine reading for ${gasTurbineDeleteTarget?.unitCode} on ${gasTurbineDeleteTarget?.logDate?.split('T')[0]}? This will recompute the chain for any later readings.`}
        confirmLabel="Delete" loading={gasTurbineDeleting}
        onConfirm={handleDelete} onCancel={() => setGasTurbineDeleteTarget(null)}
      />
    </Card>
  );
}

// ─── Natural Gas (Flow Computer) ────────────────────────────────────────────

function FlowComputerSection({
  plantCode, logDate, units, canCreate, canEdit, canDelete, configured, collapsed, onToggle,
}: UnitSectionProps) {
  const accentColor = '#6A1B9A';

  const [flowComputerUnitCode, setFlowComputerUnitCode] = useState('');
  const [flowComputerForm, setFlowComputerForm] = useState({ logTime: '', readingMMscf: '', heatingValue: '' });
  const [flowComputerUpdateForm, setFlowComputerUpdateForm] = useState<{ logTime?: string; readingMMscf?: string; heatingValue?: string }>({});
  const [flowComputerEditTarget, setFlowComputerEditTarget] = useState<DailyNaturalGasChromatograph | null>(null);

  const [flowComputerPriorRecord, setFlowComputerPriorRecord] = useState<DailyNaturalGasChromatograph | null>(null);
  const [flowComputerLoadingPrior, setFlowComputerLoadingPrior] = useState(false);

  const [flowComputerSaving, setFlowComputerSaving] = useState(false);
  const [flowComputerError, setFlowComputerError] = useState<string | null>(null);
  const [flowComputerSuccess, setFlowComputerSuccess] = useState(false);

  const [flowComputerFilterUnit, setFlowComputerFilterUnit] = useState('');
  const [flowComputerRecords, setFlowComputerRecords] = useState<DailyNaturalGasChromatograph[]>([]);
  const [flowComputerLoadingRecords, setFlowComputerLoadingRecords] = useState(false);
  const [flowComputerRecordsError, setFlowComputerRecordsError] = useState<string | null>(null);

  const [flowComputerDeleteTarget, setFlowComputerDeleteTarget] = useState<DailyNaturalGasChromatograph | null>(null);
  const [flowComputerDeleting, setFlowComputerDeleting] = useState(false);

  useEffect(() => { setFlowComputerUnitCode(''); }, [plantCode]);

  useEffect(() => {
    if (flowComputerEditTarget || !plantCode || !flowComputerUnitCode || !logDate) {
      setFlowComputerPriorRecord(null);
      return;
    }
    setFlowComputerLoadingPrior(true);
    dailyNaturalGasChromatographApi.getAll({ plantCode, unitCode: flowComputerUnitCode })
      .then((res) => {
        const prior = res.data
          .filter((r) => r.logDate.split('T')[0] < logDate)
          .sort((a, b) => b.logDate.localeCompare(a.logDate))[0];
        setFlowComputerPriorRecord(prior ?? null);
      })
      .catch(() => setFlowComputerPriorRecord(null))
      .finally(() => setFlowComputerLoadingPrior(false));
  }, [plantCode, flowComputerUnitCode, logDate, flowComputerEditTarget]);

  const fetchFlowComputerRecords = useCallback(async () => {
    if (!plantCode) { setFlowComputerRecords([]); return; }
    setFlowComputerLoadingRecords(true);
    setFlowComputerRecordsError(null);
    try {
      const res = await dailyNaturalGasChromatographApi.getAll({ plantCode, unitCode: flowComputerFilterUnit || undefined });
      setFlowComputerRecords(res.data.sort((a, b) => b.logDate.localeCompare(a.logDate)));
    } catch {
      setFlowComputerRecordsError('Failed to load records.');
    } finally {
      setFlowComputerLoadingRecords(false);
    }
  }, [plantCode, flowComputerFilterUnit]);

  useEffect(() => { fetchFlowComputerRecords(); }, [fetchFlowComputerRecords]);

  const previewPriorTotal = flowComputerEditTarget
    ? flowComputerEditTarget.progressiveTotal - flowComputerEditTarget.readingMMscf
    : (flowComputerPriorRecord?.progressiveTotal ?? 0);
  const readingVal = Number(flowComputerEditTarget ? flowComputerUpdateForm.readingMMscf : flowComputerForm.readingMMscf) || 0;
  const hvVal = Number(flowComputerEditTarget ? flowComputerUpdateForm.heatingValue : flowComputerForm.heatingValue) || 0;
  const previewProgressive = previewPriorTotal + readingVal;
  const previewMMBtu = readingVal * hvVal;

  const openEdit = (row: DailyNaturalGasChromatograph) => {
    setFlowComputerEditTarget(row);
    setFlowComputerError(null);
    setFlowComputerSuccess(false);
    setFlowComputerUpdateForm({
      logTime: row.logTime ?? '',
      readingMMscf: String(row.readingMMscf),
      heatingValue: String(row.heatingValue),
    });
  };

  const cancelEdit = () => { setFlowComputerEditTarget(null); setFlowComputerUpdateForm({}); };

  const handleSave = async () => {
    setFlowComputerSaving(true);
    setFlowComputerError(null);
    setFlowComputerSuccess(false);
    try {
      if (flowComputerEditTarget) {
        await dailyNaturalGasChromatographApi.update(flowComputerEditTarget.id, {
          logTime: flowComputerUpdateForm.logTime || undefined,
          readingMMscf: Number(flowComputerUpdateForm.readingMMscf),
          heatingValue: Number(flowComputerUpdateForm.heatingValue),
        });
        cancelEdit();
      } else {
        await dailyNaturalGasChromatographApi.create({
          plantCode, unitCode: flowComputerUnitCode,
          logDate, logTime: flowComputerForm.logTime || undefined,
          readingMMscf: Number(flowComputerForm.readingMMscf),
          heatingValue: Number(flowComputerForm.heatingValue),
        });
        setFlowComputerForm({ logTime: '', readingMMscf: '', heatingValue: '' });
      }
      setFlowComputerSuccess(true);
      fetchFlowComputerRecords();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFlowComputerError(msg ?? 'Failed to save. Please try again.');
    } finally {
      setFlowComputerSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!flowComputerDeleteTarget) return;
    setFlowComputerDeleting(true);
    try {
      await dailyNaturalGasChromatographApi.delete(flowComputerDeleteTarget.id);
      setFlowComputerDeleteTarget(null);
      fetchFlowComputerRecords();
    } catch {
      setFlowComputerRecordsError('Failed to delete record.');
    } finally {
      setFlowComputerDeleting(false);
    }
  };

  const isFormValid = flowComputerEditTarget
    ? flowComputerUpdateForm.readingMMscf !== '' && flowComputerUpdateForm.heatingValue !== ''
    : !!flowComputerUnitCode && flowComputerForm.readingMMscf !== '' && flowComputerForm.heatingValue !== '';

  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <SectionHeader title="Natural Gas (Flow Computer)" accentColor={accentColor} configured={configured} collapsed={collapsed} onToggle={onToggle} />
      <Collapse in={!collapsed} timeout="auto" unmountOnExit>
        <CardContent>
          {!configured && <NotConfiguredNote />}
          {flowComputerError && <Alert severity="error" onClose={() => setFlowComputerError(null)} sx={{ mb: 2 }}>{flowComputerError}</Alert>}
          {flowComputerSuccess && <Alert severity="success" onClose={() => setFlowComputerSuccess(false)} sx={{ mb: 2 }}>Reading saved successfully.</Alert>}

          <Grid container spacing={3}>
            {/* ── Entry form ── */}
            <Grid size={{ xs: 12, lg: 6 }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
                <LocalFireDepartment sx={{ color: accentColor }} />
                <Typography sx={{ fontWeight: 700 }}>
                  {flowComputerEditTarget
                    ? `Editing: ${flowComputerEditTarget.unitCode} — ${flowComputerEditTarget.logDate?.split('T')[0]}`
                    : 'New Daily Reading'}
                </Typography>
                {flowComputerEditTarget && <Chip label="Edit Mode" size="small" color="warning" onDelete={cancelEdit} />}
              </Stack>

              <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary"
                  sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                  Log Identity
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
                  Plant: <b>{plantCode}</b> &nbsp;·&nbsp; Log Date: <b>{flowComputerEditTarget ? flowComputerEditTarget.logDate?.split('T')[0] : logDate}</b>
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth required disabled={!!flowComputerEditTarget}>
                      <InputLabel>Unit</InputLabel>
                      <Select label="Unit"
                        value={flowComputerEditTarget ? flowComputerEditTarget.unitCode : flowComputerUnitCode}
                        onChange={(e) => setFlowComputerUnitCode(e.target.value)}>
                        {units.map((u) => (
                          <MenuItem key={u.id} value={u.unitCode}>{u.unitName} ({u.unitCode})</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Log Time" type="time" fullWidth
                      value={flowComputerEditTarget ? (flowComputerUpdateForm.logTime ?? '') : flowComputerForm.logTime}
                      onChange={(e) => {
                        if (flowComputerEditTarget) setFlowComputerUpdateForm((prev) => ({ ...prev, logTime: e.target.value }));
                        else setFlowComputerForm((prev) => ({ ...prev, logTime: e.target.value }));
                      }}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid>
                </Grid>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary"
                  sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                  Instrument Reading
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Reading (MMscf)" type="number" fullWidth required
                      value={flowComputerEditTarget ? (flowComputerUpdateForm.readingMMscf ?? '') : flowComputerForm.readingMMscf}
                      onChange={(e) => {
                        if (flowComputerEditTarget) setFlowComputerUpdateForm((prev) => ({ ...prev, readingMMscf: e.target.value }));
                        else setFlowComputerForm((prev) => ({ ...prev, readingMMscf: e.target.value }));
                      }}
                      helperText="Direct reading from flow computer"
                      slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">MMscf</Typography> } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Heating Value (LHV)" type="number" fullWidth required
                      value={flowComputerEditTarget ? (flowComputerUpdateForm.heatingValue ?? '') : flowComputerForm.heatingValue}
                      onChange={(e) => {
                        if (flowComputerEditTarget) setFlowComputerUpdateForm((prev) => ({ ...prev, heatingValue: e.target.value }));
                        else setFlowComputerForm((prev) => ({ ...prev, heatingValue: e.target.value }));
                      }}
                      helperText="BTU/scf"
                      slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">BTU/scf</Typography> } }}
                    />
                  </Grid>
                </Grid>
              </Paper>

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
                      Prior Progressive Total: {flowComputerLoadingPrior ? '…' : fmt(previewPriorTotal, 4)} MMscf
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              <Stack direction="row" spacing={1.5}>
                {flowComputerEditTarget && <Button variant="outlined" onClick={cancelEdit} disabled={flowComputerSaving}>Cancel</Button>}
                {(flowComputerEditTarget ? canEdit : canCreate) && (
                  <Button variant="contained" onClick={handleSave}
                    disabled={flowComputerSaving || !isFormValid}
                    startIcon={flowComputerSaving ? <CircularProgress size={16} color="inherit" /> : <Save />}
                    sx={{ minWidth: 140 }}>
                    {flowComputerSaving ? 'Saving...' : flowComputerEditTarget ? 'Update Reading' : 'Save Reading'}
                  </Button>
                )}
              </Stack>
            </Grid>

            {/* ── Records ── */}
            <Grid size={{ xs: 12, lg: 6 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
                <History sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
                <Typography sx={{ fontWeight: 700 }}>Logged Readings</Typography>
              </Stack>

              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>Unit</InputLabel>
                  <Select label="Unit" value={flowComputerFilterUnit} onChange={(e) => setFlowComputerFilterUnit(e.target.value)}>
                    <MenuItem value="">All Units</MenuItem>
                    {units.map((u) => (
                      <MenuItem key={u.id} value={u.unitCode}>{u.unitName}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button variant="outlined" size="small"
                  startIcon={flowComputerLoadingRecords ? <CircularProgress size={14} /> : <Search />}
                  onClick={fetchFlowComputerRecords} disabled={flowComputerLoadingRecords}>
                  {flowComputerLoadingRecords ? 'Loading...' : 'Load'}
                </Button>
              </Stack>

              {flowComputerRecordsError && <Alert severity="error" onClose={() => setFlowComputerRecordsError(null)} sx={{ mb: 1.5 }}>{flowComputerRecordsError}</Alert>}

              {flowComputerRecords.length === 0 && !flowComputerLoadingRecords ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <LocalFireDepartment sx={{ fontSize: '2rem', color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">No records found.</Typography>
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
                      {flowComputerRecords.map((row) => (
                        <TableRow key={row.id} selected={flowComputerEditTarget?.id === row.id} hover>
                          <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{row.logDate.split('T')[0]}</Typography></TableCell>
                          <TableCell><Chip label={row.unitCode} size="small" variant="outlined" sx={{ fontWeight: 700 }} /></TableCell>
                          <TableCell><Typography variant="body2">{row.readingMMscf.toFixed(4)}</Typography></TableCell>
                          <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{row.progressiveTotal.toFixed(4)}</Typography></TableCell>
                          <TableCell><Typography variant="body2">{row.consumptionMMBtu.toFixed(2)}</Typography></TableCell>
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
                                <IconButton size="small" color="error" onClick={() => setFlowComputerDeleteTarget(row)}>
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
            </Grid>
          </Grid>
        </CardContent>
      </Collapse>

      <ConfirmDialog
        open={!!flowComputerDeleteTarget}
        title="Delete Reading"
        message={`Delete flow computer reading for ${flowComputerDeleteTarget?.unitCode} on ${flowComputerDeleteTarget?.logDate?.split('T')[0]}? This will recompute progressive totals for any later readings.`}
        confirmLabel="Delete" loading={flowComputerDeleting}
        onConfirm={handleDelete} onCancel={() => setFlowComputerDeleteTarget(null)}
      />
    </Card>
  );
}

// ─── LCO Readings ────────────────────────────────────────────────────────────

function LcoSection({
  plantCode, logDate, canCreate, canEdit, canDelete, configured, collapsed, onToggle,
}: SectionBaseProps) {
  const accentColor = '#E65100';

  const [lcoForm, setLcoForm] = useState({ currentReading: '' });
  const [lcoUpdateForm, setLcoUpdateForm] = useState<{ currentReading: number | string }>({ currentReading: '' });
  const [lcoEditTarget, setLcoEditTarget] = useState<DailyLcoReading | null>(null);

  const [lcoManualPreviousReading, setLcoManualPreviousReading] = useState('');
  const [lcoPriorRecord, setLcoPriorRecord] = useState<DailyLcoReading | null>(null);
  const [lcoLoadingPrior, setLcoLoadingPrior] = useState(false);

  const [lcoSaving, setLcoSaving] = useState(false);
  const [lcoError, setLcoError] = useState<string | null>(null);
  const [lcoSuccess, setLcoSuccess] = useState(false);

  const [lcoRecords, setLcoRecords] = useState<DailyLcoReading[]>([]);
  const [lcoLoadingRecords, setLcoLoadingRecords] = useState(false);
  const [lcoRecordsError, setLcoRecordsError] = useState<string | null>(null);

  const [lcoDeleteTarget, setLcoDeleteTarget] = useState<DailyLcoReading | null>(null);
  const [lcoDeleting, setLcoDeleting] = useState(false);

  useEffect(() => {
    if (lcoEditTarget || !plantCode || !logDate) { setLcoPriorRecord(null); return; }
    setLcoLoadingPrior(true);
    dailyLcoReadingApi.getAll({ plantCode })
      .then((res) => {
        const prior = res.data
          .filter((r) => r.logDate.split('T')[0] < logDate)
          .sort((a, b) => b.logDate.localeCompare(a.logDate))[0];
        setLcoPriorRecord(prior ?? null);
        if (prior) setLcoManualPreviousReading('');
      })
      .catch(() => setLcoPriorRecord(null))
      .finally(() => setLcoLoadingPrior(false));
  }, [plantCode, logDate, lcoEditTarget]);

  const fetchLcoRecords = useCallback(async () => {
    if (!plantCode) { setLcoRecords([]); return; }
    setLcoLoadingRecords(true);
    setLcoRecordsError(null);
    try {
      const res = await dailyLcoReadingApi.getAll({ plantCode });
      setLcoRecords(res.data.sort((a, b) => b.logDate.localeCompare(a.logDate)));
    } catch {
      setLcoRecordsError('Failed to load records.');
    } finally {
      setLcoLoadingRecords(false);
    }
  }, [plantCode]);

  useEffect(() => { fetchLcoRecords(); }, [fetchLcoRecords]);

  const isFirstEntry = !lcoEditTarget && !lcoPriorRecord && !lcoLoadingPrior;
  const previewPreviousReading = lcoEditTarget
    ? lcoEditTarget.previousReading
    : lcoPriorRecord
    ? lcoPriorRecord.currentReading
    : Number(lcoManualPreviousReading) || 0;
  const previewPriorProgressiveTotal = lcoEditTarget
    ? lcoEditTarget.progressiveTotal - lcoEditTarget.difference
    : (lcoPriorRecord?.progressiveTotal ?? 0);
  const currentReadingVal = Number(lcoEditTarget ? lcoUpdateForm.currentReading : lcoForm.currentReading) || 0;
  const previewDifference = currentReadingVal - previewPreviousReading;
  const previewProgressiveTotal = previewPriorProgressiveTotal + previewDifference;

  const openEdit = (row: DailyLcoReading) => {
    setLcoEditTarget(row);
    setLcoError(null);
    setLcoSuccess(false);
    setLcoUpdateForm({ currentReading: row.currentReading });
  };

  const cancelEdit = () => { setLcoEditTarget(null); setLcoUpdateForm({ currentReading: '' }); };

  const handleSave = async () => {
    setLcoSaving(true);
    setLcoError(null);
    setLcoSuccess(false);
    try {
      if (lcoEditTarget) {
        await dailyLcoReadingApi.update(lcoEditTarget.id, { currentReading: Number(lcoUpdateForm.currentReading) });
        cancelEdit();
      } else {
        await dailyLcoReadingApi.create({
          plantCode, logDate,
          previousReading: isFirstEntry ? Number(lcoManualPreviousReading) : undefined,
          currentReading: Number(lcoForm.currentReading),
        });
        setLcoForm({ currentReading: '' });
        setLcoManualPreviousReading('');
      }
      setLcoSuccess(true);
      fetchLcoRecords();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setLcoError(msg ?? 'Failed to save. Please try again.');
    } finally {
      setLcoSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!lcoDeleteTarget) return;
    setLcoDeleting(true);
    try {
      await dailyLcoReadingApi.delete(lcoDeleteTarget.id);
      setLcoDeleteTarget(null);
      fetchLcoRecords();
    } catch {
      setLcoRecordsError('Failed to delete record.');
    } finally {
      setLcoDeleting(false);
    }
  };

  const isFormValid = lcoEditTarget
    ? lcoUpdateForm.currentReading !== '' && lcoUpdateForm.currentReading !== undefined
    : lcoForm.currentReading !== '';

  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <SectionHeader title="LCO Readings" accentColor={accentColor} configured={configured} collapsed={collapsed} onToggle={onToggle} />
      <Collapse in={!collapsed} timeout="auto" unmountOnExit>
        <CardContent>
          {!configured && <NotConfiguredNote />}
          {lcoError && <Alert severity="error" onClose={() => setLcoError(null)} sx={{ mb: 2 }}>{lcoError}</Alert>}
          {lcoSuccess && <Alert severity="success" onClose={() => setLcoSuccess(false)} sx={{ mb: 2 }}>Reading saved successfully.</Alert>}

          <Grid container spacing={3}>
            {/* ── Entry form ── */}
            <Grid size={{ xs: 12, lg: 6 }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
                <LocalGasStation sx={{ color: accentColor }} />
                <Typography sx={{ fontWeight: 700 }}>
                  {lcoEditTarget
                    ? `Editing: ${lcoEditTarget.plantCode} — ${lcoEditTarget.logDate?.split('T')[0]}`
                    : 'New Daily Reading'}
                </Typography>
                {lcoEditTarget && <Chip label="Edit Mode" size="small" color="warning" onDelete={cancelEdit} />}
              </Stack>

              <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary"
                  sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                  Log Identity
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Plant: <b>{plantCode}</b> &nbsp;·&nbsp; Log Date: <b>{lcoEditTarget ? lcoEditTarget.logDate?.split('T')[0] : logDate}</b>
                </Typography>
              </Paper>

              {isFirstEntry && (
                <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2 }}>
                  <TextField label="Manual Previous Reading" type="number" fullWidth
                    value={lcoManualPreviousReading}
                    onChange={(e) => setLcoManualPreviousReading(e.target.value)}
                    helperText="No prior record found — enter the starting reading for this plant"
                  />
                </Paper>
              )}

              <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary"
                  sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                  Tank Readings (m³)
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Previous Reading" fullWidth disabled
                      value={lcoLoadingPrior ? '…' : previewPreviousReading.toFixed(2)}
                      helperText="Auto-carried from prior day"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Current Reading" type="number" fullWidth required
                      value={lcoEditTarget ? lcoUpdateForm.currentReading : lcoForm.currentReading}
                      onChange={(e) => {
                        if (lcoEditTarget) setLcoUpdateForm({ currentReading: e.target.value });
                        else setLcoForm({ currentReading: e.target.value });
                      }}
                      slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">m³</Typography> } }}
                    />
                  </Grid>
                </Grid>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2, backgroundColor: 'action.hover' }}>
                <Typography variant="caption" color="text.secondary"
                  sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                  Computed Preview
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary">Difference</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{previewDifference.toFixed(2)} m³</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary">Progressive Total</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{previewProgressiveTotal.toFixed(2)} m³</Typography>
                  </Grid>
                </Grid>
              </Paper>

              <Stack direction="row" spacing={1.5}>
                {lcoEditTarget && <Button variant="outlined" onClick={cancelEdit} disabled={lcoSaving}>Cancel</Button>}
                {(lcoEditTarget ? canEdit : canCreate) && (
                  <Button variant="contained" onClick={handleSave}
                    disabled={lcoSaving || !isFormValid}
                    startIcon={lcoSaving ? <CircularProgress size={16} color="inherit" /> : <Save />}
                    sx={{ minWidth: 140 }}>
                    {lcoSaving ? 'Saving...' : lcoEditTarget ? 'Update Reading' : 'Save Reading'}
                  </Button>
                )}
              </Stack>
            </Grid>

            {/* ── Records ── */}
            <Grid size={{ xs: 12, lg: 6 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
                <History sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
                <Typography sx={{ fontWeight: 700 }}>Logged Readings</Typography>
                <Box sx={{ flex: 1 }} />
                <Button variant="outlined" size="small"
                  startIcon={lcoLoadingRecords ? <CircularProgress size={14} /> : <Search />}
                  onClick={fetchLcoRecords} disabled={lcoLoadingRecords}>
                  {lcoLoadingRecords ? 'Loading...' : 'Refresh'}
                </Button>
              </Stack>

              {lcoRecordsError && <Alert severity="error" onClose={() => setLcoRecordsError(null)} sx={{ mb: 1.5 }}>{lcoRecordsError}</Alert>}

              {lcoRecords.length === 0 && !lcoLoadingRecords ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <LocalGasStation sx={{ fontSize: '2rem', color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">No records found.</Typography>
                </Box>
              ) : (
                <TableContainer sx={{ maxHeight: 480 }}>
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
                      {lcoRecords.map((row) => (
                        <TableRow key={row.id} selected={lcoEditTarget?.id === row.id} hover>
                          <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{row.logDate.split('T')[0]}</Typography></TableCell>
                          <TableCell><Typography variant="body2">{row.currentReading.toFixed(1)}</Typography></TableCell>
                          <TableCell>
                            <Typography variant="body2" color={row.difference < 0 ? 'error.main' : 'text.primary'}>
                              {row.difference.toFixed(1)}
                            </Typography>
                          </TableCell>
                          <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{row.progressiveTotal.toFixed(1)}</Typography></TableCell>
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
                                <IconButton size="small" color="error" onClick={() => setLcoDeleteTarget(row)}>
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
            </Grid>
          </Grid>
        </CardContent>
      </Collapse>

      <ConfirmDialog
        open={!!lcoDeleteTarget}
        title="Delete Reading"
        message={`Delete the reading for ${lcoDeleteTarget?.plantCode} on ${lcoDeleteTarget?.logDate?.split('T')[0]}? This will recompute progressive totals for any later readings.`}
        confirmLabel="Delete" loading={lcoDeleting}
        onConfirm={handleDelete} onCancel={() => setLcoDeleteTarget(null)}
      />
    </Card>
  );
}

// ─── DFO Readings ────────────────────────────────────────────────────────────

function DfoSection({
  plantCode, logDate, canCreate, canEdit, canDelete, configured, collapsed, onToggle,
}: SectionBaseProps) {
  const accentColor = '#1B5E20';

  const [dfoForm, setDfoForm] = useState({ currentReading: '' });
  const [dfoUpdateForm, setDfoUpdateForm] = useState<{ currentReading: number | string }>({ currentReading: '' });
  const [dfoEditTarget, setDfoEditTarget] = useState<DailyDfoReading | null>(null);

  const [dfoManualPreviousReading, setDfoManualPreviousReading] = useState('');
  const [dfoPriorRecord, setDfoPriorRecord] = useState<DailyDfoReading | null>(null);
  const [dfoLoadingPrior, setDfoLoadingPrior] = useState(false);

  const [dfoSaving, setDfoSaving] = useState(false);
  const [dfoError, setDfoError] = useState<string | null>(null);
  const [dfoSuccess, setDfoSuccess] = useState(false);

  const [dfoRecords, setDfoRecords] = useState<DailyDfoReading[]>([]);
  const [dfoLoadingRecords, setDfoLoadingRecords] = useState(false);
  const [dfoRecordsError, setDfoRecordsError] = useState<string | null>(null);

  const [dfoDeleteTarget, setDfoDeleteTarget] = useState<DailyDfoReading | null>(null);
  const [dfoDeleting, setDfoDeleting] = useState(false);

  useEffect(() => {
    if (dfoEditTarget || !plantCode || !logDate) { setDfoPriorRecord(null); return; }
    setDfoLoadingPrior(true);
    dailyDfoReadingApi.getAll({ plantCode })
      .then((res) => {
        const prior = res.data
          .filter((r) => r.logDate.split('T')[0] < logDate)
          .sort((a, b) => b.logDate.localeCompare(a.logDate))[0];
        setDfoPriorRecord(prior ?? null);
        if (prior) setDfoManualPreviousReading('');
      })
      .catch(() => setDfoPriorRecord(null))
      .finally(() => setDfoLoadingPrior(false));
  }, [plantCode, logDate, dfoEditTarget]);

  const fetchDfoRecords = useCallback(async () => {
    if (!plantCode) { setDfoRecords([]); return; }
    setDfoLoadingRecords(true);
    setDfoRecordsError(null);
    try {
      const res = await dailyDfoReadingApi.getAll({ plantCode });
      setDfoRecords(res.data.sort((a, b) => b.logDate.localeCompare(a.logDate)));
    } catch {
      setDfoRecordsError('Failed to load records.');
    } finally {
      setDfoLoadingRecords(false);
    }
  }, [plantCode]);

  useEffect(() => { fetchDfoRecords(); }, [fetchDfoRecords]);

  const isFirstEntry = !dfoEditTarget && !dfoPriorRecord && !dfoLoadingPrior;
  const previewPreviousReading = dfoEditTarget
    ? dfoEditTarget.previousReading
    : dfoPriorRecord
    ? dfoPriorRecord.currentReading
    : Number(dfoManualPreviousReading) || 0;
  const previewPriorProgressiveTotal = dfoEditTarget
    ? dfoEditTarget.progressiveTotal - dfoEditTarget.difference
    : (dfoPriorRecord?.progressiveTotal ?? 0);
  const currentReadingVal = Number(dfoEditTarget ? dfoUpdateForm.currentReading : dfoForm.currentReading) || 0;
  const previewDifference = currentReadingVal - previewPreviousReading;
  const previewProgressiveTotal = previewPriorProgressiveTotal + previewDifference;

  const openEdit = (row: DailyDfoReading) => {
    setDfoEditTarget(row);
    setDfoError(null);
    setDfoSuccess(false);
    setDfoUpdateForm({ currentReading: row.currentReading });
  };

  const cancelEdit = () => { setDfoEditTarget(null); setDfoUpdateForm({ currentReading: '' }); };

  const handleSave = async () => {
    setDfoSaving(true);
    setDfoError(null);
    setDfoSuccess(false);
    try {
      if (dfoEditTarget) {
        await dailyDfoReadingApi.update(dfoEditTarget.id, { currentReading: Number(dfoUpdateForm.currentReading) });
        cancelEdit();
      } else {
        await dailyDfoReadingApi.create({
          plantCode, logDate,
          previousReading: isFirstEntry ? Number(dfoManualPreviousReading) : undefined,
          currentReading: Number(dfoForm.currentReading),
        });
        setDfoForm({ currentReading: '' });
        setDfoManualPreviousReading('');
      }
      setDfoSuccess(true);
      fetchDfoRecords();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setDfoError(msg ?? 'Failed to save. Please try again.');
    } finally {
      setDfoSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!dfoDeleteTarget) return;
    setDfoDeleting(true);
    try {
      await dailyDfoReadingApi.delete(dfoDeleteTarget.id);
      setDfoDeleteTarget(null);
      fetchDfoRecords();
    } catch {
      setDfoRecordsError('Failed to delete record.');
    } finally {
      setDfoDeleting(false);
    }
  };

  const isFormValid = dfoEditTarget
    ? dfoUpdateForm.currentReading !== '' && dfoUpdateForm.currentReading !== undefined
    : dfoForm.currentReading !== '';

  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <SectionHeader title="DFO Readings" accentColor={accentColor} configured={configured} collapsed={collapsed} onToggle={onToggle} />
      <Collapse in={!collapsed} timeout="auto" unmountOnExit>
        <CardContent>
          {!configured && <NotConfiguredNote />}
          {dfoError && <Alert severity="error" onClose={() => setDfoError(null)} sx={{ mb: 2 }}>{dfoError}</Alert>}
          {dfoSuccess && <Alert severity="success" onClose={() => setDfoSuccess(false)} sx={{ mb: 2 }}>Reading saved successfully.</Alert>}

          <Grid container spacing={3}>
            {/* ── Entry form ── */}
            <Grid size={{ xs: 12, lg: 6 }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
                <LocalGasStation sx={{ color: accentColor }} />
                <Typography sx={{ fontWeight: 700 }}>
                  {dfoEditTarget
                    ? `Editing: ${dfoEditTarget.plantCode} — ${dfoEditTarget.logDate?.split('T')[0]}`
                    : 'New Daily Reading'}
                </Typography>
                {dfoEditTarget && <Chip label="Edit Mode" size="small" color="warning" onDelete={cancelEdit} />}
              </Stack>

              <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary"
                  sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                  Log Identity
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Plant: <b>{plantCode}</b> &nbsp;·&nbsp; Log Date: <b>{dfoEditTarget ? dfoEditTarget.logDate?.split('T')[0] : logDate}</b>
                </Typography>
              </Paper>

              {isFirstEntry && (
                <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2 }}>
                  <TextField label="Manual Previous Reading" type="number" fullWidth
                    value={dfoManualPreviousReading}
                    onChange={(e) => setDfoManualPreviousReading(e.target.value)}
                    helperText="No prior record found — enter the starting reading for this plant"
                  />
                </Paper>
              )}

              <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary"
                  sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                  Tank Readings (m³)
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Previous Reading" fullWidth disabled
                      value={dfoLoadingPrior ? '…' : previewPreviousReading.toFixed(2)}
                      helperText="Auto-carried from prior day"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Current Reading" type="number" fullWidth required
                      value={dfoEditTarget ? dfoUpdateForm.currentReading : dfoForm.currentReading}
                      onChange={(e) => {
                        if (dfoEditTarget) setDfoUpdateForm({ currentReading: e.target.value });
                        else setDfoForm({ currentReading: e.target.value });
                      }}
                      slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">m³</Typography> } }}
                    />
                  </Grid>
                </Grid>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2, backgroundColor: 'action.hover' }}>
                <Typography variant="caption" color="text.secondary"
                  sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                  Computed Preview
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary">Difference</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{previewDifference.toFixed(2)} m³</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary">Progressive Total</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{previewProgressiveTotal.toFixed(2)} m³</Typography>
                  </Grid>
                </Grid>
              </Paper>

              <Stack direction="row" spacing={1.5}>
                {dfoEditTarget && <Button variant="outlined" onClick={cancelEdit} disabled={dfoSaving}>Cancel</Button>}
                {(dfoEditTarget ? canEdit : canCreate) && (
                  <Button variant="contained" onClick={handleSave}
                    disabled={dfoSaving || !isFormValid}
                    startIcon={dfoSaving ? <CircularProgress size={16} color="inherit" /> : <Save />}
                    sx={{ minWidth: 140 }}>
                    {dfoSaving ? 'Saving...' : dfoEditTarget ? 'Update Reading' : 'Save Reading'}
                  </Button>
                )}
              </Stack>
            </Grid>

            {/* ── Records ── */}
            <Grid size={{ xs: 12, lg: 6 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
                <History sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
                <Typography sx={{ fontWeight: 700 }}>Logged Readings</Typography>
                <Box sx={{ flex: 1 }} />
                <Button variant="outlined" size="small"
                  startIcon={dfoLoadingRecords ? <CircularProgress size={14} /> : <Search />}
                  onClick={fetchDfoRecords} disabled={dfoLoadingRecords}>
                  {dfoLoadingRecords ? 'Loading...' : 'Refresh'}
                </Button>
              </Stack>

              {dfoRecordsError && <Alert severity="error" onClose={() => setDfoRecordsError(null)} sx={{ mb: 1.5 }}>{dfoRecordsError}</Alert>}

              {dfoRecords.length === 0 && !dfoLoadingRecords ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <LocalGasStation sx={{ fontSize: '2rem', color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">No records found.</Typography>
                </Box>
              ) : (
                <TableContainer sx={{ maxHeight: 480 }}>
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
                      {dfoRecords.map((row) => (
                        <TableRow key={row.id} selected={dfoEditTarget?.id === row.id} hover>
                          <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{row.logDate.split('T')[0]}</Typography></TableCell>
                          <TableCell><Typography variant="body2">{row.currentReading.toFixed(1)}</Typography></TableCell>
                          <TableCell>
                            <Typography variant="body2" color={row.difference < 0 ? 'error.main' : 'text.primary'}>
                              {row.difference.toFixed(1)}
                            </Typography>
                          </TableCell>
                          <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{row.progressiveTotal.toFixed(1)}</Typography></TableCell>
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
                                <IconButton size="small" color="error" onClick={() => setDfoDeleteTarget(row)}>
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
            </Grid>
          </Grid>
        </CardContent>
      </Collapse>

      <ConfirmDialog
        open={!!dfoDeleteTarget}
        title="Delete Reading"
        message={`Delete the reading for ${dfoDeleteTarget?.plantCode} on ${dfoDeleteTarget?.logDate?.split('T')[0]}? This will recompute progressive totals for any later readings.`}
        confirmLabel="Delete" loading={dfoDeleting}
        onConfirm={handleDelete} onCancel={() => setDfoDeleteTarget(null)}
      />
    </Card>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function FuelReadingsPage() {
  const { canCreate, canEdit, canDelete } = useSectionPermissions('daily.fuel_readings');
  const isWrongPlantType = usePlantTypeGuard('thermal');
  const navigate = useNavigate();

  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const { availablePlants, plantLocked, autoPlantCode } = usePlantFilter(plants);

  const [selectedPlant, setSelectedPlant] = useState('');
  const [selectedDate, setSelectedDate] = useState(today);

  const [plantUnits, setPlantUnits] = useState<PlantUnit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  const [gasTurbineCollapsed, setGasTurbineCollapsed] = useState(true);
  const [flowComputerCollapsed, setFlowComputerCollapsed] = useState(true);
  const [lcoCollapsed, setLcoCollapsed] = useState(true);
  const [dfoCollapsed, setDfoCollapsed] = useState(true);

  useEffect(() => {
    powerPlantApi.getAll().then((res) => {
      setPlants(res.data.filter((p) => p.classificationType === 'Thermal'));
    });
  }, []);

  useEffect(() => {
    if (autoPlantCode) setSelectedPlant(autoPlantCode);
  }, [autoPlantCode]);

  useEffect(() => {
    if (!selectedPlant) { setPlantUnits([]); return; }
    setLoadingUnits(true);
    plantUnitApi.getByPlant(selectedPlant)
      .then((res) => setPlantUnits(res.data))
      .catch(() => setPlantUnits([]))
      .finally(() => setLoadingUnits(false));
  }, [selectedPlant]);

  const fuelTypeStr = plantUnits.map((u) => u.fuelType ?? '').join('/');
  const gasConfigured = fuelTypeStr.includes('Gas');
  const lcoConfigured = fuelTypeStr.includes('LCO');
  const dfoConfigured = fuelTypeStr.includes('DFO');

  useEffect(() => {
    if (!selectedPlant) return;
    setGasTurbineCollapsed(!gasConfigured);
    setFlowComputerCollapsed(!gasConfigured);
    setLcoCollapsed(!lcoConfigured);
    setDfoCollapsed(!dfoConfigured);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlant, gasConfigured, lcoConfigured, dfoConfigured]);

  if (isWrongPlantType) return (
    <Box>
      <PageHeader
        title="Fuel Readings"
        subtitle="Daily fuel consumption and gas readings"
        breadcrumbs={[{ label: 'Daily Readings' }, { label: 'Fuel Readings' }]}
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
        title="Fuel Readings"
        subtitle="Daily fuel consumption and gas readings"
        breadcrumbs={[{ label: 'Daily Readings' }, { label: 'Fuel Readings' }]}
      />

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, sm: 5 }}>
              <FormControl fullWidth required disabled={plantLocked}>
                <InputLabel>Power Plant</InputLabel>
                <Select label="Power Plant" value={selectedPlant} onChange={(e) => setSelectedPlant(e.target.value)}>
                  {availablePlants.map((p: PowerPlant) => (
                    <MenuItem key={p.id} value={p.plantCode}>{p.plantName} ({p.plantCode})</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Log Date" type="date" fullWidth required
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            {loadingUnits && (
              <Grid size={{ xs: 12, sm: 3 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <CircularProgress size={18} />
                  <Typography variant="body2" color="text.secondary">Loading units…</Typography>
                </Stack>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {!selectedPlant ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <OilBarrel sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            Select a plant and date to load fuel readings.
          </Typography>
        </Box>
      ) : (
        <>
          <GasTurbineSection
            plantCode={selectedPlant} logDate={selectedDate} units={plantUnits}
            canCreate={canCreate} canEdit={canEdit} canDelete={canDelete}
            configured={gasConfigured} collapsed={gasTurbineCollapsed}
            onToggle={() => setGasTurbineCollapsed((p) => !p)}
          />
          <FlowComputerSection
            plantCode={selectedPlant} logDate={selectedDate} units={plantUnits}
            canCreate={canCreate} canEdit={canEdit} canDelete={canDelete}
            configured={gasConfigured} collapsed={flowComputerCollapsed}
            onToggle={() => setFlowComputerCollapsed((p) => !p)}
          />
          <LcoSection
            plantCode={selectedPlant} logDate={selectedDate}
            canCreate={canCreate} canEdit={canEdit} canDelete={canDelete}
            configured={lcoConfigured} collapsed={lcoCollapsed}
            onToggle={() => setLcoCollapsed((p) => !p)}
          />
          <DfoSection
            plantCode={selectedPlant} logDate={selectedDate}
            canCreate={canCreate} canEdit={canEdit} canDelete={canDelete}
            configured={dfoConfigured} collapsed={dfoCollapsed}
            onToggle={() => setDfoCollapsed((p) => !p)}
          />
        </>
      )}
    </Box>
  );
}

import { useSearchDeepLink } from '../../hooks/useSearchDeepLink';
import {
  Box, Card, CardContent, CardHeader, TextField, Button,
  CircularProgress, Alert, Typography, MenuItem, FormControl,
  InputLabel, Select, Grid, Divider, Chip, Stack, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, IconButton, Tooltip, FormControlLabel, Switch,
} from '@mui/material';
import { Save, Edit, Delete, ElectricMeter, History } from '@mui/icons-material';
import { useEffect, useMemo, useState, useCallback } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { isStationServiceTransformer, type TransformerOption } from '../../components/stationLog/StationServiceEditor';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { plantUnitEquipmentApi } from '../../api/masterData/plantUnitEquipmentApi';
import { bopEquipmentApi } from '../../api/masterData/bopEquipmentApi';
import { dailyStationEnergyConsumptionApi } from '../../api/daily/dailyStationEnergyConsumptionApi';
import type { PowerPlant } from '../../types/masterData';
import type { DailyStationEnergyConsumption } from '../../types/dailyStationEnergyConsumption';
import { useSectionPermissions, usePlantFilter } from '../../hooks/usePermission';

interface Meter { code: string; name: string }
interface CardInput { current: string; previous: string; mvCurrent?: string; mvPrevious?: string }

const today = () => new Date().toISOString().split('T')[0];
const dateOnly = (v: string) => v.split('T')[0];
const same = (a: string, b: string) => (a ?? '').toLowerCase() === (b ?? '').toLowerCase();

export default function DailyStationEnergyConsumptionPage() {
  const { canCreate, canEdit, canDelete } = useSectionPermissions('daily.station_energy');
  const deepLink = useSearchDeepLink();

  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const { availablePlants, plantLocked, autoPlantCode } = usePlantFilter(plants);

  const [plantCode, setPlantCode] = useState(deepLink.plant ?? '');
  const [logDate, setLogDate] = useState(today());

  const [transformers, setTransformers] = useState<TransformerOption[]>([]);
  const [loadingTransformers, setLoadingTransformers] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const [records, setRecords] = useState<DailyStationEnergyConsumption[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  const [inputs, setInputs] = useState<Record<string, CardInput>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<DailyStationEnergyConsumption | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { powerPlantApi.getAll().then((res) => setPlants(res.data)); }, []);
  useEffect(() => { if (autoPlantCode) setPlantCode(autoPlantCode); }, [autoPlantCode]);

  // Transformers of the plant from master data (unit hierarchy + balance of plant) - TSS/SST are picked out below
  useEffect(() => {
    if (!plantCode) { setTransformers([]); return; }
    let cancelled = false;
    setLoadingTransformers(true);
    Promise.allSettled([plantUnitEquipmentApi.getAll(), bopEquipmentApi.search(plantCode, 'transformer')]).then(([u, b]) => {
      if (cancelled) return;
      const unit: TransformerOption[] = u.status === 'fulfilled'
        ? u.value.data
          .filter((e) => e.plantCode === plantCode
            && /transformer/i.test([e.unitName, e.systemName, e.subSystemName, e.equipmentName].filter(Boolean).join(' ')))
          .map((e) => ({ equipmentCode: e.equipmentCode, equipmentName: e.equipmentName, groupLabel: [e.unitName, e.systemName, e.subSystemName].filter(Boolean).join(' / ') }))
        : [];
      const bop: TransformerOption[] = b.status === 'fulfilled'
        ? b.value.data.map((e) => ({ equipmentCode: e.equipmentCode, equipmentName: e.equipmentName, groupLabel: e.groupLabel }))
        : [];
      setTransformers([...unit, ...bop].filter((o, i, arr) => arr.findIndex((x) => x.equipmentCode === o.equipmentCode) === i));
    }).finally(() => { if (!cancelled) setLoadingTransformers(false); });
    return () => { cancelled = true; };
  }, [plantCode]);

  const fetchRecords = useCallback(async () => {
    if (!plantCode) { setRecords([]); return; }
    setLoadingRecords(true);
    setRecordsError(null);
    try {
      const res = await dailyStationEnergyConsumptionApi.getAll({ plantCode });
      setRecords(res.data);
    } catch {
      setRecordsError('Failed to load records.');
    } finally {
      setLoadingRecords(false);
    }
  }, [plantCode]);
  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  // entered values belong to one plant + date
  useEffect(() => { setInputs({}); setSaveError(null); setSaveSuccess(null); }, [plantCode, logDate]);

  const tss = useMemo(() => transformers.filter(isStationServiceTransformer), [transformers]);
  const noTss = tss.length === 0 && transformers.length > 0;
  const meters: Meter[] = useMemo(() => {
    const pool = showAll || tss.length === 0 ? transformers : tss;
    if (pool.length === 0) return plantCode ? [{ code: '', name: 'Plant (whole station)' }] : [];
    return pool.map((t) => ({ code: t.equipmentCode, name: t.equipmentName || t.equipmentCode }));
  }, [tss, transformers, showAll, plantCode]);

  const sortedRecords = useMemo(
    () => [...records].sort((a, b) => b.logDate.localeCompare(a.logDate) || a.transformerCode.localeCompare(b.transformerCode)),
    [records],
  );

  const meterState = (m: Meter) => {
    const own = records.filter((r) => same(r.transformerCode, m.code));
    const existing = own.find((r) => dateOnly(r.logDate) === logDate) ?? null;
    const prior = own.filter((r) => dateOnly(r.logDate) < logDate).sort((a, b) => b.logDate.localeCompare(a.logDate))[0] ?? null;
    const inp = inputs[m.code];
    const currentStr = inp?.current ?? (existing ? String(existing.currentReading) : '');
    const firstEntry = !existing && !prior;
    const previous = existing ? existing.previousReading : prior ? prior.currentReading : Number(inp?.previous) || 0;
    const baseProgressive = existing
      ? existing.progressiveTotal - existing.difference
      : prior && dateOnly(prior.logDate).slice(0, 7) === logDate.slice(0, 7) ? prior.progressiveTotal : 0;
    const hasCurrent = currentStr !== '';
    const difference = hasCurrent ? Number(currentStr) - previous : 0;

    // MVArh — same pattern, chained only over days that have an MVArh reading
    const existingMv = existing?.mvarhCurrentReading != null ? existing : null;
    const mvPrior = own
      .filter((r) => dateOnly(r.logDate) < logDate && r.mvarhCurrentReading != null)
      .sort((a, b) => b.logDate.localeCompare(a.logDate))[0] ?? null;
    const mvCurrentStr = inp?.mvCurrent ?? (existingMv ? String(existingMv.mvarhCurrentReading) : '');
    const mvFirst = !existingMv && !mvPrior;
    const mvPrevious = existingMv ? (existingMv.mvarhPreviousReading ?? 0)
      : mvPrior ? (mvPrior.mvarhCurrentReading ?? 0) : Number(inp?.mvPrevious) || 0;
    const mvBase = existingMv
      ? (existingMv.mvarhProgressiveTotal ?? 0) - (existingMv.mvarhDifference ?? 0)
      : mvPrior && dateOnly(mvPrior.logDate).slice(0, 7) === logDate.slice(0, 7) ? (mvPrior.mvarhProgressiveTotal ?? 0) : 0;
    const mvHas = mvCurrentStr !== '';
    const mvDifference = mvHas ? Number(mvCurrentStr) - mvPrevious : 0;
    const mvChanged = (existing?.mvarhCurrentReading ?? null) !== (mvHas ? Number(mvCurrentStr) : null);

    const dirty = hasCurrent && (!existing || Number(currentStr) !== existing.currentReading || mvChanged);
    return {
      existing, prior, currentStr, firstEntry, previous, difference, progressive: baseProgressive + difference, hasCurrent, dirty,
      mvCurrentStr, mvFirst, mvPrevious, mvDifference, mvProgressive: mvBase + mvDifference, mvHas,
    };
  };

  const patchInput = (code: string, p: Partial<CardInput>) =>
    setInputs((prev) => ({ ...prev, [code]: { ...(prev[code] ?? { current: '', previous: '' }), ...p } }));

  const states = meters.map((m) => ({ m, s: meterState(m) }));
  const plantTotal = states.reduce((sum, { s }) => sum + (s.hasCurrent ? s.difference : 0), 0);
  const plantMvTotal = states.reduce((sum, { s }) => sum + (s.mvHas ? s.mvDifference : 0), 0);
  const anyMv = states.some(({ s }) => s.mvHas);
  const dirtyCount = states.filter(({ s }) => s.dirty).length;

  const canSaveAll = dirtyCount > 0 && states.every(({ m, s }) =>
    !s.dirty || (s.existing ? canEdit : canCreate) && (!s.firstEntry || (inputs[m.code]?.previous ?? '') !== '')
      && (!s.mvFirst || !s.mvHas || (inputs[m.code]?.mvPrevious ?? '') !== ''));

  const handleSaveAll = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    const failures: string[] = [];
    let saved = 0;
    for (const { m, s } of states) {
      if (!s.dirty) continue;
      // MVArh is optional; the previous MVArh reading is only sent for the meter's first MVArh entry
      const mvarh = {
        mvarhCurrentReading: s.mvHas ? Number(s.mvCurrentStr) : null,
        mvarhPreviousReading: s.mvFirst && s.mvHas ? Number(inputs[m.code]?.mvPrevious) : undefined,
      };
      try {
        if (s.existing) {
          await dailyStationEnergyConsumptionApi.update(s.existing.id, { currentReading: Number(s.currentStr), ...mvarh });
        } else {
          await dailyStationEnergyConsumptionApi.create({
            plantCode,
            transformerCode: m.code,
            transformerName: m.code ? m.name : '',
            logDate,
            previousReading: s.firstEntry ? Number(inputs[m.code]?.previous) : undefined,
            currentReading: Number(s.currentStr),
            ...mvarh,
          });
        }
        saved += 1;
      } catch (err) {
        const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Failed to save.';
        failures.push(`${m.name}: ${msg}`);
      }
    }
    await fetchRecords();
    setInputs({});
    if (saved > 0) setSaveSuccess(`${saved} reading${saved === 1 ? '' : 's'} saved.`);
    if (failures.length) setSaveError(failures.join(' | '));
    setSaving(false);
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

  const selectedPlant = plants.find((p) => p.plantCode === plantCode);
  const label = (t: string) => (
    <Typography variant="caption" color="text.secondary"
      sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>{t}</Typography>
  );

  return (
    <Box>
      <PageHeader
        title="Daily Station Energy Consumption"
        subtitle="Daily MWh and MVArh readings recorded per station service transformer (SST / TSS) — Hydro and Thermal plants"
        breadcrumbs={[{ label: 'Daily Readings' }, { label: 'Station Energy Consumption' }]}
      />

      <Grid container spacing={3}>
        {/* ── Left: entry ── */}
        <Grid size={{ xs: 12, lg: 7 }}>
          <Card>
            <CardHeader
              title={
                <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1.5}>
                  <ElectricMeter sx={{ color: '#1565C0' }} />
                  <Typography sx={{ fontWeight: 700 }}>Daily Readings</Typography>
                </Stack>
              }
            />
            <Divider />
            <CardContent>
              {saveError && <Alert severity="error" onClose={() => setSaveError(null)} sx={{ mb: 2 }}>{saveError}</Alert>}
              {saveSuccess && <Alert severity="success" onClose={() => setSaveSuccess(null)} sx={{ mb: 2 }}>{saveSuccess}</Alert>}

              <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2 }}>
                {label('Log Identity')}
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth required disabled={plantLocked}>
                      <InputLabel>Power Plant</InputLabel>
                      <Select label="Power Plant" value={plantCode} onChange={(e) => setPlantCode(e.target.value)}>
                        {availablePlants.map((p: PowerPlant) => (
                          <MenuItem key={p.id} value={p.plantCode}>
                            {p.plantName} ({p.plantCode}) — {p.classificationType}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Log Date" type="date" fullWidth required value={logDate}
                      onChange={(e) => setLogDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
                  </Grid>
                  {selectedPlant && (
                    <Grid size={{ xs: 12 }}>
                      <Chip label={selectedPlant.classificationType} size="small" variant="outlined"
                        color={selectedPlant.classificationType === 'Hydro' ? 'info' : 'error'} />
                    </Grid>
                  )}
                </Grid>
              </Paper>

              {!plantCode ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                  Select a plant to see its station service transformers.
                </Typography>
              ) : loadingTransformers ? (
                <Box sx={{ textAlign: 'center', py: 3 }}><CircularProgress size={24} /></Box>
              ) : (
                <>
                  {transformers.length === 0 && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      No transformers found in master data for this plant — recording a single plant-level meter. Add the SST/TSS under the plant's equipment to get a card for each.
                    </Alert>
                  )}
                  {noTss && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      No transformer matching TSS / SST / "station service" was found, so all of the plant's transformers are listed.
                    </Alert>
                  )}
                  {tss.length > 0 && tss.length < transformers.length && (
                    <FormControlLabel sx={{ mb: 1 }}
                      control={<Switch size="small" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />}
                      label={<Typography variant="body2">Show all transformers ({transformers.length})</Typography>} />
                  )}

                  <Grid container spacing={2}>
                    {states.map(({ m, s }) => (
                      <Grid key={m.code || 'plant'} size={{ xs: 12, md: 6 }}>
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
                            <ElectricMeter fontSize="small" color="primary" />
                            <Typography sx={{ fontWeight: 700, flexGrow: 1 }} noWrap>{m.name}</Typography>
                            {m.code && <Chip size="small" label={m.code} variant="outlined" />}
                            {s.existing && <Chip size="small" color="success" label="Logged" />}
                          </Stack>
                          <Grid container spacing={1.5}>
                            <Grid size={{ xs: 6 }}>
                              <TextField label="Previous" size="small" fullWidth
                                type={s.firstEntry ? 'number' : 'text'}
                                disabled={!s.firstEntry}
                                required={s.firstEntry}
                                value={s.firstEntry ? (inputs[m.code]?.previous ?? '') : s.previous.toFixed(2)}
                                onChange={(e) => s.firstEntry && patchInput(m.code, { previous: e.target.value })}
                                helperText={s.firstEntry ? 'First entry' : 'Auto-carried'} />
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                              <TextField label="Current" type="number" size="small" fullWidth
                                disabled={s.existing ? !canEdit : !canCreate}
                                value={s.currentStr}
                                onChange={(e) => patchInput(m.code, { current: e.target.value })}
                                slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">MWh</Typography> } }} />
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                              <TextField label="Previous MVArh" size="small" fullWidth
                                type={s.mvFirst ? 'number' : 'text'}
                                disabled={!s.mvFirst}
                                required={s.mvFirst && s.mvHas}
                                value={s.mvFirst ? (inputs[m.code]?.mvPrevious ?? '') : s.mvPrevious.toFixed(2)}
                                onChange={(e) => s.mvFirst && patchInput(m.code, { mvPrevious: e.target.value })}
                                helperText={s.mvFirst ? 'First MVArh entry' : 'Auto-carried'} />
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                              <TextField label="Current MVArh" type="number" size="small" fullWidth
                                disabled={s.existing ? !canEdit : !canCreate}
                                value={s.mvCurrentStr}
                                onChange={(e) => patchInput(m.code, { mvCurrent: e.target.value })}
                                helperText="Optional"
                                slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">MVArh</Typography> } }} />
                            </Grid>
                          </Grid>
                          <Divider sx={{ my: 1.5 }} />
                          <Stack direction="row" spacing={3}>
                            <Box>
                              <Typography variant="caption" color="text.secondary">Difference</Typography>
                              <Typography sx={{ fontWeight: 700 }} color={s.difference < 0 ? 'error.main' : 'text.primary'}>
                                {s.hasCurrent ? s.difference.toFixed(2) : '—'}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary">Progressive (month)</Typography>
                              <Typography sx={{ fontWeight: 700 }}>{s.hasCurrent ? s.progressive.toFixed(2) : '—'}</Typography>
                            </Box>
                          </Stack>
                          <Stack direction="row" spacing={3} sx={{ mt: 1 }}>
                            <Box>
                              <Typography variant="caption" color="text.secondary">MVArh difference</Typography>
                              <Typography sx={{ fontWeight: 700 }} color={s.mvDifference < 0 ? 'error.main' : 'text.primary'}>
                                {s.mvHas ? s.mvDifference.toFixed(2) : '—'}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary">MVArh progressive (month)</Typography>
                              <Typography sx={{ fontWeight: 700 }}>{s.mvHas ? s.mvProgressive.toFixed(2) : '—'}</Typography>
                            </Box>
                          </Stack>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>

                  {states.length > 1 && (
                    <Paper variant="outlined" sx={{ p: 2, mt: 2, borderRadius: 2, backgroundColor: 'action.hover' }}>
                      <Typography variant="caption" color="text.secondary">Plant total for {logDate} (sum of the cards above)</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {plantTotal.toFixed(2)} MWh{anyMv ? ` · ${plantMvTotal.toFixed(2)} MVArh` : ''}
                      </Typography>
                    </Paper>
                  )}

                  <Stack direction="row" spacing={1.5} sx={{ mt: 2.5 }}>
                    <Button variant="contained" onClick={handleSaveAll} disabled={saving || !canSaveAll}
                      startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />} sx={{ minWidth: 160 }}>
                      {saving ? 'Saving...' : dirtyCount > 1 ? `Save ${dirtyCount} Readings` : 'Save Reading'}
                    </Button>
                    {dirtyCount > 0 && !saving && (
                      <Button variant="outlined" onClick={() => setInputs({})}>Reset</Button>
                    )}
                  </Stack>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* ── Right: logged readings ── */}
        <Grid size={{ xs: 12, lg: 5 }}>
          <Card>
            <CardHeader
              title={
                <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1}>
                  <History sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
                  <Typography sx={{ fontWeight: 700 }}>Logged Readings</Typography>
                  {loadingRecords && <CircularProgress size={14} />}
                </Stack>
              }
            />
            <Divider />
            <CardContent>
              {recordsError && <Alert severity="error" onClose={() => setRecordsError(null)} sx={{ mb: 1.5 }}>{recordsError}</Alert>}
              {sortedRecords.length === 0 && !loadingRecords ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <ElectricMeter sx={{ fontSize: '2rem', color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    {plantCode ? 'No records found.' : 'Select a plant to see its readings.'}
                  </Typography>
                </Box>
              ) : (
                <TableContainer sx={{ maxHeight: 620 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Transformer</TableCell>
                        <TableCell>Current<Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>MWh / MVArh</Typography></TableCell>
                        <TableCell>Diff</TableCell>
                        <TableCell>Progr.</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sortedRecords.map((row) => (
                        <TableRow key={row.id} data-record-id={row.id} selected={dateOnly(row.logDate) === logDate} hover>
                          <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{dateOnly(row.logDate)}</Typography></TableCell>
                          <TableCell>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 120 }}>
                              {row.transformerName || row.transformerCode || 'Plant (legacy)'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{row.currentReading.toFixed(1)}</Typography>
                            {row.mvarhCurrentReading != null && <Typography variant="caption" color="text.secondary">{row.mvarhCurrentReading.toFixed(1)}</Typography>}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color={row.difference < 0 ? 'error.main' : 'text.primary'}>{row.difference.toFixed(1)}</Typography>
                            {row.mvarhDifference != null && (
                              <Typography variant="caption" color={row.mvarhDifference < 0 ? 'error.main' : 'text.secondary'}>{row.mvarhDifference.toFixed(1)}</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.progressiveTotal.toFixed(1)}</Typography>
                            {row.mvarhProgressiveTotal != null && <Typography variant="caption" color="text.secondary">{row.mvarhProgressiveTotal.toFixed(1)}</Typography>}
                          </TableCell>
                          <TableCell align="right">
                            {canEdit && (
                              <Tooltip title="Open this date to edit">
                                <IconButton size="small" color="primary" onClick={() => setLogDate(dateOnly(row.logDate))}>
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
        message={`Delete the ${deleteTarget?.transformerName || deleteTarget?.transformerCode || 'plant-level'} reading for ${deleteTarget?.plantCode} on ${deleteTarget ? dateOnly(deleteTarget.logDate) : ''}? Later readings of the same transformer will be recomputed.`}
        confirmLabel="Delete" loading={deleting}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}

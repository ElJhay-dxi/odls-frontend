import {
  Box, Card, CardContent, CardHeader, TextField, Button, CircularProgress,
  Alert, Typography, MenuItem, FormControl, InputLabel, Select,
  Grid, Divider, Chip, Stack, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Tooltip, Tab, Tabs,
} from '@mui/material';
import { Save, Search, Edit, Delete, Water, History } from '@mui/icons-material';
import { useEffect, useState, useCallback, type SyntheticEvent } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import {
  freshwaterInflowApi, freshwaterTotalizerApi, freshwaterTankLevelApi,
  deminWaterTankLevelApi, gtCo2LevelApi, desalinatedWaterApi,
} from '../../api/daily/waterSystemApi';
import type { PowerPlant } from '../../types/masterData';
import type { WaterMeterReading, DeminWaterTankLevel } from '../../types/waterSystem';
import { useSectionPermissions } from '../../hooks/usePermission';

const TABS = [
  { label: 'a) FW Inflow', key: 'fwInflow' },
  { label: 'b) FW Totalizer', key: 'fwTotalizer' },
  { label: 'c) FW Tank Level', key: 'fwTankLevel' },
  { label: 'd) Demin Water', key: 'deminWater' },
  { label: 'e) GT CO₂', key: 'gtCo2' },
  { label: 'f) Desalinated', key: 'desalinated' },
];

interface MeterSubFormProps {
  plantCode: string; logDate: string;
  currentReading: string; setCurrentReading: (v: string) => void;
  showProgressive: boolean;
  priorRecord: WaterMeterReading | DeminWaterTankLevel | null;
  loadingPrior: boolean;
  editTarget: Record<string, unknown> | null;
  unit: string;
  manualPrev: string; setManualPrev: (v: string) => void;
}

function MeterSubForm({ priorRecord, loadingPrior, editTarget, currentReading,
  setCurrentReading, showProgressive, unit, manualPrev, setManualPrev }: MeterSubFormProps) {
  const isFirstEntry = !editTarget && !priorRecord && !loadingPrior;
  const prevVal = editTarget ? Number(editTarget.previousReading) || 0
    : priorRecord ? priorRecord.currentReading
    : Number(manualPrev) || 0;
  const diff = (Number(currentReading) || 0) - prevVal;
  const priorTotal = editTarget
    ? (Number(editTarget.progressiveTotal) || 0) - (Number(editTarget.difference) || 0)
    : (priorRecord as WaterMeterReading)?.progressiveTotal ?? 0;
  return (
    <Stack spacing={2}>
      <TextField label="Previous Reading" fullWidth
        type={isFirstEntry ? 'number' : 'text'} disabled={!isFirstEntry}
        value={isFirstEntry ? manualPrev : loadingPrior ? '…' : prevVal.toFixed(2)}
        onChange={(e) => isFirstEntry && setManualPrev(e.target.value)}
        helperText={isFirstEntry ? 'Enter prior reading (first entry only)' : 'Auto-carried from prior day'}
        slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">{unit}</Typography> } }}
      />
      <TextField label="Current Reading" type="number" fullWidth required
        value={currentReading} onChange={(e) => setCurrentReading(e.target.value)}
        slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">{unit}</Typography> } }}
      />
      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, backgroundColor: 'action.hover' }}>
        <Stack direction="row" spacing={3}>
          <Box>
            <Typography variant="caption" color="text.secondary">Difference</Typography>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>{diff.toFixed(2)} {unit}</Typography>
          </Box>
          {showProgressive && (
            <Box>
              <Typography variant="caption" color="text.secondary">Progressive Total</Typography>
              <Typography variant="body1" sx={{ fontWeight: 700 }}>{(priorTotal + diff).toFixed(2)} {unit}</Typography>
            </Box>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}

export default function WaterSystemReadingsPage() {
  const { canCreate, canEdit, canDelete } = useSectionPermissions('daily.water_system');
  const [tabIndex, setTabIndex] = useState(0);
  const [plants, setPlants] = useState<PowerPlant[]>([]);

  const [plantCode, setPlantCode] = useState('');
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualPrev, setManualPrev] = useState('');
  const [currentReading, setCurrentReading] = useState('');
  const [levelPct, setLevelPct] = useState('');
  const [pressure, setPressure] = useState('');
  const [co2Pct, setCo2Pct] = useState('');
  const [priorRecord, setPriorRecord] = useState<WaterMeterReading | DeminWaterTankLevel | null>(null);
  const [loadingPrior, setLoadingPrior] = useState(false);
  const [editTarget, setEditTarget] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [filterPlant, setFilterPlant] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const tabKey = TABS[tabIndex].key;
  const isMeterTab = ['fwInflow', 'fwTotalizer', 'deminWater', 'desalinated'].includes(tabKey);

  const getApi = useCallback(() => {
    switch (tabKey) {
      case 'fwInflow': return freshwaterInflowApi;
      case 'fwTotalizer': return freshwaterTotalizerApi;
      case 'fwTankLevel': return freshwaterTankLevelApi;
      case 'deminWater': return deminWaterTankLevelApi;
      case 'gtCo2': return gtCo2LevelApi;
      case 'desalinated': return desalinatedWaterApi;
      default: return freshwaterInflowApi;
    }
  }, [tabKey]);

  useEffect(() => {
    powerPlantApi.getAll().then((res) => {
      setPlants(res.data.filter((p) => p.classificationType === 'Thermal'));
    });
  }, []);

  useEffect(() => {
    setPlantCode(''); setLogDate(new Date().toISOString().split('T')[0]);
    setCurrentReading(''); setLevelPct(''); setPressure(''); setCo2Pct('');
    setManualPrev(''); setPriorRecord(null); setEditTarget(null);
    setSaveError(null); setSaveSuccess(false); setRecords([]);
  }, [tabIndex]);

  useEffect(() => {
    if (!isMeterTab || !plantCode || !logDate || editTarget) { setPriorRecord(null); return; }
    setLoadingPrior(true);
    getApi().getAll({ plantCode, date: undefined })
      .then((res) => {
        const sorted = (res.data as WaterMeterReading[])
          .filter((r) => r.logDate.split('T')[0] < logDate)
          .sort((a, b) => b.logDate.localeCompare(a.logDate));
        setPriorRecord((sorted[0] as WaterMeterReading) ?? null);
      })
      .catch(() => setPriorRecord(null))
      .finally(() => setLoadingPrior(false));
  }, [plantCode, logDate, tabKey, editTarget, isMeterTab, getApi]);

  const fetchRecords = useCallback(async () => {
    if (!filterPlant) return;
    setLoadingRecords(true);
    setRecordsError(null);
    try {
      const res = await getApi().getAll({ plantCode: filterPlant, date: filterDate || undefined });
      setRecords((res.data as unknown as Record<string, unknown>[]).sort((a, b) =>
        String(b.logDate ?? '').localeCompare(String(a.logDate ?? ''))
      ));
    } catch {
      setRecordsError('Failed to load records.');
    } finally {
      setLoadingRecords(false);
    }
  }, [filterPlant, filterDate, getApi]);

  const resetForm = () => {
    setCurrentReading(''); setLevelPct(''); setPressure(''); setCo2Pct('');
    setManualPrev(''); setPriorRecord(null); setEditTarget(null);
  };

  const openEdit = (row: Record<string, unknown>) => {
    setEditTarget(row);
    setSaveError(null); setSaveSuccess(false);
    setPlantCode(row.plantCode as string);
    setLogDate((row.logDate as string).split('T')[0]);
    setCurrentReading(String(row.currentReading ?? row.levelPct ?? ''));
    setPressure(String(row.pressure ?? ''));
    setCo2Pct(String(row.co2Pct ?? ''));
  };

  const buildPayload = () => {
    const base = { plantCode, logDate };
    const isFirst = !editTarget && !priorRecord && !loadingPrior;
    switch (tabKey) {
      case 'fwInflow': case 'fwTotalizer': case 'desalinated':
        return editTarget
          ? { currentReading: Number(currentReading) }
          : { ...base, previousReading: isFirst ? Number(manualPrev) : undefined, currentReading: Number(currentReading) };
      case 'deminWater':
        return editTarget
          ? { currentReading: Number(currentReading) }
          : { ...base, previousReading: isFirst ? Number(manualPrev) : undefined, currentReading: Number(currentReading) };
      case 'fwTankLevel':
        return editTarget ? { levelPct: Number(levelPct) } : { ...base, levelPct: Number(levelPct) };
      case 'gtCo2':
        return editTarget
          ? { pressure: Number(pressure), co2Pct: Number(co2Pct) }
          : { ...base, pressure: Number(pressure), co2Pct: Number(co2Pct) };
      default: return base;
    }
  };

  const handleSave = async () => {
    setSaving(true); setSaveError(null); setSaveSuccess(false);
    try {
      const api = getApi();
      if (editTarget) {
        await api.update(editTarget.id as string, buildPayload());
      } else {
        await api.create(buildPayload());
      }
      setSaveSuccess(true);
      resetForm();
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
      await getApi().delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchRecords();
    } catch {
      setRecordsError('Failed to delete record.');
    } finally {
      setDeleting(false);
    }
  };

  const renderForm = () => (
    <Stack spacing={2}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControl fullWidth required disabled={!!editTarget}>
            <InputLabel>Power Plant</InputLabel>
            <Select label="Power Plant" value={plantCode} onChange={(e) => setPlantCode(e.target.value)}>
              {plants.map((p) => (
                <MenuItem key={p.id} value={p.plantCode}>{p.plantName} ({p.plantCode})</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField label="Log Date" type="date" fullWidth required disabled={!!editTarget}
            value={logDate} onChange={(e) => setLogDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Grid>
      </Grid>
      {['fwInflow', 'fwTotalizer', 'desalinated'].includes(tabKey) && (
        <MeterSubForm plantCode={plantCode} logDate={logDate}
          currentReading={currentReading} setCurrentReading={setCurrentReading}
          showProgressive priorRecord={priorRecord} loadingPrior={loadingPrior}
          editTarget={editTarget} unit="m³"
          manualPrev={manualPrev} setManualPrev={setManualPrev}
        />
      )}
      {tabKey === 'deminWater' && (
        <MeterSubForm plantCode={plantCode} logDate={logDate}
          currentReading={currentReading} setCurrentReading={setCurrentReading}
          showProgressive={false} priorRecord={priorRecord} loadingPrior={loadingPrior}
          editTarget={editTarget} unit="m"
          manualPrev={manualPrev} setManualPrev={setManualPrev}
        />
      )}
      {tabKey === 'fwTankLevel' && (
        <TextField label="Tank Level" type="number" fullWidth required
          value={levelPct} onChange={(e) => setLevelPct(e.target.value)}
          slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">%</Typography> } }}
        />
      )}
      {tabKey === 'gtCo2' && (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Pressure" type="number" fullWidth required
              value={pressure} onChange={(e) => setPressure(e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="CO₂ %" type="number" fullWidth required
              value={co2Pct} onChange={(e) => setCo2Pct(e.target.value)}
              slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">%</Typography> } }}
            />
          </Grid>
        </Grid>
      )}
    </Stack>
  );

  const renderRow = (row: Record<string, unknown>, idx: number) => {
    const r = row;
    const date = (r.logDate as string)?.split('T')[0];
    return (
      <TableRow key={idx} hover>
        <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{date}</Typography></TableCell>
        <TableCell>
          {['fwInflow', 'fwTotalizer', 'desalinated', 'deminWater'].includes(tabKey) && (
            <Typography variant="body2">{Number(r.currentReading).toFixed(2)}</Typography>
          )}
          {tabKey === 'fwTankLevel' && <Typography variant="body2">{Number(r.levelPct).toFixed(1)}%</Typography>}
          {tabKey === 'gtCo2' && <Typography variant="body2">{Number(r.pressure)} / {Number(r.co2Pct)}%</Typography>}
        </TableCell>
        {['fwInflow', 'fwTotalizer', 'desalinated'].includes(tabKey) && (
          <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{Number(r.progressiveTotal).toFixed(2)}</Typography></TableCell>
        )}
        {tabKey === 'deminWater' && (
          <TableCell><Typography variant="body2">{Number(r.difference).toFixed(2)}</Typography></TableCell>
        )}
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
              <IconButton size="small" color="error"
                onClick={() => setDeleteTarget({ id: String(r.id), label: `${r.plantCode} on ${date}` })}>
                <Delete fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </TableCell>
      </TableRow>
    );
  };

  return (
    <Box>
      <PageHeader
        title="Water System Readings"
        subtitle="Daily water system readings for thermal plants — sections a through f"
        breadcrumbs={[{ label: 'Daily Readings' }, { label: 'Water System' }]}
      />
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabIndex} onChange={(_: SyntheticEvent, v: number) => setTabIndex(v)}
          variant="scrollable" scrollButtons="auto">
          {TABS.map((t, i) => <Tab key={t.key} label={t.label} value={i} />)}
        </Tabs>
      </Box>
      <Grid container spacing={3}>
        {/* ── Left: Entry form ── */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card>
            <CardHeader
              title={
                <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1.5}>
                  <Water sx={{ color: '#1565C0' }} />
                  <Typography sx={{ fontWeight: 700 }}>
                    {editTarget ? `Editing: ${editTarget.plantCode} — ${(editTarget.logDate as string)?.split('T')[0]}` : 'New Reading'}
                  </Typography>
                  {editTarget && <Chip label="Edit Mode" size="small" color="warning" onDelete={resetForm} />}
                </Stack>
              }
            />
            <Divider />
            <CardContent>
              {saveError && <Alert severity="error" onClose={() => setSaveError(null)} sx={{ mb: 2 }}>{saveError}</Alert>}
              {saveSuccess && <Alert severity="success" onClose={() => setSaveSuccess(false)} sx={{ mb: 2 }}>Saved successfully.</Alert>}
              {renderForm()}
              <Stack direction="row" spacing={1.5} sx={{ mt: 2.5 }}>
                {editTarget && <Button variant="outlined" onClick={resetForm} disabled={saving}>Cancel</Button>}
                {(editTarget ? canEdit : canCreate) && (
                  <Button variant="contained" onClick={handleSave}
                    disabled={saving || !plantCode || !logDate}
                    startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />}
                    sx={{ minWidth: 140 }}>
                    {saving ? 'Saving...' : editTarget ? 'Update' : 'Save Reading'}
                  </Button>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* ── Right: Records ── */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card>
            <CardHeader title={
              <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1}>
                <History sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
                <Typography sx={{ fontWeight: 700 }}>Logged Readings</Typography>
              </Stack>
            } />
            <Divider />
            <CardContent>
              <Stack spacing={1.5} sx={{ mb: 2 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Plant</InputLabel>
                  <Select label="Plant" value={filterPlant} onChange={(e) => setFilterPlant(e.target.value)}>
                    <MenuItem value="">Select plant…</MenuItem>
                    {plants.map((p) => <MenuItem key={p.id} value={p.plantCode}>{p.plantName}</MenuItem>)}
                  </Select>
                </FormControl>
                <Stack direction="row" spacing={1}>
                  <TextField label="Date" type="date" size="small" value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)} sx={{ flex: 1 }}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
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
                  <Water sx={{ fontSize: '2rem', color: 'text.disabled', mb: 1 }} />
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
                        <TableCell>Reading</TableCell>
                        {['fwInflow', 'fwTotalizer', 'desalinated'].includes(tabKey) && <TableCell>Progressive</TableCell>}
                        {tabKey === 'deminWater' && <TableCell>Diff</TableCell>}
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>{records.map((r, i) => renderRow(r as Record<string, unknown>, i))}</TableBody>
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
        message={`Delete water system reading for ${deleteTarget?.label}?`}
        confirmLabel="Delete" loading={deleting}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
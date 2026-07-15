import {
  Box, Card, CardContent, CardHeader, TextField, Button, CircularProgress,
  Alert, Typography, MenuItem, FormControl, InputLabel, Select,
  Grid, Divider, Chip, Stack, Paper, Tab, Tabs,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, IconButton, Tooltip,
} from '@mui/material';
import { Save, Search, Edit, Delete, WaterDrop, History } from '@mui/icons-material';
import { useEffect, useState, useCallback, type SyntheticEvent } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { hydroWaterLevelApi, hydroWaterDischargeApi } from '../../api/daily/waterSystemApi';
import type { PowerPlant } from '../../types/masterData';
import type { HydroWaterLevel, HydroWaterDischarge } from '../../types/waterSystem';
import { useSectionPermissions } from '../../hooks/usePermission';

const TABS = [
  { label: 'Water Levels', key: 'levels' },
  { label: 'Water Discharge', key: 'discharge' },
];

export default function HydrologyPage() {
  const { canCreate, canEdit, canDelete } = useSectionPermissions('daily.hydrology');
  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const [tabIndex, setTabIndex] = useState(0);

  // Form state
  const [plantCode, setPlantCode] = useState('');
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);

  // Water Levels fields
  const [headWaterLevel, setHeadWaterLevel] = useState('');
  const [tailWaterLevel, setTailWaterLevel] = useState('');

  // Water Discharge fields
  const [unitDischarge, setUnitDischarge] = useState('');
  const [spillwayDischarge, setSpillwayDischarge] = useState('');
  const [effKwCfs, setEffKwCfs] = useState('');
  const [effKwMcs, setEffKwMcs] = useState('');

  const [editTarget, setEditTarget] = useState<HydroWaterLevel | HydroWaterDischarge | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Records
  const [filterPlant, setFilterPlant] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [levelRecords, setLevelRecords] = useState<HydroWaterLevel[]>([]);
  const [dischargeRecords, setDischargeRecords] = useState<HydroWaterDischarge[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    powerPlantApi.getAll().then((res) =>
      setPlants(res.data.filter((p) => p.classificationType === 'Hydro'))
    );
  }, []);

  // Reset on tab change
  useEffect(() => {
    setPlantCode(''); setLogDate(new Date().toISOString().split('T')[0]);
    setHeadWaterLevel(''); setTailWaterLevel('');
    setUnitDischarge(''); setSpillwayDischarge(''); setEffKwCfs(''); setEffKwMcs('');
    setEditTarget(null); setSaveError(null); setSaveSuccess(false);
  }, [tabIndex]);

  const fetchRecords = useCallback(async () => {
    if (!filterPlant) return;
    setLoadingRecords(true); setRecordsError(null);
    try {
      const params = { plantCode: filterPlant, date: filterDate || undefined };
      const [lvl, dis] = await Promise.all([
        hydroWaterLevelApi.getAll(params),
        hydroWaterDischargeApi.getAll(params),
      ]);
      setLevelRecords(lvl.data.sort((a, b) => b.logDate.localeCompare(a.logDate)));
      setDischargeRecords(dis.data.sort((a, b) => b.logDate.localeCompare(a.logDate)));
    } catch {
      setRecordsError('Failed to load records.');
    } finally {
      setLoadingRecords(false);
    }
  }, [filterPlant, filterDate]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const resetForm = () => {
    setEditTarget(null);
    setHeadWaterLevel(''); setTailWaterLevel('');
    setUnitDischarge(''); setSpillwayDischarge(''); setEffKwCfs(''); setEffKwMcs('');
    setSaveError(null); setSaveSuccess(false);
  };

  const openEditLevel = (row: HydroWaterLevel) => {
    setEditTarget(row); setTabIndex(0); setSaveError(null); setSaveSuccess(false);
    setPlantCode(row.plantCode); setLogDate(row.logDate.split('T')[0]);
    setHeadWaterLevel(String(row.headWaterLevel));
    setTailWaterLevel(String(row.tailWaterLevel));
  };

  const openEditDischarge = (row: HydroWaterDischarge) => {
    setEditTarget(row); setTabIndex(1); setSaveError(null); setSaveSuccess(false);
    setPlantCode(row.plantCode); setLogDate(row.logDate.split('T')[0]);
    setUnitDischarge(String(row.unitDischarge));
    setSpillwayDischarge(String(row.spillwayDischarge));
    setEffKwCfs(String(row.efficiencyKwCfs));
    setEffKwMcs(String(row.efficiencyKwMcs));
  };

  const handleSave = async () => {
    setSaving(true); setSaveError(null); setSaveSuccess(false);
    try {
      const isLevels = tabIndex === 0;
      if (isLevels) {
        const payload = {
          headWaterLevel: Number(headWaterLevel),
          tailWaterLevel: Number(tailWaterLevel),
        };
        if (editTarget) {
          await hydroWaterLevelApi.update(editTarget.id, payload);
        } else {
          await hydroWaterLevelApi.create({ plantCode, logDate, ...payload });
        }
      } else {
        const payload = {
          unitDischarge: Number(unitDischarge),
          spillwayDischarge: Number(spillwayDischarge),
          efficiencyKwCfs: Number(effKwCfs),
          efficiencyKwMcs: Number(effKwMcs),
        };
        if (editTarget) {
          await hydroWaterDischargeApi.update(editTarget.id, payload);
        } else {
          await hydroWaterDischargeApi.create({ plantCode, logDate, ...payload });
        }
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
      if (tabIndex === 0) await hydroWaterLevelApi.delete(deleteTarget.id);
      else await hydroWaterDischargeApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchRecords();
    } catch {
      setRecordsError('Failed to delete record.');
    } finally {
      setDeleting(false);
    }
  };

  // Live preview for water levels
  const netHead = (Number(headWaterLevel) || 0) - (Number(tailWaterLevel) || 0);
  const isFormValid = tabIndex === 0
    ? plantCode && logDate && headWaterLevel !== '' && tailWaterLevel !== ''
    : plantCode && logDate && unitDischarge !== '' && spillwayDischarge !== '';

  return (
    <Box>
      <PageHeader
        title="Hydrology"
        subtitle="Daily hydro water levels and discharge readings — Hydro plants only"
        breadcrumbs={[{ label: 'Hydrology' }]}
      />

      <Tabs value={tabIndex} onChange={(_: SyntheticEvent, v: number) => setTabIndex(v)}
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        {TABS.map((t, i) => <Tab key={t.key} label={t.label} value={i} />)}
      </Tabs>

      <Grid container spacing={3}>
        {/* ── Left: Entry form ── */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card>
            <CardHeader
              title={
                <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1.5}>
                  <WaterDrop sx={{ color: '#1565C0' }} />
                  <Typography sx={{ fontWeight: 700 }}>
                    {editTarget
                      ? `Editing: ${(editTarget as HydroWaterLevel).plantCode} — ${(editTarget as HydroWaterLevel).logDate?.split('T')[0]}`
                      : `New ${TABS[tabIndex].label} Reading`}
                  </Typography>
                  {editTarget && <Chip label="Edit Mode" size="small" color="warning" onDelete={resetForm} />}
                </Stack>
              }
            />
            <Divider />
            <CardContent>
              {saveError && <Alert severity="error" onClose={() => setSaveError(null)} sx={{ mb: 2 }}>{saveError}</Alert>}
              {saveSuccess && <Alert severity="success" onClose={() => setSaveSuccess(false)} sx={{ mb: 2 }}>Saved successfully.</Alert>}

              <Stack spacing={2.5}>
                {/* Identity */}
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth required disabled={!!editTarget}>
                      <InputLabel>Hydro Plant</InputLabel>
                      <Select label="Hydro Plant" value={plantCode} onChange={(e) => setPlantCode(e.target.value)}>
                        {plants.map((p) => (
                          <MenuItem key={p.id} value={p.plantCode}>{p.plantName} ({p.plantCode})</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Log Date" type="date" fullWidth required
                      disabled={!!editTarget} value={logDate}
                      onChange={(e) => setLogDate(e.target.value)}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid>
                </Grid>

                {/* Water Levels fields */}
                {tabIndex === 0 && (
                  <>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField label="Head Water Level" type="number" fullWidth required
                          value={headWaterLevel} onChange={(e) => setHeadWaterLevel(e.target.value)}
                          slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">m</Typography> } }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField label="Tail Water Level" type="number" fullWidth required
                          value={tailWaterLevel} onChange={(e) => setTailWaterLevel(e.target.value)}
                          slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">m</Typography> } }}
                        />
                      </Grid>
                    </Grid>
                    {(headWaterLevel || tailWaterLevel) && (
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, backgroundColor: 'action.hover' }}>
                        <Typography variant="caption" color="text.secondary">Net Head</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>{netHead.toFixed(3)} m</Typography>
                        <Typography variant="caption" color="text.secondary">Head Water − Tail Water</Typography>
                      </Paper>
                    )}
                  </>
                )}

                {/* Water Discharge fields */}
                {tabIndex === 1 && (
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField label="Unit Discharge" type="number" fullWidth required
                        value={unitDischarge} onChange={(e) => setUnitDischarge(e.target.value)} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField label="Spillway Discharge" type="number" fullWidth required
                        value={spillwayDischarge} onChange={(e) => setSpillwayDischarge(e.target.value)} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField label="Efficiency (kW/cfs)" type="number" fullWidth required
                        value={effKwCfs} onChange={(e) => setEffKwCfs(e.target.value)} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField label="Efficiency (kW/mcs)" type="number" fullWidth required
                        value={effKwMcs} onChange={(e) => setEffKwMcs(e.target.value)} />
                    </Grid>
                  </Grid>
                )}

                <Stack direction="row" spacing={1.5}>
                  {editTarget && <Button variant="outlined" onClick={resetForm} disabled={saving}>Cancel</Button>}
                  {(editTarget ? canEdit : canCreate) && (
                <Button variant="contained" onClick={handleSave}
                    disabled={saving || !isFormValid}
                    startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />}
                    sx={{ minWidth: 140 }}>
                    {saving ? 'Saving...' : editTarget ? 'Update Reading' : 'Save Reading'}
                  </Button>
              )}
                </Stack>
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

              {/* Water Levels table */}
              {tabIndex === 0 && (
                levelRecords.length === 0 && !loadingRecords ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <WaterDrop sx={{ fontSize: '2rem', color: 'text.disabled', mb: 1 }} />
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
                          <TableCell>Head (m)</TableCell>
                          <TableCell>Tail (m)</TableCell>
                          <TableCell>Net Head (m)</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {levelRecords.map((row) => (
                          <TableRow key={row.id} hover>
                            <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{row.logDate.split('T')[0]}</Typography></TableCell>
                            <TableCell><Typography variant="body2">{row.headWaterLevel.toFixed(3)}</Typography></TableCell>
                            <TableCell><Typography variant="body2">{row.tailWaterLevel.toFixed(3)}</Typography></TableCell>
                            <TableCell>
                              <Chip label={row.netHead.toFixed(3)} size="small" color="info" variant="outlined" sx={{ fontWeight: 700 }} />
                            </TableCell>
                            <TableCell align="right">
                              {canEdit && (
                              <Tooltip title="Edit">
                                <IconButton size="small" color="primary" onClick={() => openEditLevel(row)}>
                                  <Edit fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                              {canDelete && (
                              <Tooltip title="Delete">
                                <IconButton size="small" color="error"
                                  onClick={() => setDeleteTarget({ id: row.id, label: `${row.plantCode} levels on ${row.logDate.split('T')[0]}` })}>
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
                )
              )}

              {/* Water Discharge table */}
              {tabIndex === 1 && (
                dischargeRecords.length === 0 && !loadingRecords ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <WaterDrop sx={{ fontSize: '2rem', color: 'text.disabled', mb: 1 }} />
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
                          <TableCell>Unit Discharge</TableCell>
                          <TableCell>Spillway</TableCell>
                          <TableCell>Eff. kW/cfs</TableCell>
                          <TableCell>Eff. kW/mcs</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {dischargeRecords.map((row) => (
                          <TableRow key={row.id} hover>
                            <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{row.logDate.split('T')[0]}</Typography></TableCell>
                            <TableCell><Typography variant="body2">{row.unitDischarge}</Typography></TableCell>
                            <TableCell><Typography variant="body2">{row.spillwayDischarge}</Typography></TableCell>
                            <TableCell><Typography variant="body2">{row.efficiencyKwCfs}</Typography></TableCell>
                            <TableCell><Typography variant="body2">{row.efficiencyKwMcs}</Typography></TableCell>
                            <TableCell align="right">
                              <Tooltip title="Edit">
                                <IconButton size="small" color="primary" onClick={() => openEditDischarge(row)}>
                                  <Edit fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton size="small" color="error"
                                  onClick={() => setDeleteTarget({ id: row.id, label: `${row.plantCode} discharge on ${row.logDate.split('T')[0]}` })}>
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Reading"
        message={`Delete ${deleteTarget?.label}?`}
        confirmLabel="Delete" loading={deleting}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
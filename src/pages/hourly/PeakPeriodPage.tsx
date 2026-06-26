import {
  Box, Card, CardContent, CardHeader, TextField, Button,
  CircularProgress, Alert, Typography, MenuItem, FormControl,
  InputLabel, Select, Grid, Divider, Chip, Stack, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, IconButton, Tooltip,
} from '@mui/material';
import { Search, Edit, Delete, ShowChart, Add, Check, Close } from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { plantUnitApi } from '../../api/masterData/plantUnitApi';
import { peakPeriodApi } from '../../api/hourly/peakPeriodApi';
import type { PowerPlant, PlantUnit } from '../../types/masterData';
import type { PeakPeriodReading, PeakPeriodInterval } from '../../types/peakPeriod';
import { PEAK_INTERVALS } from '../../types/peakPeriod';

export default function PeakPeriodPage() {
  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const [allUnits, setAllUnits] = useState<PlantUnit[]>([]);

  // Filter / Load state
  const [filterPlant, setFilterPlant] = useState('');
  const [filterUnit, setFilterUnit] = useState('');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterUnits, setFilterUnits] = useState<PlantUnit[]>([]);

  const [record, setRecord] = useState<PeakPeriodReading | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // New interval entry state
  const [newTime, setNewTime] = useState('');
  const [newMW, setNewMW] = useState('');
  const [newMVar, setNewMVar] = useState('');
  const [newVoltage, setNewVoltage] = useState('');
  const [savingInterval, setSavingInterval] = useState(false);
  const [intervalError, setIntervalError] = useState<string | null>(null);

  // Inline edit state for existing intervals
  const [editIntervalId, setEditIntervalId] = useState<string | null>(null);
  const [editMW, setEditMW] = useState('');
  const [editMVar, setEditMVar] = useState('');
  const [editVoltage, setEditVoltage] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{ type: 'record' | 'interval'; id: string; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([powerPlantApi.getAll(), plantUnitApi.getAll()]).then(([p, u]) => {
      setPlants(p.data);
      setAllUnits(u.data);
    });
  }, []);

  useEffect(() => {
    setFilterUnits(filterPlant ? allUnits.filter((u) => u.plantCode === filterPlant) : []);
    setFilterUnit('');
    setRecord(null);
  }, [filterPlant, allUnits]);

  const loadRecord = useCallback(async () => {
    if (!filterPlant || !filterUnit || !filterDate) return;
    setLoading(true);
    setLoadError(null);
    setRecord(null);
    try {
      const res = await peakPeriodApi.getAll({ plantCode: filterPlant, unitCode: filterUnit, date: filterDate });
      setRecord(res.data[0] ?? null);
    } catch {
      setLoadError('Failed to load record.');
    } finally {
      setLoading(false);
    }
  }, [filterPlant, filterUnit, filterDate]);

  // The times already logged for this record
  const loggedTimes = record?.intervals.map((i) => i.intervalTime) ?? [];
  const availableTimes = PEAK_INTERVALS.filter((t) => !loggedTimes.includes(t));

  const toNum = (v: string) => v === '' ? undefined : Number(v);

  const handleAddInterval = async () => {
    if (!newTime) return;
    setSavingInterval(true);
    setIntervalError(null);
    try {
      let currentRecord = record;

      // Auto-create header if it doesn't exist yet
      if (!currentRecord) {
        const created = await peakPeriodApi.create({
          plantCode: filterPlant, unitCode: filterUnit, logDate: filterDate,
        });
        currentRecord = created.data;
      }

      const updated = await peakPeriodApi.addInterval(currentRecord.id, {
        intervalTime: newTime,
        mW: toNum(newMW), mVar: toNum(newMVar), voltage: toNum(newVoltage),
      });
      setRecord(updated.data);
      setNewTime('');
      setNewMW('');
      setNewMVar('');
      setNewVoltage('');
    } catch (err) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      const msg = axiosErr.response?.data?.message;
      setIntervalError(msg ?? 'Failed to save interval.');
    } finally {
      setSavingInterval(false);
    }
  };

  const openEditInterval = (interval: PeakPeriodInterval) => {
    setEditIntervalId(interval.id ?? null);
    setEditMW(interval.mW != null ? String(interval.mW) : '');
    setEditMVar(interval.mVar != null ? String(interval.mVar) : '');
    setEditVoltage(interval.voltage != null ? String(interval.voltage) : '');
  };

  const cancelEditInterval = () => {
    setEditIntervalId(null);
    setEditMW(''); setEditMVar(''); setEditVoltage('');
  };

  const handleSaveInterval = async (interval: PeakPeriodInterval) => {
    if (!record || !interval.id) return;
    setSavingEdit(true);
    try {
      const updated = await peakPeriodApi.updateInterval(record.id, interval.id, {
        intervalTime: interval.intervalTime,
        mW: toNum(editMW), mVar: toNum(editMVar), voltage: toNum(editVoltage),
      });
      setRecord(updated.data);
      cancelEditInterval();
    } catch (err) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      const msg = axiosErr.response?.data?.message;
      setIntervalError(msg ?? 'Failed to update interval.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !record) return;
    setDeleting(true);
    try {
      if (deleteTarget.type === 'record') {
        await peakPeriodApi.delete(record.id);
        setRecord(null);
      } else {
        const updated = await peakPeriodApi.deleteInterval(record.id, deleteTarget.id);
        setRecord(updated.data);
      }
      setDeleteTarget(null);
    } catch {
      setLoadError('Failed to delete.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title="Peak Period Readings"
        subtitle="15-minute interval MW, MVar and Voltage readings from 18:15 to 20:15"
        breadcrumbs={[{ label: 'Hourly Readings' }, { label: 'Peak Period' }]}
      />

      <Grid container spacing={3}>
        {/* ── Left: Load panel ── */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card>
            <CardHeader title={<Typography sx={{ fontWeight: 700 }}>Load Record</Typography>} />
            <Divider />
            <CardContent>
              <Stack spacing={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Power Plant</InputLabel>
                  <Select label="Power Plant" value={filterPlant}
                    onChange={(e) => setFilterPlant(e.target.value)}>
                    <MenuItem value="">Select plant…</MenuItem>
                    {plants.map((p) => (
                      <MenuItem key={p.id} value={p.plantCode}>{p.plantName} ({p.plantCode})</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth size="small" disabled={!filterPlant}>
                  <InputLabel>Unit</InputLabel>
                  <Select label="Unit" value={filterUnit} onChange={(e) => setFilterUnit(e.target.value)}>
                    <MenuItem value="">Select unit…</MenuItem>
                    {filterUnits.map((u) => (
                      <MenuItem key={u.id} value={u.unitCode}>{u.unitName} ({u.unitCode})</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label="Date" type="date" size="small" fullWidth value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />

                <Button
                  variant="contained" fullWidth
                  startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <Search />}
                  onClick={loadRecord}
                  disabled={!filterPlant || !filterUnit || !filterDate || loading}
                >
                  {loading ? 'Loading...' : 'Load'}
                </Button>
              </Stack>

              {loadError && (
                <Alert severity="error" onClose={() => setLoadError(null)} sx={{ mt: 2 }}>{loadError}</Alert>
              )}

              {!loading && filterPlant && filterUnit && filterDate && record === null && !loadError && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  No record yet for this unit on this date. Add the first interval below to get started.
                </Alert>
              )}

              {record && (
                <Paper variant="outlined" sx={{ mt: 2, p: 1.5, borderRadius: 2 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                    <Stack spacing={0.5}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{record.unitName}</Typography>
                      <Typography variant="caption" color="text.secondary">{record.logDate.split('T')[0]}</Typography>
                    </Stack>
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                      <Chip
                        label={`${record.intervals.length} / 9`}
                        size="small"
                        color={record.intervals.length === 9 ? 'success' : 'default'}
                        variant="outlined"
                      />
                      <Tooltip title="Delete entire record">
                        <IconButton size="small" color="error"
                          onClick={() => setDeleteTarget({ type: 'record', id: record.id, label: `${record.unitCode} on ${record.logDate.split('T')[0]}` })}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>
                </Paper>
              )}
            </CardContent>
          </Card>

          {/* Add new interval */}
          {(record !== null || (filterPlant && filterUnit && filterDate)) && (
            <Card sx={{ mt: 2 }}>
              <CardHeader title={<Typography sx={{ fontWeight: 700 }}>Add Interval</Typography>} />
              <Divider />
              <CardContent>
                {intervalError && (
                  <Alert severity="error" onClose={() => setIntervalError(null)} sx={{ mb: 2 }}>{intervalError}</Alert>
                )}

                {availableTimes.length === 0 && record ? (
                  <Alert severity="success">All 9 intervals have been logged.</Alert>
                ) : (
                  <Stack spacing={2}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Time Slot</InputLabel>
                      <Select label="Time Slot" value={newTime} onChange={(e) => setNewTime(e.target.value)}>
                        {availableTimes.map((t) => (
                          <MenuItem key={t} value={t}>{t}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      label="MW" type="number" size="small" fullWidth value={newMW}
                      onChange={(e) => setNewMW(e.target.value)}
                      slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">MW</Typography> } }}
                    />
                    <TextField
                      label="MVar" type="number" size="small" fullWidth value={newMVar}
                      onChange={(e) => setNewMVar(e.target.value)}
                      slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">MVar</Typography> } }}
                    />
                    <TextField
                      label="Voltage" type="number" size="small" fullWidth value={newVoltage}
                      onChange={(e) => setNewVoltage(e.target.value)}
                      slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">kV</Typography> } }}
                    />
                    <Button
                      variant="contained" fullWidth
                      startIcon={savingInterval ? <CircularProgress size={16} color="inherit" /> : <Add />}
                      onClick={handleAddInterval}
                      disabled={!newTime || savingInterval}
                    >
                      {savingInterval ? 'Saving...' : 'Add Interval'}
                    </Button>
                  </Stack>
                )}
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* ── Right: Intervals table ── */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card>
            <CardHeader
              title={
                <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1}>
                  <ShowChart sx={{ color: '#1B5E20' }} />
                  <Typography sx={{ fontWeight: 700 }}>
                    {record
                      ? `${record.unitName} — ${record.logDate.split('T')[0]}`
                      : 'Logged Intervals'}
                  </Typography>
                </Stack>
              }
            />
            <Divider />
            <CardContent>
              {!record ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <ShowChart sx={{ fontSize: '2.5rem', color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Select a plant, unit and date then click Load.
                  </Typography>
                </Box>
              ) : record.intervals.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <ShowChart sx={{ fontSize: '2.5rem', color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    No intervals logged yet. Use the Add Interval panel to log the first reading.
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 700, width: 80 }}>Time</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>MW</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>MVar</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Voltage (kV)</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {record.intervals.map((interval) => {
                        const isEditing = editIntervalId === interval.id;
                        return (
                          <TableRow key={interval.id}
                            sx={{ backgroundColor: interval.intervalTime === '19:00' ? '#1B5E2008' : undefined }}>
                            <TableCell>
                              <Chip
                                label={interval.intervalTime}
                                size="small"
                                sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 11 }}
                                color={interval.intervalTime === '19:00' ? 'success' : 'default'}
                                variant="outlined"
                              />
                            </TableCell>
                            {isEditing ? (
                              <>
                                <TableCell>
                                  <TextField type="number" size="small" sx={{ width: 100 }}
                                    value={editMW} onChange={(e) => setEditMW(e.target.value)} />
                                </TableCell>
                                <TableCell>
                                  <TextField type="number" size="small" sx={{ width: 100 }}
                                    value={editMVar} onChange={(e) => setEditMVar(e.target.value)} />
                                </TableCell>
                                <TableCell>
                                  <TextField type="number" size="small" sx={{ width: 100 }}
                                    value={editVoltage} onChange={(e) => setEditVoltage(e.target.value)} />
                                </TableCell>
                                <TableCell align="right">
                                  <Tooltip title="Save">
                                    <IconButton size="small" color="primary"
                                      onClick={() => handleSaveInterval(interval)} disabled={savingEdit}>
                                      {savingEdit ? <CircularProgress size={16} /> : <Check fontSize="small" />}
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Cancel">
                                    <IconButton size="small" onClick={cancelEditInterval}>
                                      <Close fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </TableCell>
                              </>
                            ) : (
                              <>
                                <TableCell>
                                  <Typography variant="body2">{interval.mW ?? '—'}</Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2">{interval.mVar ?? '—'}</Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2">{interval.voltage ?? '—'}</Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Tooltip title="Edit">
                                    <IconButton size="small" color="primary"
                                      onClick={() => openEditInterval(interval)}>
                                      <Edit fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete interval">
                                    <IconButton size="small" color="error"
                                      onClick={() => setDeleteTarget({
                                        type: 'interval', id: interval.id!,
                                        label: `interval ${interval.intervalTime}`,
                                      })}>
                                      <Delete fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                        );
                      })}
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
        title="Delete"
        message={`Delete ${deleteTarget?.label}? This cannot be undone.`}
        confirmLabel="Delete" loading={deleting}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
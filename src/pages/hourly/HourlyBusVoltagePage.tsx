import {
  Box, Card, CardContent, CardHeader, TextField, Button,
  CircularProgress, Alert, Typography, MenuItem, FormControl,
  InputLabel, Select, Grid, Divider, Chip, Stack, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, IconButton, Tooltip,
} from '@mui/material';
import {
  Save, Search, Edit, Delete, Bolt, History, Add, Remove,
} from '@mui/icons-material';
import { useEffect, useState, useCallback, useRef } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { hourlyBusVoltageApi, plantBusApi } from '../../api/hourly/hourlyBusVoltageApi';
import type { PowerPlant } from '../../types/masterData';
import type { PlantBus, BusVoltageReadingRow, HourlyBusVoltage } from '../../types/plantBus';
import { useSectionPermissions } from '../../hooks/usePermission';

const HOURS = Array.from({ length: 24 }, (_, i) => i + 1);

export default function HourlyBusVoltagePage() {
  const { canCreate, canEdit, canDelete } = useSectionPermissions('hourly.bus_voltages');
  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const [plantBuses, setPlantBuses] = useState<PlantBus[]>([]);

  const [busRows, setBusRows] = useState<BusVoltageReadingRow[]>([]);
  const pendingBusRows = useRef<BusVoltageReadingRow[] | null>(null);

  const [newBusCode, setNewBusCode] = useState<string>('');
  const [newBusVoltage, setNewBusVoltage] = useState('');

  const [plantCode, setPlantCode] = useState('');
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [logHour, setLogHour] = useState<number | string>(new Date().getHours() + 1);
  const [remarks, setRemarks] = useState('');

  const [filterPlant, setFilterPlant] = useState('');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState<HourlyBusVoltage[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<HourlyBusVoltage | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<HourlyBusVoltage | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    powerPlantApi.getAll().then((res) => setPlants(res.data));
  }, []);

  useEffect(() => {
    if (!editTarget) {
      setPlantBuses([]);
      setBusRows([]);
    }
  }, [plantCode, editTarget]);

  useEffect(() => {
    const code = editTarget ? editTarget.plantCode : plantCode;
    if (!code) return;
    plantBusApi.getAll(code).then((res) => {
      setPlantBuses(res.data);
      if (pendingBusRows.current !== null) {
        setBusRows(pendingBusRows.current);
        pendingBusRows.current = null;
      }
    }).catch(() => {});
  }, [plantCode, editTarget]);

  const fetchRecords = useCallback(async () => {
    if (!filterPlant) return;
    setLoadingRecords(true);
    setRecordsError(null);
    try {
      const res = await hourlyBusVoltageApi.getAll({ plantCode: filterPlant, date: filterDate || undefined });
      setRecords(res.data);
    } catch {
      setRecordsError('Failed to load records.');
    } finally {
      setLoadingRecords(false);
    }
  }, [filterPlant, filterDate]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const addBusRow = () => {
    if (newBusCode === '' || newBusVoltage === '') return;
    const bus = plantBuses.find((b) => b.busCode === newBusCode);
    if (!bus) return;
    if (busRows.some((r) => r.busCode === newBusCode)) return;
    setBusRows((prev) => [...prev, { busCode: newBusCode, busName: bus.busName, voltage: newBusVoltage }]);
    setNewBusCode('');
    setNewBusVoltage('');
  };

  const removeBusRow = (code: string) =>
    setBusRows((prev) => prev.filter((r) => r.busCode !== code));

  const openEdit = (row: HourlyBusVoltage) => {
    setEditTarget(row);
    setSaveSuccess(false);
    setSaveError(null);
    setRemarks(row.remarks ?? '');
    pendingBusRows.current = row.busReadings ?? [];
    setPlantCode(row.plantCode);
    setLogDate(row.logDate.split('T')[0]);
    setLogHour(row.logHour);
  };

  const cancelEdit = () => {
    setEditTarget(null);
    setRemarks('');
    setBusRows([]);
    pendingBusRows.current = null;
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const busReadings = busRows
        .filter((r) => r.voltage !== '' && r.voltage !== undefined && !isNaN(Number(r.voltage)))
        .map((r) => ({ busCode: r.busCode, voltage: Number(r.voltage) }));

      if (editTarget) {
        await hourlyBusVoltageApi.update(editTarget.id, { remarks: remarks || undefined, busReadings });
        cancelEdit();
      } else {
        await hourlyBusVoltageApi.create({
          plantCode, logDate, logHour: Number(logHour),
          remarks: remarks || undefined, busReadings,
        });
        setPlantCode(''); setLogDate(new Date().toISOString().split('T')[0]);
        setLogHour(new Date().getHours() + 1); setRemarks(''); setBusRows([]);
      }
      setSaveSuccess(true);
      fetchRecords();
    } catch (err) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setSaveError(axiosErr.response?.data?.message ?? 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await hourlyBusVoltageApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchRecords();
    } catch {
      setRecordsError('Failed to delete record.');
    } finally {
      setDeleting(false);
    }
  };

  const originalBusCount = editTarget?.busReadings?.length ?? 0;
  const busRowsValid = originalBusCount === 0 || busRows.length > 0;
  const isFormValid = editTarget ? busRowsValid : plantCode && logDate && logHour;
  const availableBuses = plantBuses.filter((b) => !busRows.some((r) => r.busCode === b.busCode));
  const currentPlantCode = editTarget ? editTarget.plantCode : plantCode;

  return (
    <Box>
      <PageHeader
        title="Hourly Bus Voltages"
        subtitle="Hourly bus voltage readings recorded per plant"
        breadcrumbs={[{ label: 'Hourly Readings' }, { label: 'Bus Voltages' }]}
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card>
            <CardHeader
              title={
                <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1.5}>
                  <Bolt sx={{ color: '#1565C0' }} />
                  <Typography sx={{ fontWeight: 700 }}>
                    {editTarget
                      ? `Editing: ${editTarget.plantCode} — ${editTarget.logDate?.split('T')[0]} Hour ${editTarget.logHour}`
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
                      <Select label="Power Plant" value={currentPlantCode}
                        onChange={(e) => setPlantCode(e.target.value)}>
                        {plants.map((p) => (
                          <MenuItem key={p.id} value={p.plantCode}>{p.plantName} ({p.plantCode})</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Log Date" type="date" fullWidth required
                      value={editTarget ? editTarget.logDate?.split('T')[0] : logDate}
                      onChange={(e) => setLogDate(e.target.value)}
                      disabled={!!editTarget}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth required disabled={!!editTarget}>
                      <InputLabel>Hour</InputLabel>
                      <Select label="Hour" value={editTarget ? editTarget.logHour : logHour}
                        onChange={(e) => setLogHour(Number(e.target.value))}>
                        {HOURS.map((h) => (
                          <MenuItem key={h} value={h}>{String(h).padStart(2, '0')}:00</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2 }}>
                <Stack direction="row" sx={{ alignItems: 'center', mb: 1.5 }} spacing={1}>
                  <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#1565C0' }}>
                    Bus Voltage Readings
                  </Typography>
                  {busRows.length > 0 && (
                    <Chip label={busRows.length} size="small" sx={{ height: 18, fontSize: 11, backgroundColor: '#1565C022', color: '#1565C0' }} />
                  )}
                </Stack>

                {!currentPlantCode ? (
                  <Typography variant="body2" color="text.secondary">Select a plant to load buses.</Typography>
                ) : plantBuses.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No buses configured for this plant.</Typography>
                ) : (
                  <>
                    {busRows.length > 0 && (
                      <TableContainer sx={{ mb: 2 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Bus</TableCell>
                              <TableCell>Voltage (kV)</TableCell>
                              <TableCell width={40} />
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {busRows.map((row) => (
                              <TableRow key={row.busCode}>
                                <TableCell>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    #{row.busCode} — {row.busName}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <TextField
                                    type="number" size="small" sx={{ width: 110 }}
                                    value={row.voltage}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val === '') {
                                        setBusRows((prev) => prev.filter((r) => r.busCode !== row.busCode));
                                      } else {
                                        setBusRows((prev) => prev.map((r) => r.busCode === row.busCode
                                          ? { ...r, voltage: val } : r));
                                      }
                                    }}
                                    slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">kV</Typography> } }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <IconButton size="small" color="error" onClick={() => removeBusRow(row.busCode)}>
                                    <Remove fontSize="small" />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}

                    {availableBuses.length > 0 && (
                      <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1}>
                        <FormControl size="small" sx={{ minWidth: 200 }}>
                          <InputLabel>Select bus</InputLabel>
                          <Select label="Select bus" value={newBusCode}
                            onChange={(e) => setNewBusCode(e.target.value)}>
                            {availableBuses.map((b) => (
                              <MenuItem key={b.busCode} value={b.busCode}>#{b.busCode} — {b.busName}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <TextField
                          label="Voltage" type="number" size="small" sx={{ width: 110 }}
                          value={newBusVoltage}
                          onChange={(e) => setNewBusVoltage(e.target.value)}
                          slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">kV</Typography> } }}
                        />
                        <Button variant="outlined" size="small" startIcon={<Add />}
                          onClick={addBusRow}
                          disabled={newBusCode === '' || newBusVoltage === ''}>
                          Add
                        </Button>
                      </Stack>
                    )}
                    {availableBuses.length === 0 && busRows.length > 0 && (
                      <Typography variant="caption" color="success.main">All buses logged.</Typography>
                    )}
                  </>
                )}
              </Paper>

              <TextField
                label="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)}
                fullWidth multiline rows={2} placeholder="Optional remarks or observations..."
              />

              <Stack direction="row" sx={{ mt: 2.5, alignItems: 'center' }} spacing={1.5}>
                {editTarget && <Button variant="outlined" onClick={cancelEdit} disabled={saving}>Cancel</Button>}
                {(editTarget ? canEdit : canCreate) && (
                  <Button variant="contained" onClick={handleSave}
                    disabled={saving || !isFormValid}
                    startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />}
                    sx={{ minWidth: 140 }}>
                    {saving ? 'Saving...' : editTarget ? 'Update Reading' : 'Save Reading'}
                  </Button>
                )}
                {editTarget && !busRowsValid && (
                  <Typography variant="caption" color="error">Bus voltage readings required</Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

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
                    {plants.map((p) => (
                      <MenuItem key={p.id} value={p.plantCode}>{p.plantName}</MenuItem>
                    ))}
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
                  <Bolt sx={{ fontSize: '2rem', color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    {filterPlant ? 'No records found.' : 'Select a plant and click Load.'}
                  </Typography>
                </Box>
              ) : (
                <TableContainer sx={{ maxHeight: 480 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Hour</TableCell>
                        <TableCell>Buses Logged</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {records.map((row) => (
                        <TableRow key={row.id} selected={editTarget?.id === row.id} hover>
                          <TableCell>
                            <Chip label={`${String(row.logHour).padStart(2, '0')}:00`}
                              size="small" variant="outlined"
                              sx={{ fontFamily: 'monospace', fontWeight: 600 }} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">
                              {row.busReadings?.length ?? 0} buses
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
        </Grid>
      </Grid>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Reading"
        message={`Delete the bus voltage record for ${deleteTarget?.plantCode} on ${deleteTarget?.logDate?.split('T')[0]} hour ${deleteTarget?.logHour}?`}
        confirmLabel="Delete" loading={deleting}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
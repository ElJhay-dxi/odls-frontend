import {
  Box, Card, CardContent, TextField, Button, CircularProgress, Alert, Typography,
  MenuItem, FormControl, InputLabel, Select, Grid, Divider, Chip, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Tooltip, Collapse, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { Save, Add, Edit, Delete, WaterDrop, History, ExpandMore, ExpandLess } from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { labCoolingWaterApi } from '../../api/lab/labCoolingWaterApi';
import type { PowerPlant } from '../../types/masterData';
import type { LabCoolingWaterReading } from '../../types/lab';
import { useSectionPermissions, usePlantFilter } from '../../hooks/usePermission';
import { usePlantTypeGuard } from '../../hooks/usePlantTypeGuard';

const ACCENT = '#00695C';

interface ReadingForm {
  readingTime: string; circuitId: string; temperature: string; ph: string;
  conductivity: string; nitrite: string; hardness: string; chlorideContent: string; chlorineResidual: string; remarks: string;
}

const emptyForm: ReadingForm = {
  readingTime: new Date().toTimeString().slice(0, 5), circuitId: '', temperature: '', ph: '',
  conductivity: '', nitrite: '', hardness: '', chlorideContent: '', chlorineResidual: '', remarks: '',
};

const toNum = (v: string) => v === '' ? null : Number(v);
const fmt = (v?: number) => v != null ? v.toString() : '—';

export default function LabCoolingWaterPage() {
  const { canCreate, canEdit, canDelete } = useSectionPermissions('lab.coolingwater');
  const isWrongPlantType = usePlantTypeGuard('thermal');
  const navigate = useNavigate();

  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const { availablePlants, plantLocked, autoPlantCode } = usePlantFilter(plants);

  const [selectedPlant, setSelectedPlant] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [readings, setReadings] = useState<LabCoolingWaterReading[]>([]);
  const [loadingReadings, setLoadingReadings] = useState(false);
  const [readingsError, setReadingsError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<LabCoolingWaterReading | null>(null);
  const [form, setForm] = useState<ReadingForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<LabCoolingWaterReading | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [history, setHistory] = useState<LabCoolingWaterReading[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyCollapsed, setHistoryCollapsed] = useState(true);

  useEffect(() => {
    powerPlantApi.getAll().then((res) =>
      setPlants(res.data.filter((p) => p.classificationType?.toLowerCase() === 'thermal'))
    );
  }, []);

  useEffect(() => {
    if (autoPlantCode) setSelectedPlant(autoPlantCode);
  }, [autoPlantCode]);

  const fetchReadings = useCallback(async () => {
    if (!selectedPlant || !selectedDate) { setReadings([]); return; }
    setLoadingReadings(true); setReadingsError(null);
    try {
      const res = await labCoolingWaterApi.getAll({ plantCode: selectedPlant, date: selectedDate });
      setReadings(res.data.sort((a, b) => (a.readingTime ?? '').localeCompare(b.readingTime ?? '')));
    } catch {
      setReadingsError('Failed to load cooling water readings.');
    } finally {
      setLoadingReadings(false);
    }
  }, [selectedPlant, selectedDate]);

  useEffect(() => { fetchReadings(); }, [fetchReadings]);

  const fetchHistory = useCallback(async () => {
    if (!selectedPlant) { setHistory([]); return; }
    setLoadingHistory(true);
    try {
      const res = await labCoolingWaterApi.getAll({ plantCode: selectedPlant });
      setHistory(res.data);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [selectedPlant]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const historyGroups = (() => {
    const map = new Map<string, number>();
    history.forEach((r) => {
      const d = r.logDate.split('T')[0];
      map.set(d, (map.get(d) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([logDate, count]) => ({ logDate, count })).sort((a, b) => b.logDate.localeCompare(a.logDate));
  })();

  const openCreate = () => {
    setEditTarget(null);
    setForm({ ...emptyForm, readingTime: new Date().toTimeString().slice(0, 5) });
    setSaveError(null);
    setDialogOpen(true);
  };

  const openEdit = (row: LabCoolingWaterReading) => {
    setEditTarget(row);
    setForm({
      readingTime: row.readingTime?.slice(0, 5) ?? '',
      circuitId: row.circuitId ?? '',
      temperature: row.temperature?.toString() ?? '',
      ph: row.ph?.toString() ?? '',
      conductivity: row.conductivity?.toString() ?? '',
      nitrite: row.nitrite?.toString() ?? '',
      hardness: row.hardness?.toString() ?? '',
      chlorideContent: row.chlorideContent?.toString() ?? '',
      chlorineResidual: row.chlorineResidual?.toString() ?? '',
      remarks: row.remarks ?? '',
    });
    setSaveError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true); setSaveError(null);
    try {
      const payload = {
        plantCode: selectedPlant,
        logDate: selectedDate,
        readingTime: form.readingTime || null,
        circuitId: form.circuitId || null,
        temperature: toNum(form.temperature),
        ph: toNum(form.ph),
        conductivity: toNum(form.conductivity),
        nitrite: toNum(form.nitrite),
        hardness: toNum(form.hardness),
        chlorideContent: toNum(form.chlorideContent),
        chlorineResidual: toNum(form.chlorineResidual),
        remarks: form.remarks || null,
      };
      if (editTarget) {
        await labCoolingWaterApi.update(editTarget.id, payload);
      } else {
        await labCoolingWaterApi.create(payload);
      }
      setDialogOpen(false);
      fetchReadings();
      fetchHistory();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setSaveError(msg ?? 'Failed to save reading.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await labCoolingWaterApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchReadings();
      fetchHistory();
    } catch {
      setReadingsError('Failed to delete reading.');
    } finally {
      setDeleting(false);
    }
  };

  const showEmptyState = !selectedPlant;

  if (isWrongPlantType) return (
    <Alert severity="warning" sx={{ m: 3 }}>
      This section is only available for thermal plants.
      <Button size="small" onClick={() => navigate(-1)} sx={{ ml: 2 }}>Go Back</Button>
    </Alert>
  );

  return (
    <Box>
      <PageHeader
        title="Close Cooling Water Monitoring"
        subtitle="Closed cooling water circuit quality readings"
        breadcrumbs={[{ label: 'Chemical Lab' }, { label: 'Close Cooling Water' }]}
      />

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth required disabled={plantLocked}>
                <InputLabel>Power Plant</InputLabel>
                <Select label="Power Plant" value={selectedPlant} onChange={(e) => setSelectedPlant(e.target.value)}>
                  {availablePlants.map((p: PowerPlant) => (
                    <MenuItem key={p.id} value={p.plantCode}>{p.plantName} ({p.plantCode})</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField label="Log Date" type="date" fullWidth required
                value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 5 }} sx={{ textAlign: { sm: 'right' } }}>
              {canCreate && selectedPlant && (
                <Button variant="contained" sx={{ backgroundColor: ACCENT }} startIcon={<Add />} onClick={openCreate}>
                  Add Reading
                </Button>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {readingsError && <Alert severity="error" onClose={() => setReadingsError(null)} sx={{ mb: 2 }}>{readingsError}</Alert>}

      {showEmptyState ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <WaterDrop sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">Select a plant to load records.</Typography>
        </Box>
      ) : (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            {loadingReadings ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>
            ) : readings.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <WaterDrop sx={{ fontSize: '2.5rem', color: 'text.disabled', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">No readings for this date.</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Time</TableCell>
                      <TableCell>Circuit</TableCell>
                      <TableCell>pH</TableCell>
                      <TableCell>Temp (°C)</TableCell>
                      <TableCell>Conductivity</TableCell>
                      <TableCell>Nitrite</TableCell>
                      <TableCell>Hardness</TableCell>
                      <TableCell>Chloride</TableCell>
                      <TableCell>Chlorine</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {readings.map((r) => (
                      <TableRow key={r.id} hover>
                        <TableCell>{r.readingTime?.slice(0, 5) ?? '—'}</TableCell>
                        <TableCell>{r.circuitId ?? '—'}</TableCell>
                        <TableCell>{fmt(r.ph)}</TableCell>
                        <TableCell>{fmt(r.temperature)}</TableCell>
                        <TableCell>{fmt(r.conductivity)}</TableCell>
                        <TableCell>{fmt(r.nitrite)}</TableCell>
                        <TableCell>{fmt(r.hardness)}</TableCell>
                        <TableCell>{fmt(r.chlorideContent)}</TableCell>
                        <TableCell>{fmt(r.chlorineResidual)}</TableCell>
                        <TableCell align="right">
                          {canEdit && (
                            <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(r)}><Edit fontSize="small" /></IconButton></Tooltip>
                          )}
                          {canDelete && (
                            <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setDeleteTarget(r)}><Delete fontSize="small" /></IconButton></Tooltip>
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
      )}

      {!showEmptyState && (
        <Card>
          <Box sx={{
            px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: 'pointer', backgroundColor: `${ACCENT}14`,
            borderBottom: historyCollapsed ? 'none' : '1px solid', borderColor: 'divider',
          }} onClick={() => setHistoryCollapsed((p) => !p)}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <History sx={{ color: ACCENT, fontSize: '1.1rem' }} />
              <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: ACCENT }}>History</Typography>
              <Chip label={historyGroups.length} size="small" variant="outlined" />
            </Stack>
            <IconButton size="small">{historyCollapsed ? <ExpandMore fontSize="small" /> : <ExpandLess fontSize="small" />}</IconButton>
          </Box>
          <Collapse in={!historyCollapsed} timeout="auto" unmountOnExit>
            <CardContent>
              {loadingHistory ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>
              ) : historyGroups.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No readings recorded for this plant yet.</Typography>
              ) : (
                <TableContainer sx={{ maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Readings</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {historyGroups.map((g) => (
                        <TableRow key={g.logDate} hover selected={g.logDate === selectedDate}
                          sx={{ cursor: 'pointer' }} onClick={() => setSelectedDate(g.logDate)}>
                          <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{dayjs(g.logDate).format('DD MMM YYYY')}</Typography></TableCell>
                          <TableCell>{g.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Collapse>
        </Card>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{editTarget ? 'Edit Reading' : 'New Reading'}</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2.5 }}>
          {saveError && <Alert severity="error" onClose={() => setSaveError(null)} sx={{ mb: 2 }}>{saveError}</Alert>}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Reading Time" type="time" size="small" fullWidth
                value={form.readingTime} onChange={(e) => setForm((p) => ({ ...p, readingTime: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Circuit ID" size="small" fullWidth
                value={form.circuitId} onChange={(e) => setForm((p) => ({ ...p, circuitId: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField label="Temperature (°C)" type="number" size="small" fullWidth
                value={form.temperature} onChange={(e) => setForm((p) => ({ ...p, temperature: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField label="pH" type="number" size="small" fullWidth
                value={form.ph} onChange={(e) => setForm((p) => ({ ...p, ph: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField label="Conductivity (µS/cm)" type="number" size="small" fullWidth
                value={form.conductivity} onChange={(e) => setForm((p) => ({ ...p, conductivity: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField label="Nitrite (mg/L)" type="number" size="small" fullWidth
                value={form.nitrite} onChange={(e) => setForm((p) => ({ ...p, nitrite: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField label="Hardness (mg/L)" type="number" size="small" fullWidth
                value={form.hardness} onChange={(e) => setForm((p) => ({ ...p, hardness: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField label="Chloride Content (mg/L)" type="number" size="small" fullWidth
                value={form.chlorideContent} onChange={(e) => setForm((p) => ({ ...p, chlorideContent: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField label="Chlorine Residual (mg/L)" type="number" size="small" fullWidth
                value={form.chlorineResidual} onChange={(e) => setForm((p) => ({ ...p, chlorineResidual: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField label="Remarks" size="small" fullWidth multiline rows={2}
                value={form.remarks} onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button variant="outlined" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" sx={{ backgroundColor: ACCENT }} onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <Save />}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} title="Delete Reading"
        message={`Delete the cooling water reading at ${deleteTarget?.readingTime?.slice(0, 5) ?? ''}${deleteTarget?.circuitId ? ` (${deleteTarget.circuitId})` : ''}?`}
        confirmLabel="Delete" loading={deleting} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </Box>
  );
}

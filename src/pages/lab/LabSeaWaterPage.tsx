import {
  Box, Card, CardContent, TextField, Button, CircularProgress, Alert, Typography,
  MenuItem, FormControl, InputLabel, Select, Grid, Divider, Chip, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Tooltip, Collapse, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { Save, Add, Edit, Delete, Water, History, ExpandMore, ExpandLess } from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { labSeaWaterApi } from '../../api/lab/labSeaWaterApi';
import type { PowerPlant } from '../../types/masterData';
import type { LabSeaWaterReading } from '../../types/lab';
import { useSectionPermissions, usePlantFilter } from '../../hooks/usePermission';
import { usePlantTypeGuard } from '../../hooks/usePlantTypeGuard';

const ACCENT = '#00695C';

interface ReadingForm {
  readingTime: string; location: string; temperature: string; ph: string;
  salinity: string; tds: string; turbidity: string; chlorineResidual: string;
  dissolvedOxygen: string; intakeFlow: string; remarks: string;
}

const emptyForm: ReadingForm = {
  readingTime: new Date().toTimeString().slice(0, 5), location: '', temperature: '', ph: '',
  salinity: '', tds: '', turbidity: '', chlorineResidual: '', dissolvedOxygen: '', intakeFlow: '', remarks: '',
};

const toNum = (v: string) => v === '' ? null : Number(v);
const fmt = (v?: number) => v != null ? v.toString() : '—';

export default function LabSeaWaterPage() {
  const { canCreate, canEdit, canDelete } = useSectionPermissions('lab.seawater');
  const isWrongPlantType = usePlantTypeGuard('thermal');
  const navigate = useNavigate();

  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const { availablePlants, plantLocked, autoPlantCode } = usePlantFilter(plants);

  const [selectedPlant, setSelectedPlant] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [readings, setReadings] = useState<LabSeaWaterReading[]>([]);
  const [loadingReadings, setLoadingReadings] = useState(false);
  const [readingsError, setReadingsError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<LabSeaWaterReading | null>(null);
  const [form, setForm] = useState<ReadingForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<LabSeaWaterReading | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [history, setHistory] = useState<LabSeaWaterReading[]>([]);
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
      const res = await labSeaWaterApi.getAll({ plantCode: selectedPlant, date: selectedDate });
      setReadings(res.data.sort((a, b) => (a.readingTime ?? '').localeCompare(b.readingTime ?? '')));
    } catch {
      setReadingsError('Failed to load sea water readings.');
    } finally {
      setLoadingReadings(false);
    }
  }, [selectedPlant, selectedDate]);

  useEffect(() => { fetchReadings(); }, [fetchReadings]);

  const fetchHistory = useCallback(async () => {
    if (!selectedPlant) { setHistory([]); return; }
    setLoadingHistory(true);
    try {
      const res = await labSeaWaterApi.getAll({ plantCode: selectedPlant });
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

  const openEdit = (row: LabSeaWaterReading) => {
    setEditTarget(row);
    setForm({
      readingTime: row.readingTime?.slice(0, 5) ?? '',
      location: row.location ?? '',
      temperature: row.temperature?.toString() ?? '',
      ph: row.ph?.toString() ?? '',
      salinity: row.salinity?.toString() ?? '',
      tds: row.tds?.toString() ?? '',
      turbidity: row.turbidity?.toString() ?? '',
      chlorineResidual: row.chlorineResidual?.toString() ?? '',
      dissolvedOxygen: row.dissolvedOxygen?.toString() ?? '',
      intakeFlow: row.intakeFlow?.toString() ?? '',
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
        location: form.location || null,
        temperature: toNum(form.temperature),
        ph: toNum(form.ph),
        salinity: toNum(form.salinity),
        tds: toNum(form.tds),
        turbidity: toNum(form.turbidity),
        chlorineResidual: toNum(form.chlorineResidual),
        dissolvedOxygen: toNum(form.dissolvedOxygen),
        intakeFlow: toNum(form.intakeFlow),
        remarks: form.remarks || null,
      };
      if (editTarget) {
        await labSeaWaterApi.update(editTarget.id, payload);
      } else {
        await labSeaWaterApi.create(payload);
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
      await labSeaWaterApi.delete(deleteTarget.id);
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
        title="Sea Water Monitoring"
        subtitle="Daily sea water quality readings"
        breadcrumbs={[{ label: 'Chemical Lab' }, { label: 'Sea Water Monitoring' }]}
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
          <Water sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">Select a plant to load records.</Typography>
        </Box>
      ) : (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            {loadingReadings ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>
            ) : readings.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Water sx={{ fontSize: '2.5rem', color: 'text.disabled', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">No readings for this date.</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Time</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>pH</TableCell>
                      <TableCell>Temp (°C)</TableCell>
                      <TableCell>Salinity</TableCell>
                      <TableCell>TDS</TableCell>
                      <TableCell>Turbidity</TableCell>
                      <TableCell>Chlorine</TableCell>
                      <TableCell>DO</TableCell>
                      <TableCell>Intake Flow (m³/h)</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {readings.map((r) => (
                      <TableRow key={r.id} hover>
                        <TableCell>{r.readingTime?.slice(0, 5) ?? '—'}</TableCell>
                        <TableCell>{r.location ?? '—'}</TableCell>
                        <TableCell>{fmt(r.ph)}</TableCell>
                        <TableCell>{fmt(r.temperature)}</TableCell>
                        <TableCell>{fmt(r.salinity)}</TableCell>
                        <TableCell>{fmt(r.tds)}</TableCell>
                        <TableCell>{fmt(r.turbidity)}</TableCell>
                        <TableCell>{fmt(r.chlorineResidual)}</TableCell>
                        <TableCell>{fmt(r.dissolvedOxygen)}</TableCell>
                        <TableCell>{fmt(r.intakeFlow)}</TableCell>
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
              <TextField label="Location" size="small" fullWidth
                value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} />
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
              <TextField label="Salinity (ppt)" type="number" size="small" fullWidth
                value={form.salinity} onChange={(e) => setForm((p) => ({ ...p, salinity: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField label="TDS (mg/L)" type="number" size="small" fullWidth
                value={form.tds} onChange={(e) => setForm((p) => ({ ...p, tds: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField label="Turbidity (NTU)" type="number" size="small" fullWidth
                value={form.turbidity} onChange={(e) => setForm((p) => ({ ...p, turbidity: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField label="Chlorine Residual (mg/L)" type="number" size="small" fullWidth
                value={form.chlorineResidual} onChange={(e) => setForm((p) => ({ ...p, chlorineResidual: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField label="Dissolved Oxygen (mg/L)" type="number" size="small" fullWidth
                value={form.dissolvedOxygen} onChange={(e) => setForm((p) => ({ ...p, dissolvedOxygen: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Intake Flow (m³/h)" type="number" size="small" fullWidth
                value={form.intakeFlow} onChange={(e) => setForm((p) => ({ ...p, intakeFlow: e.target.value }))}
                slotProps={{ htmlInput: { min: 0, step: 0.001 } }} />
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
        message={`Delete the sea water reading at ${deleteTarget?.readingTime?.slice(0, 5) ?? ''}${deleteTarget?.location ? ` (${deleteTarget.location})` : ''}?`}
        confirmLabel="Delete" loading={deleting} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </Box>
  );
}

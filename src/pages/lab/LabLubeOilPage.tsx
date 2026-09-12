import {
  Box, Card, CardContent, TextField, Button, CircularProgress, Alert, Typography,
  MenuItem, FormControl, InputLabel, Select, Grid, Divider, Chip, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Tooltip, Collapse, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { Save, Add, Edit, Delete, OilBarrel, History, ExpandMore, ExpandLess } from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { labLubeOilApi } from '../../api/lab/labLubeOilApi';
import type { PowerPlant } from '../../types/masterData';
import type { LabLubeOilAnalysis } from '../../types/lab';
import { useSectionPermissions, usePlantFilter } from '../../hooks/usePermission';
import { usePlantTypeGuard } from '../../hooks/usePlantTypeGuard';

const ACCENT = '#00695C';
const CONDITIONS = ['Good', 'Monitor', 'Replace'];
const CONDITION_COLORS: Record<string, string> = { Good: '#1B5E20', Monitor: '#F57C00', Replace: '#B71C1C' };

interface LubeOilForm {
  equipment: string; oilType: string; model: string; runtime: string; density: string; bsAndW: string; tan: string;
  viscosity: string; acidNumber: string;
  waterContent: string; flashPoint: string; particleCount: string; condition: string; remarks: string;
}

const emptyForm: LubeOilForm = {
  equipment: '', oilType: '', model: '', runtime: '', density: '', bsAndW: '', tan: '',
  viscosity: '', acidNumber: '', waterContent: '',
  flashPoint: '', particleCount: '', condition: 'Good', remarks: '',
};

const toNum = (v: string) => v === '' ? null : Number(v);
const fmt = (v?: number) => v != null ? v.toString() : '—';

export default function LabLubeOilPage() {
  const { canCreate, canEdit, canDelete } = useSectionPermissions('lab.lubeoil');
  const isWrongPlantType = usePlantTypeGuard('thermal');
  const navigate = useNavigate();

  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const { availablePlants, plantLocked, autoPlantCode } = usePlantFilter(plants);

  const [selectedPlant, setSelectedPlant] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [records, setRecords] = useState<LabLubeOilAnalysis[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<LabLubeOilAnalysis | null>(null);
  const [form, setForm] = useState<LubeOilForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<LabLubeOilAnalysis | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [history, setHistory] = useState<LabLubeOilAnalysis[]>([]);
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

  const fetchRecords = useCallback(async () => {
    if (!selectedPlant || !selectedDate) { setRecords([]); return; }
    setLoadingRecords(true); setRecordsError(null);
    try {
      const res = await labLubeOilApi.getAll({ plantCode: selectedPlant, date: selectedDate });
      setRecords(res.data);
    } catch {
      setRecordsError('Failed to load lube oil records.');
    } finally {
      setLoadingRecords(false);
    }
  }, [selectedPlant, selectedDate]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const fetchHistory = useCallback(async () => {
    if (!selectedPlant) { setHistory([]); return; }
    setLoadingHistory(true);
    try {
      const res = await labLubeOilApi.getAll({ plantCode: selectedPlant });
      setHistory(res.data.sort((a, b) => b.logDate.localeCompare(a.logDate)));
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [selectedPlant]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const historyGroups = (() => {
    const map = new Map<string, LabLubeOilAnalysis[]>();
    history.forEach((r) => {
      const d = r.logDate.split('T')[0];
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(r);
    });
    return Array.from(map.entries())
      .map(([logDate, records]) => ({ logDate, records, hasReplace: records.some((r) => r.condition === 'Replace') }))
      .sort((a, b) => b.logDate.localeCompare(a.logDate));
  })();

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setSaveError(null);
    setDialogOpen(true);
  };

  const openEdit = (row: LabLubeOilAnalysis) => {
    setEditTarget(row);
    setForm({
      equipment: row.equipment,
      oilType: row.oilType ?? '',
      model: row.model ?? '',
      runtime: row.runtime?.toString() ?? '',
      density: row.density?.toString() ?? '',
      bsAndW: row.bsAndW?.toString() ?? '',
      tan: row.tan?.toString() ?? '',
      viscosity: row.viscosity?.toString() ?? '',
      acidNumber: row.acidNumber?.toString() ?? '',
      waterContent: row.waterContent?.toString() ?? '',
      flashPoint: row.flashPoint?.toString() ?? '',
      particleCount: row.particleCount?.toString() ?? '',
      condition: row.condition ?? 'Good',
      remarks: row.remarks ?? '',
    });
    setSaveError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.equipment.trim()) return;
    setSaving(true); setSaveError(null);
    try {
      const payload = {
        plantCode: selectedPlant,
        logDate: selectedDate,
        equipment: form.equipment,
        oilType: form.oilType || null,
        model: form.model || null,
        runtime: toNum(form.runtime),
        density: toNum(form.density),
        bsAndW: toNum(form.bsAndW),
        tan: toNum(form.tan),
        viscosity: toNum(form.viscosity),
        acidNumber: toNum(form.acidNumber),
        waterContent: toNum(form.waterContent),
        flashPoint: toNum(form.flashPoint),
        particleCount: toNum(form.particleCount),
        condition: form.condition,
        remarks: form.remarks || null,
      };
      if (editTarget) {
        await labLubeOilApi.update(editTarget.id, payload);
      } else {
        await labLubeOilApi.create(payload);
      }
      setDialogOpen(false);
      fetchRecords();
      fetchHistory();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setSaveError(msg ?? 'Failed to save record.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await labLubeOilApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchRecords();
      fetchHistory();
    } catch {
      setRecordsError('Failed to delete record.');
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
        title="Lube Oil Analysis"
        subtitle="Equipment lubricating oil condition monitoring"
        breadcrumbs={[{ label: 'Chemical Lab' }, { label: 'Lube Oil Analysis' }]}
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
                  Add Record
                </Button>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {recordsError && <Alert severity="error" onClose={() => setRecordsError(null)} sx={{ mb: 2 }}>{recordsError}</Alert>}

      {showEmptyState ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <OilBarrel sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">Select a plant to load records.</Typography>
        </Box>
      ) : loadingRecords ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>
      ) : records.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <OilBarrel sx={{ fontSize: '2.5rem', color: 'text.disabled', mb: 1 }} />
          <Typography variant="body2" color="text.secondary">No lube oil records for this date.</Typography>
        </Box>
      ) : (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {records.map((rec) => (
            <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={rec.id}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <Box sx={{
                  px: 2, py: 1.5, backgroundColor: '#E0F2F1', borderBottom: '1px solid', borderColor: 'divider',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <Stack spacing={0.25}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{rec.equipment}</Typography>
                    {(rec.oilType || rec.model) && (
                      <Typography variant="caption" color="text.secondary">
                        {[rec.oilType, rec.model].filter(Boolean).join(' — ')}
                      </Typography>
                    )}
                  </Stack>
                  <Chip label={rec.condition ?? 'Unknown'} size="small"
                    sx={{ backgroundColor: CONDITION_COLORS[rec.condition ?? ''] ?? '#9E9E9E', color: '#fff', fontWeight: 600 }} />
                </Box>
                <CardContent>
                  <Grid container spacing={1.5}>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">Runtime (hrs)</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{fmt(rec.runtime)}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">Density</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{fmt(rec.density)}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">BS&W</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{fmt(rec.bsAndW)}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">TAN</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{fmt(rec.tan)}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">Viscosity (cSt)</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{fmt(rec.viscosity)}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">Acid Number</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{fmt(rec.acidNumber)}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">Water Content (%)</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{fmt(rec.waterContent)}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">Flash Point (°C)</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{fmt(rec.flashPoint)}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="caption" color="text.secondary">Particle Count</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{fmt(rec.particleCount)}</Typography>
                    </Grid>
                  </Grid>
                  {rec.remarks && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>{rec.remarks}</Typography>
                  )}
                  <Stack direction="row" spacing={1} sx={{ mt: 1.5, justifyContent: 'flex-end' }}>
                    {canEdit && (
                      <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(rec)}><Edit fontSize="small" /></IconButton></Tooltip>
                    )}
                    {canDelete && (
                      <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setDeleteTarget(rec)}><Delete fontSize="small" /></IconButton></Tooltip>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
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
                <Typography variant="body2" color="text.secondary">No records for this plant yet.</Typography>
              ) : (
                <TableContainer sx={{ maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Equipment Count</TableCell>
                        <TableCell>Condition</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {historyGroups.map((g) => (
                        <TableRow key={g.logDate} hover selected={g.logDate === selectedDate}
                          sx={{ cursor: 'pointer', backgroundColor: g.hasReplace ? '#FFEBEE' : 'inherit' }}
                          onClick={() => setSelectedDate(g.logDate)}>
                          <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{dayjs(g.logDate).format('DD MMM YYYY')}</Typography></TableCell>
                          <TableCell>{g.records.length}</TableCell>
                          <TableCell>
                            {g.hasReplace ? <Chip label="Replace needed" size="small" color="error" /> : <Typography variant="caption" color="text.secondary">OK</Typography>}
                          </TableCell>
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
        <DialogTitle sx={{ fontWeight: 700 }}>{editTarget ? 'Edit Lube Oil Record' : 'New Lube Oil Record'}</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2.5 }}>
          {saveError && <Alert severity="error" onClose={() => setSaveError(null)} sx={{ mb: 2 }}>{saveError}</Alert>}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Equipment" size="small" fullWidth required
                value={form.equipment} onChange={(e) => setForm((p) => ({ ...p, equipment: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Oil Type" size="small" fullWidth
                value={form.oilType} onChange={(e) => setForm((p) => ({ ...p, oilType: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Model" size="small" fullWidth
                value={form.model} onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField label="Runtime (hours)" type="number" size="small" fullWidth
                value={form.runtime} onChange={(e) => setForm((p) => ({ ...p, runtime: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField label="Density" type="number" size="small" fullWidth
                value={form.density} onChange={(e) => setForm((p) => ({ ...p, density: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField label="BS&W" type="number" size="small" fullWidth
                value={form.bsAndW} onChange={(e) => setForm((p) => ({ ...p, bsAndW: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField label="TAN" type="number" size="small" fullWidth
                value={form.tan} onChange={(e) => setForm((p) => ({ ...p, tan: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField label="Viscosity (cSt)" type="number" size="small" fullWidth
                value={form.viscosity} onChange={(e) => setForm((p) => ({ ...p, viscosity: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField label="Acid Number (mgKOH/g)" type="number" size="small" fullWidth
                value={form.acidNumber} onChange={(e) => setForm((p) => ({ ...p, acidNumber: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField label="Water Content (%)" type="number" size="small" fullWidth
                value={form.waterContent} onChange={(e) => setForm((p) => ({ ...p, waterContent: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField label="Flash Point (°C)" type="number" size="small" fullWidth
                value={form.flashPoint} onChange={(e) => setForm((p) => ({ ...p, flashPoint: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField label="Particle Count" type="number" size="small" fullWidth
                value={form.particleCount} onChange={(e) => setForm((p) => ({ ...p, particleCount: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Condition</InputLabel>
                <Select label="Condition" value={form.condition} onChange={(e) => setForm((p) => ({ ...p, condition: e.target.value }))}>
                  {CONDITIONS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
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
            disabled={saving || !form.equipment.trim()}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <Save />}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} title="Delete Record"
        message={`Delete the lube oil record for "${deleteTarget?.equipment}"?`}
        confirmLabel="Delete" loading={deleting} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </Box>
  );
}

import {
  Box, Card, CardContent, TextField, Button, CircularProgress, Alert, Typography,
  MenuItem, FormControl, InputLabel, Select, Grid, Chip, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Tooltip, Collapse,
} from '@mui/material';
import { Save, Edit, Delete, Park, History, ExpandMore, ExpandLess } from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { labEnvironmentalApi } from '../../api/lab/labEnvironmentalApi';
import type { PowerPlant } from '../../types/masterData';
import type { LabEnvironmentalReport } from '../../types/lab';
import { useSectionPermissions, usePlantFilter } from '../../hooks/usePermission';
import { usePlantTypeGuard } from '../../hooks/usePlantTypeGuard';

const ACCENT = '#2E7D32';
const PERIODS = ['Daily', 'Weekly', 'Monthly'];

interface EnvironmentalForm {
  effluentFlow: string;
  effluentPh: string;
  effluentTss: string;
  effluentCod: string;
  effluentBod: string;
  noiseLevel: string;
  airQualityIndex: string;
  ambientTemperature: string;
  relativeHumidity: string;
  remarks: string;
}

const emptyForm: EnvironmentalForm = {
  effluentFlow: '', effluentPh: '', effluentTss: '', effluentCod: '', effluentBod: '',
  noiseLevel: '', airQualityIndex: '', ambientTemperature: '', relativeHumidity: '', remarks: '',
};

const toNum = (v: string) => v === '' ? null : Number(v);
const fmt = (v?: number) => v != null ? v.toString() : '—';

export default function LabEnvironmentalPage() {
  const { canCreate, canEdit, canDelete } = useSectionPermissions('lab.environmental');
  const isWrongPlantType = usePlantTypeGuard('thermal');
  const navigate = useNavigate();

  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const { availablePlants, plantLocked, autoPlantCode } = usePlantFilter(plants);

  const [selectedPlant, setSelectedPlant] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPeriod, setSelectedPeriod] = useState('Daily');

  const [record, setRecord] = useState<LabEnvironmentalReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [form, setForm] = useState<EnvironmentalForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [history, setHistory] = useState<LabEnvironmentalReport[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyCollapsed, setHistoryCollapsed] = useState(true);

  const [deleteTarget, setDeleteTarget] = useState<LabEnvironmentalReport | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    powerPlantApi.getAll().then((res) =>
      setPlants(res.data.filter((p) => p.classificationType?.toLowerCase() === 'thermal'))
    );
  }, []);

  useEffect(() => {
    if (autoPlantCode) setSelectedPlant(autoPlantCode);
  }, [autoPlantCode]);

  const populateForm = (data: LabEnvironmentalReport) => {
    setForm({
      effluentFlow: data.effluentFlow?.toString() ?? '',
      effluentPh: data.effluentPh?.toString() ?? '',
      effluentTss: data.effluentTss?.toString() ?? '',
      effluentCod: data.effluentCod?.toString() ?? '',
      effluentBod: data.effluentBod?.toString() ?? '',
      noiseLevel: data.noiseLevel?.toString() ?? '',
      airQualityIndex: data.airQualityIndex?.toString() ?? '',
      ambientTemperature: data.ambientTemperature?.toString() ?? '',
      relativeHumidity: data.relativeHumidity?.toString() ?? '',
      remarks: data.remarks ?? '',
    });
  };

  const loadRecord = useCallback(async () => {
    if (!selectedPlant || !selectedDate) { setRecord(null); setForm(emptyForm); return; }
    setLoading(true); setLoadError(null); setSaveSuccess(false);
    try {
      const res = await labEnvironmentalApi.getByDate(selectedPlant, selectedDate, selectedPeriod);
      setRecord(res.data);
      populateForm(res.data);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        setRecord(null);
        setForm(emptyForm);
      } else {
        setLoadError('Failed to load environmental report.');
      }
    } finally {
      setLoading(false);
    }
  }, [selectedPlant, selectedDate, selectedPeriod]);

  useEffect(() => { loadRecord(); }, [loadRecord]);

  const fetchHistory = useCallback(async () => {
    if (!selectedPlant) { setHistory([]); return; }
    setLoadingHistory(true);
    try {
      const res = await labEnvironmentalApi.getAll(selectedPlant);
      setHistory(res.data.sort((a, b) => b.logDate.localeCompare(a.logDate)));
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [selectedPlant]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleSave = async () => {
    if (!selectedPlant || !selectedDate) return;
    setSaving(true); setSaveError(null); setSaveSuccess(false);
    try {
      const payload = {
        plantCode: selectedPlant,
        logDate: selectedDate,
        reportingPeriod: selectedPeriod,
        effluentFlow: toNum(form.effluentFlow),
        effluentPh: toNum(form.effluentPh),
        effluentTss: toNum(form.effluentTss),
        effluentCod: toNum(form.effluentCod),
        effluentBod: toNum(form.effluentBod),
        noiseLevel: toNum(form.noiseLevel),
        airQualityIndex: toNum(form.airQualityIndex),
        ambientTemperature: toNum(form.ambientTemperature),
        relativeHumidity: toNum(form.relativeHumidity),
        remarks: form.remarks || null,
      };
      if (record) {
        const res = await labEnvironmentalApi.update(record.id, payload);
        setRecord(res.data);
      } else {
        const res = await labEnvironmentalApi.create(payload);
        setRecord(res.data);
      }
      setSaveSuccess(true);
      fetchHistory();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setSaveError(msg ?? 'Failed to save environmental report.');
    } finally {
      setSaving(false);
    }
  };

  const handleHistoryEdit = (row: LabEnvironmentalReport) => {
    setSelectedDate(row.logDate.split('T')[0]);
    setSelectedPeriod(row.reportingPeriod);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await labEnvironmentalApi.delete(deleteTarget.id);
      if (record?.id === deleteTarget.id) { setRecord(null); setForm(emptyForm); }
      setDeleteTarget(null);
      fetchHistory();
    } catch {
      setLoadError('Failed to delete environmental report.');
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
        title="Environmental Monitoring"
        subtitle="Daily environmental compliance data entry"
        breadcrumbs={[{ label: 'Chemical Lab' }, { label: 'Environmental Monitoring' }]}
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
              <TextField label="Date" type="date" fullWidth required
                value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Period</InputLabel>
                <Select label="Period" value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)}>
                  {PERIODS.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {loadError && <Alert severity="error" onClose={() => setLoadError(null)} sx={{ mb: 2 }}>{loadError}</Alert>}

      {showEmptyState ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Park sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">Select a plant to load data.</Typography>
        </Box>
      ) : loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            {saveError && <Alert severity="error" onClose={() => setSaveError(null)} sx={{ mb: 2 }}>{saveError}</Alert>}
            {saveSuccess && <Alert severity="success" onClose={() => setSaveSuccess(false)} sx={{ mb: 2 }}>Environmental report saved successfully.</Alert>}
            {!record && (
              <Alert severity="info" sx={{ mb: 2 }}>
                No {selectedPeriod.toLowerCase()} report found for this date. Fill in the form below to create one.
              </Alert>
            )}

            <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: ACCENT, mb: 1.5, display: 'block' }}>
              Effluent Parameters
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Effluent Flow (m³/d)" type="number" size="small" fullWidth disabled={!canCreate && !canEdit}
                  value={form.effluentFlow} onChange={(e) => setForm((p) => ({ ...p, effluentFlow: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Effluent pH" type="number" size="small" fullWidth disabled={!canCreate && !canEdit}
                  value={form.effluentPh} onChange={(e) => setForm((p) => ({ ...p, effluentPh: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Effluent TSS — Total Suspended Solids (mg/L)" type="number" size="small" fullWidth disabled={!canCreate && !canEdit}
                  value={form.effluentTss} onChange={(e) => setForm((p) => ({ ...p, effluentTss: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Effluent COD — Chemical Oxygen Demand (mg/L)" type="number" size="small" fullWidth disabled={!canCreate && !canEdit}
                  value={form.effluentCod} onChange={(e) => setForm((p) => ({ ...p, effluentCod: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Effluent BOD — Biological Oxygen Demand (mg/L)" type="number" size="small" fullWidth disabled={!canCreate && !canEdit}
                  value={form.effluentBod} onChange={(e) => setForm((p) => ({ ...p, effluentBod: e.target.value }))} />
              </Grid>
            </Grid>

            <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: ACCENT, mb: 1.5, display: 'block' }}>
              Ambient Parameters
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Noise Level (dB)" type="number" size="small" fullWidth disabled={!canCreate && !canEdit}
                  value={form.noiseLevel} onChange={(e) => setForm((p) => ({ ...p, noiseLevel: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Air Quality Index" type="number" size="small" fullWidth disabled={!canCreate && !canEdit}
                  value={form.airQualityIndex} onChange={(e) => setForm((p) => ({ ...p, airQualityIndex: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Ambient Temperature (°C)" type="number" size="small" fullWidth disabled={!canCreate && !canEdit}
                  value={form.ambientTemperature} onChange={(e) => setForm((p) => ({ ...p, ambientTemperature: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Relative Humidity (%)" type="number" size="small" fullWidth disabled={!canCreate && !canEdit}
                  value={form.relativeHumidity} onChange={(e) => setForm((p) => ({ ...p, relativeHumidity: e.target.value }))} />
              </Grid>
            </Grid>

            <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: ACCENT, mb: 1.5, display: 'block' }}>
              Remarks
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid size={{ xs: 12 }}>
                <TextField label="Remarks" size="small" fullWidth multiline rows={3} disabled={!canCreate && !canEdit}
                  value={form.remarks} onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))} />
              </Grid>
            </Grid>

            {(canCreate || canEdit) && (
              <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
                <Button variant="contained" sx={{ backgroundColor: '#1B5E20' }} onClick={handleSave}
                  disabled={saving}
                  startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <Save />}>
                  {saving ? 'Saving...' : record ? 'Update Report' : 'Save Report'}
                </Button>
              </Stack>
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
              <Chip label={history.length} size="small" variant="outlined" />
            </Stack>
            <IconButton size="small">{historyCollapsed ? <ExpandMore fontSize="small" /> : <ExpandLess fontSize="small" />}</IconButton>
          </Box>
          <Collapse in={!historyCollapsed} timeout="auto" unmountOnExit>
            <CardContent>
              {loadingHistory ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>
              ) : history.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No environmental reports for this plant yet.</Typography>
              ) : (
                <TableContainer sx={{ maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Period</TableCell>
                        <TableCell>Effluent pH</TableCell>
                        <TableCell>TSS</TableCell>
                        <TableCell>COD</TableCell>
                        <TableCell>Noise</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {history.map((h) => (
                        <TableRow key={h.id} hover
                          selected={h.logDate.split('T')[0] === selectedDate && h.reportingPeriod === selectedPeriod}>
                          <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{dayjs(h.logDate).format('DD MMM YYYY')}</Typography></TableCell>
                          <TableCell>{h.reportingPeriod}</TableCell>
                          <TableCell>{fmt(h.effluentPh)}</TableCell>
                          <TableCell>{fmt(h.effluentTss)}</TableCell>
                          <TableCell>{fmt(h.effluentCod)}</TableCell>
                          <TableCell>{fmt(h.noiseLevel)}</TableCell>
                          <TableCell align="right">
                            {canEdit && (
                              <Tooltip title="Edit"><IconButton size="small" onClick={() => handleHistoryEdit(h)}><Edit fontSize="small" /></IconButton></Tooltip>
                            )}
                            {canDelete && (
                              <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setDeleteTarget(h)}><Delete fontSize="small" /></IconButton></Tooltip>
                            )}
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

      <ConfirmDialog open={!!deleteTarget} title="Delete Environmental Report"
        message={`Delete the ${deleteTarget?.reportingPeriod.toLowerCase()} environmental report for ${deleteTarget ? dayjs(deleteTarget.logDate).format('DD MMM YYYY') : ''}?`}
        confirmLabel="Delete" loading={deleting} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </Box>
  );
}

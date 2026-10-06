import {
  Box, Card, CardContent, TextField, Button, CircularProgress, Alert, Typography,
  MenuItem, FormControl, InputLabel, Select, Grid, Divider, Chip, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Tooltip, Collapse, Dialog, DialogTitle, DialogContent, DialogActions,
  Autocomplete, createFilterOptions,
} from '@mui/material';
import { Save, Add, Edit, Delete, Biotech, History, ExpandMore, ExpandLess, Timeline, Link as LinkIcon } from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import PersonAutocomplete from '../../components/lab/PersonAutocomplete';
import AnalysisTrendDialog, { buildAnalysisChain } from '../../components/lab/AnalysisTrendDialog';
import { labAnalysisActionsApi } from '../../api/lab/labAnalysisActionsApi';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { labAnalysisApi } from '../../api/lab/labAnalysisApi';
import { labSamplePointsApi } from '../../api/lab/labSamplePointsApi';
import { labSampleRecordsApi } from '../../api/lab/labSampleRecordsApi';
import type { PowerPlant } from '../../types/masterData';
import type {
  LabAnalysisRecord, LabAnalysisParameter, SaveLabAnalysisParameterForm, LabSamplePoint, LabSampleRecord, LabAnalysisAction,
} from '../../types/lab';
import { useSectionPermissions, usePlantFilter } from '../../hooks/usePermission';
import { usePlantTypeGuard } from '../../hooks/usePlantTypeGuard';

const ACCENT = '#00695C';

const STATUS_COLORS: Record<string, string> = {
  Normal: '#1B5E20',
  Warning: '#F57C00',
  OutOfRange: '#B71C1C',
  Unknown: '#9E9E9E',
};

interface AnalysisForm {
  samplePointId: string;
  samplePoint: string;
  sampleType: string;
  analysisTime: string;
  analysedBy: string;
  remarks: string;
  sampleRecordId?: string;
  actionToTake: string;
  followUpOfAnalysisId: string | null;
  parameters: SaveLabAnalysisParameterForm[];
}

const emptyForm: AnalysisForm = {
  samplePointId: '', samplePoint: '', sampleType: '', analysisTime: '', analysedBy: '', remarks: '', sampleRecordId: undefined, actionToTake: '', followUpOfAnalysisId: null, parameters: [],
};

const sampleFilter = createFilterOptions<LabSampleRecord>({ limit: 100 });

const fmtDate = (d: string) => dayjs(d).format('DD MMM YYYY');

export default function LabAnalysisPage() {
  const { canCreate, canEdit, canDelete } = useSectionPermissions('lab.analysis');
  const isWrongPlantType = usePlantTypeGuard('thermal');
  const navigate = useNavigate();

  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const { availablePlants, plantLocked, autoPlantCode } = usePlantFilter(plants);

  const [selectedPlant, setSelectedPlant] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [samplePoints, setSamplePoints] = useState<LabSamplePoint[]>([]);
  const [sampleRecords, setSampleRecords] = useState<LabSampleRecord[]>([]);

  const [records, setRecords] = useState<LabAnalysisRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<LabAnalysisRecord | null>(null);
  const [form, setForm] = useState<AnalysisForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<LabAnalysisRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [actions, setActions] = useState<LabAnalysisAction[]>([]);
  const [trendAnchor, setTrendAnchor] = useState<LabAnalysisRecord | null>(null);

  const [history, setHistory] = useState<LabAnalysisRecord[]>([]);
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

  useEffect(() => {
    if (!selectedPlant) { setSamplePoints([]); return; }
    labSamplePointsApi.getAll(selectedPlant, true)
      .then((res) => setSamplePoints(res.data))
      .catch(() => setSamplePoints([]));
  }, [selectedPlant]);

  useEffect(() => {
    labAnalysisActionsApi.getAll(true).then((res) => setActions(res.data)).catch(() => setActions([]));
  }, []);

  // All samples for the plant (any day) — an analysis can be done on a sample collected earlier.
  const loadSampleRecords = useCallback(async () => {
    if (!selectedPlant) { setSampleRecords([]); return; }
    try {
      const res = await labSampleRecordsApi.getAll({ plantCode: selectedPlant });
      setSampleRecords(res.data);
    } catch {
      setSampleRecords([]);
    }
  }, [selectedPlant]);

  useEffect(() => { loadSampleRecords(); }, [loadSampleRecords]);

  const fetchRecords = useCallback(async () => {
    if (!selectedPlant || !selectedDate) { setRecords([]); return; }
    setLoadingRecords(true); setRecordsError(null);
    try {
      const res = await labAnalysisApi.getAll({ plantCode: selectedPlant, date: selectedDate });
      setRecords(res.data);
    } catch {
      setRecordsError('Failed to load analysis records.');
    } finally {
      setLoadingRecords(false);
    }
  }, [selectedPlant, selectedDate]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const fetchHistory = useCallback(async () => {
    if (!selectedPlant) { setHistory([]); return; }
    setLoadingHistory(true);
    try {
      const res = await labAnalysisApi.getAll({ plantCode: selectedPlant });
      setHistory(res.data.sort((a, b) => b.logDate.localeCompare(a.logDate)));
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [selectedPlant]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setSaveError(null);
    setDialogOpen(true);
  };

  const openEdit = (row: LabAnalysisRecord) => {
    setEditTarget(row);
    setForm({
      samplePointId: row.samplePointId ?? '',
      samplePoint: row.samplePoint,
      sampleType: row.sampleType,
      analysisTime: row.analysisTime?.slice(0, 5) ?? '',
      analysedBy: row.analysedBy ?? '',
      remarks: row.remarks ?? '',
      sampleRecordId: row.sampleRecordId ?? undefined,
      actionToTake: row.actionToTake ?? '',
      followUpOfAnalysisId: row.followUpOfAnalysisId ?? null,
      parameters: row.parameters.map((p) => ({
        samplePointParameterId: p.samplePointParameterId,
        parameterName: p.parameterName,
        value: p.value != null ? String(p.value) : '',
        unit: p.unit ?? '',
      })),
    });
    setSaveError(null);
    setDialogOpen(true);
  };

  const handleSampleSelect = (sampleRecordId: string) => {
    const sample = sampleRecords.find((s) => s.id === sampleRecordId);
    if (sample) {
      const sp = samplePoints.find((p) => p.samplePointName === sample.samplePoint);
      setForm((prev) => ({
        ...prev,
        sampleRecordId,
        samplePointId: sp?.id ?? prev.samplePointId,
        samplePoint: sample.samplePoint,
        sampleType: sample.sampleType,
        parameters: sp
          ? sp.parameters.filter((param) => param.isActive).map((param) => ({
              samplePointParameterId: param.id,
              parameterName: param.parameterName,
              unit: param.unit ?? '',
              value: '',
            }))
          : prev.parameters,
      }));
    } else {
      setForm((prev) => ({ ...prev, sampleRecordId: undefined }));
    }
  };

  const addParamRow = () => setForm((p) => ({ ...p, parameters: [...p.parameters, { parameterName: '', value: '', unit: '' }] }));
  const removeParamRow = (idx: number) => setForm((p) => ({ ...p, parameters: p.parameters.filter((_, i) => i !== idx) }));
  const updateParamRow = (idx: number, field: keyof SaveLabAnalysisParameterForm, value: string) =>
    setForm((p) => ({ ...p, parameters: p.parameters.map((r, i) => i === idx ? { ...r, [field]: value } : r) }));

  const handleSave = async () => {
    if (!form.samplePointId) return;
    setSaving(true); setSaveError(null);
    try {
      const payload = {
        plantCode: selectedPlant,
        logDate: selectedDate,
        samplePointId: form.samplePointId,
        samplePoint: form.samplePoint,
        sampleType: form.sampleType,
        analysisTime: form.analysisTime || null,
        analysedBy: form.analysedBy || null,
        remarks: form.remarks || null,
        sampleRecordId: form.sampleRecordId || null,
        actionToTake: form.actionToTake || null,
        followUpOfAnalysisId: form.followUpOfAnalysisId || null,
        parameters: form.parameters
          .filter((r) => r.parameterName.trim())
          .map((r) => ({
            samplePointParameterId: r.samplePointParameterId || null,
            parameterName: r.parameterName,
            unit: r.unit || null,
            value: r.value !== '' ? Number(r.value) : null,
          })),
      };
      if (editTarget) {
        await labAnalysisApi.update(editTarget.id, payload);
      } else {
        await labAnalysisApi.create(payload);
      }
      setDialogOpen(false);
      fetchRecords();
      fetchHistory();
      await loadSampleRecords(); // reload so linked sample shows labReferenceNumber
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setSaveError(msg ?? 'Failed to save analysis record.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await labAnalysisApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchRecords();
      fetchHistory();
    } catch {
      setRecordsError('Failed to delete analysis record.');
    } finally {
      setDeleting(false);
    }
  };

  const statusChip = (status?: string) => (
    <Chip label={status ?? 'Unknown'} size="small"
      sx={{ backgroundColor: STATUS_COLORS[status ?? 'Unknown'], color: '#fff', fontWeight: 600 }} />
  );

  const outOfRangeCount = (params: LabAnalysisParameter[]) => params.filter((p) => p.status === 'OutOfRange').length;

  const refLabel = (r: LabAnalysisRecord) =>
    `${r.labReferenceNumber || 'No ref'} · ${r.samplePoint} · ${fmtDate(r.logDate)}${r.analysisTime ? ` ${r.analysisTime.slice(0, 5)}` : ''}`;

  const followUpCount = (id: string) => history.filter((h) => h.followUpOfAnalysisId === id).length;

  // Previous analyses this one can follow up: same plant, not itself, not one of its own follow-ups.
  const followUpOptions = (() => {
    const excluded = new Set<string>();
    if (editTarget) buildAnalysisChain(editTarget, history).forEach((r) => {
      // exclude self and anything downstream of self
      let cur: LabAnalysisRecord | undefined = r; const seen = new Set<string>();
      while (cur && !seen.has(cur.id)) {
        if (cur.id === editTarget.id) { excluded.add(r.id); break; }
        seen.add(cur.id);
        cur = history.find((h) => h.id === cur!.followUpOfAnalysisId);
      }
    });
    return history
      .filter((h) => !excluded.has(h.id))
      .sort((a, b) => Number(b.samplePoint === form.samplePoint) - Number(a.samplePoint === form.samplePoint));
  })();

  const isFormValid = !!form.sampleRecordId && !!form.samplePointId && form.parameters.length > 0;

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
        title="Lab Analysis"
        subtitle="Water and steam chemistry analysis records"
        breadcrumbs={[{ label: 'Chemical Lab' }, { label: 'Lab Analysis' }]}
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
                  Add New Analysis
                </Button>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {recordsError && <Alert severity="error" onClose={() => setRecordsError(null)} sx={{ mb: 2 }}>{recordsError}</Alert>}

      {showEmptyState ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Biotech sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">Select a plant to load records.</Typography>
        </Box>
      ) : loadingRecords ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      ) : records.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Biotech sx={{ fontSize: '2.5rem', color: 'text.disabled', mb: 1 }} />
          <Typography variant="body2" color="text.secondary">No analysis records for this date.</Typography>
        </Box>
      ) : (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {records.map((rec) => (
            <Grid size={{ xs: 12, lg: 6 }} key={rec.id}>
              <Card variant="outlined">
                <Box sx={{ px: 2, py: 1.5, backgroundColor: '#E0F2F1', borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }} useFlexGap>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{rec.samplePoint}</Typography>
                      <Chip label={rec.sampleType} size="small" sx={{ backgroundColor: ACCENT, color: '#fff' }} />
                      {rec.labReferenceNumber && (
                        <Chip label={rec.labReferenceNumber} size="small"
                          sx={{ fontFamily: 'monospace', backgroundColor: '#E3F2FD', color: '#1565C0' }} />
                      )}
                      {rec.analysisTime && <Typography variant="caption" color="text.secondary">{rec.analysisTime.slice(0, 5)}</Typography>}
                      {rec.followUpOfAnalysisId && (
                        <Chip size="small" icon={<LinkIcon />} variant="outlined" color="info" label="Follow-up" />
                      )}
                      {followUpCount(rec.id) > 0 && (
                        <Chip size="small" variant="outlined" color="info" label={`${followUpCount(rec.id)} follow-up(s)`} />
                      )}
                    </Stack>
                    <Stack direction="row" spacing={0.5}>
                      {(rec.followUpOfAnalysisId || followUpCount(rec.id) > 0) && (
                        <Tooltip title="View trend"><IconButton size="small" onClick={() => setTrendAnchor(rec)}><Timeline fontSize="small" /></IconButton></Tooltip>
                      )}
                      {canEdit && (
                        <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(rec)}><Edit fontSize="small" /></IconButton></Tooltip>
                      )}
                      {canDelete && (
                        <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setDeleteTarget(rec)}><Delete fontSize="small" /></IconButton></Tooltip>
                      )}
                    </Stack>
                  </Stack>
                  {rec.analysedBy && <Typography variant="caption" color="text.secondary">Analysed by {rec.analysedBy}</Typography>}
                  {rec.followUpOfAnalysisId && (() => {
                    const parent = history.find((h) => h.id === rec.followUpOfAnalysisId);
                    return parent ? (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Follow-up of {refLabel(parent)}</Typography>
                    ) : null;
                  })()}
                </Box>
                <CardContent>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Parameter</TableCell>
                          <TableCell>Value</TableCell>
                          <TableCell>Unit</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rec.parameters.length === 0 ? (
                          <TableRow><TableCell colSpan={4}><Typography variant="caption" color="text.secondary">No parameters recorded.</Typography></TableCell></TableRow>
                        ) : rec.parameters.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell>{p.parameterName}</TableCell>
                            <TableCell>{p.value ?? '—'}</TableCell>
                            <TableCell>{p.unit ?? '—'}</TableCell>
                            <TableCell>{statusChip(p.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  {rec.actionToTake && (
                    <Alert severity="info" icon={false} sx={{ mt: 1.5, py: 0 }}>
                      <strong>Action to be taken:</strong> {rec.actionToTake}
                    </Alert>
                  )}
                  {outOfRangeCount(rec.parameters) > 0 && (
                    <Alert severity="warning" sx={{ mt: 1.5, py: 0 }}>
                      {outOfRangeCount(rec.parameters)} parameter(s) out of range.
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

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
              <Typography variant="body2" color="text.secondary">No analysis records for this plant yet.</Typography>
            ) : (
              <TableContainer sx={{ maxHeight: 400 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Sample Point</TableCell>
                      <TableCell>Sample Type</TableCell>
                      <TableCell>Analysed By</TableCell>
                      <TableCell>Parameters</TableCell>
                      <TableCell>Out of Range</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {history.map((h) => (
                      <TableRow key={h.id} hover selected={h.logDate.split('T')[0] === selectedDate}
                        sx={{ cursor: 'pointer' }} onClick={() => setSelectedDate(h.logDate.split('T')[0])}>
                        <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{dayjs(h.logDate).format('DD MMM YYYY')}</Typography></TableCell>
                        <TableCell>{h.samplePoint}</TableCell>
                        <TableCell>{h.sampleType}</TableCell>
                        <TableCell>{h.analysedBy || '—'}</TableCell>
                        <TableCell>{h.parameters.length}</TableCell>
                        <TableCell>{outOfRangeCount(h.parameters)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Collapse>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{editTarget ? 'Edit Analysis Record' : 'New Analysis Record'}</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2.5 }}>
          {saveError && <Alert severity="error" onClose={() => setSaveError(null)} sx={{ mb: 2 }}>{saveError}</Alert>}
          {samplePoints.length === 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              No sample points configured for this plant. Add one in Lab Admin first.
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mb: form.sampleRecordId ? 2.5 : 0 }}>
            <Grid size={{ xs: 12 }}>
              <Autocomplete<LabSampleRecord>
                size="small"
                options={sampleRecords}
                value={sampleRecords.find((s) => s.id === form.sampleRecordId) ?? null}
                onChange={(_, v) => handleSampleSelect(v?.id ?? '')}
                groupBy={(s) => `Logged ${fmtDate(s.logDate)}`}
                getOptionLabel={(s) => s.sampleId}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                filterOptions={(opts, state) => sampleFilter(opts, {
                  ...state, getOptionLabel: (s) => `${s.sampleId} ${s.samplePoint} ${s.sampleType} ${fmtDate(s.logDate)}`,
                })}
                noOptionsText="No samples found for this plant"
                renderOption={(props, s) => (
                  <li {...props} key={s.id}>
                    <Stack>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{s.sampleId}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {s.samplePoint} — {s.sampleType}
                        {s.collectedAt ? ` · Collected ${s.collectedAt}` : ''}
                        {s.linkedAnalysisCount > 0 ? ` · ${s.linkedAnalysisCount} analysis done` : ''}
                      </Typography>
                    </Stack>
                  </li>
                )}
                renderInput={(params) => (
                  <TextField {...params} required label="Select Sample Record"
                    placeholder="Search by sample ID, point or type — any day"
                    helperText={`Showing samples from all dates. This analysis will be recorded on ${fmtDate(selectedDate)} (the Log Date).`} />
                )}
              />
              {!form.sampleRecordId && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                  A sample record must be selected before entering analysis results.
                </Typography>
              )}
            </Grid>
          </Grid>

          {form.sampleRecordId && (
            <>
              <Grid container spacing={2} sx={{ mb: 2.5 }}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.5 }}>
                    Sample Point
                  </Typography>
                  <Chip label={form.samplePoint} size="small" variant="outlined" />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.5 }}>
                    Sample Type
                  </Typography>
                  <Chip label={form.sampleType} size="small" variant="outlined" />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Analysis Time" type="time" size="small" fullWidth
                    value={form.analysisTime} onChange={(e) => setForm((p) => ({ ...p, analysisTime: e.target.value }))}
                    slotProps={{ inputLabel: { shrink: true } }} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <PersonAutocomplete label="Analysed By" plantCode={selectedPlant}
                    value={form.analysedBy} onChange={(v) => setForm((p) => ({ ...p, analysedBy: v }))} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField label="Remarks" size="small" fullWidth multiline rows={2}
                    value={form.remarks} onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl size="small" fullWidth disabled={actions.length === 0 && !form.actionToTake}>
                    <InputLabel>Action To Be Taken</InputLabel>
                    <Select label="Action To Be Taken" value={form.actionToTake}
                      onChange={(e) => setForm((p) => ({ ...p, actionToTake: e.target.value }))}>
                      <MenuItem value=""><em>None</em></MenuItem>
                      {form.actionToTake && !actions.some((a) => a.name === form.actionToTake) && (
                        <MenuItem value={form.actionToTake}>{form.actionToTake} (inactive)</MenuItem>
                      )}
                      {actions.map((a) => <MenuItem key={a.id} value={a.name}>{a.name}</MenuItem>)}
                    </Select>
                    {actions.length === 0 && !form.actionToTake && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                        No actions configured yet — add them in Lab Admin → Actions.
                      </Typography>
                    )}
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Autocomplete<LabAnalysisRecord>
                    size="small"
                    options={followUpOptions}
                    value={history.find((h) => h.id === form.followUpOfAnalysisId) ?? null}
                    onChange={(_, v) => setForm((p) => ({ ...p, followUpOfAnalysisId: v?.id ?? null }))}
                    groupBy={(h) => (h.samplePoint === form.samplePoint ? 'Same sample point' : 'Other sample points')}
                    getOptionLabel={refLabel}
                    isOptionEqualToValue={(a, b) => a.id === b.id}
                    noOptionsText="No previous analyses"
                    renderInput={(params) => (
                      <TextField {...params} label="Follow-up of (previous analysis)"
                        placeholder="Optional — link to the earlier analysis"
                        helperText="Use when this re-tests a sample after treatment" />
                    )}
                  />
                </Grid>
              </Grid>

              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>Parameters</Typography>
                <Button size="small" startIcon={<Add />} onClick={addParamRow}>Add Row</Button>
              </Stack>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Parameter Name</TableCell>
                    <TableCell>Value</TableCell>
                    <TableCell>Unit</TableCell>
                    <TableCell align="right" sx={{ width: 60 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {form.parameters.map((row, idx) => {
                    const locked = !!row.samplePointParameterId;
                    return (
                      <TableRow key={idx}>
                        <TableCell>
                          {locked ? (
                            <Typography variant="body2">{row.parameterName}</Typography>
                          ) : (
                            <TextField size="small" fullWidth value={row.parameterName}
                              onChange={(e) => updateParamRow(idx, 'parameterName', e.target.value)} />
                          )}
                        </TableCell>
                        <TableCell>
                          <TextField size="small" type="number" fullWidth value={row.value}
                            onChange={(e) => updateParamRow(idx, 'value', e.target.value)} />
                        </TableCell>
                        <TableCell>
                          {locked ? (
                            <Typography variant="body2">{row.unit || '—'}</Typography>
                          ) : (
                            <TextField size="small" fullWidth value={row.unit}
                              onChange={(e) => updateParamRow(idx, 'unit', e.target.value)} />
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small" color="error" onClick={() => removeParamRow(idx)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </>
          )}
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button variant="outlined" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" sx={{ backgroundColor: ACCENT }} onClick={handleSave}
            disabled={saving || !isFormValid}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <Save />}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <AnalysisTrendDialog open={!!trendAnchor} onClose={() => setTrendAnchor(null)} anchor={trendAnchor} all={history} />

      <ConfirmDialog open={!!deleteTarget} title="Delete Analysis Record"
        message={`Delete the analysis record for "${deleteTarget?.samplePoint}"? This cannot be undone.`}
        confirmLabel="Delete" loading={deleting} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </Box>
  );
}

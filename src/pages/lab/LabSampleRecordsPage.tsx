import {
  Box, Card, CardContent, TextField, Button, CircularProgress, Alert, Typography,
  MenuItem, FormControl, InputLabel, Select, Grid, Divider, Chip, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Tooltip, Collapse, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { Save, Add, Edit, Delete, ContentPaste, History, ExpandMore, ExpandLess } from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import PersonAutocomplete from '../../components/lab/PersonAutocomplete';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { labSampleRecordsApi } from '../../api/lab/labSampleRecordsApi';
import { labSamplePointsApi } from '../../api/lab/labSamplePointsApi';
import type { PowerPlant } from '../../types/masterData';
import type { LabSampleRecord, LabSamplePoint } from '../../types/lab';
import { useSectionPermissions, usePlantFilter } from '../../hooks/usePermission';
import { usePlantTypeGuard } from '../../hooks/usePlantTypeGuard';

const ACCENT = '#00695C';
const STATUSES = ['Pending', 'In Progress', 'Complete'];
const STATUS_COLORS: Record<string, 'default' | 'primary' | 'success'> = {
  Pending: 'default', 'In Progress': 'primary', Complete: 'success',
};

interface SampleForm {
  samplePoint: string; sampleType: string; collectedBy: string;
  collectedAt: string; sentToLabAt: string; receivedAt: string;
  analysisStatus: string; remarks: string;
}

const emptyForm: SampleForm = {
  samplePoint: '', sampleType: 'Raw Water', collectedBy: '',
  collectedAt: '', sentToLabAt: '', receivedAt: '', analysisStatus: 'Pending', remarks: '',
};

export default function LabSampleRecordsPage() {
  const { canCreate, canEdit, canDelete } = useSectionPermissions('lab.samples');
  const isWrongPlantType = usePlantTypeGuard('thermal');
  const navigate = useNavigate();

  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const { availablePlants, plantLocked, autoPlantCode } = usePlantFilter(plants);

  const [selectedPlant, setSelectedPlant] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [samplePoints, setSamplePoints] = useState<LabSamplePoint[]>([]);

  const [records, setRecords] = useState<LabSampleRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<LabSampleRecord | null>(null);
  const [form, setForm] = useState<SampleForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [createdSampleId, setCreatedSampleId] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<LabSampleRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [analysisModal, setAnalysisModal] = useState<LabSampleRecord | null>(null);

  const [history, setHistory] = useState<LabSampleRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyCollapsed, setHistoryCollapsed] = useState(true);
  const [historyStatusFilter, setHistoryStatusFilter] = useState('');

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

  const fetchRecords = useCallback(async () => {
    if (!selectedPlant || !selectedDate) { setRecords([]); return; }
    setLoadingRecords(true); setRecordsError(null);
    try {
      const res = await labSampleRecordsApi.getAll({ plantCode: selectedPlant, date: selectedDate });
      setRecords(res.data);
    } catch {
      setRecordsError('Failed to load sample records.');
    } finally {
      setLoadingRecords(false);
    }
  }, [selectedPlant, selectedDate]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const fetchHistory = useCallback(async () => {
    if (!selectedPlant) { setHistory([]); return; }
    setLoadingHistory(true);
    try {
      const res = await labSampleRecordsApi.getAll({ plantCode: selectedPlant });
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
    setCreatedSampleId(null);
    setDialogOpen(true);
  };

  const openEdit = (row: LabSampleRecord) => {
    setEditTarget(row);
    setForm({
      samplePoint: row.samplePoint,
      sampleType: row.sampleType,
      collectedBy: row.collectedBy ?? '',
      collectedAt: row.collectedAt?.slice(0, 5) ?? '',
      sentToLabAt: row.sentToLabAt?.slice(0, 5) ?? '',
      receivedAt: row.receivedAt?.slice(0, 5) ?? '',
      analysisStatus: row.analysisStatus,
      remarks: row.remarks ?? '',
    });
    setSaveError(null);
    setCreatedSampleId(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.samplePoint.trim()) return;
    setSaving(true); setSaveError(null);
    try {
      const payload = {
        plantCode: selectedPlant,
        logDate: selectedDate,
        samplePoint: form.samplePoint,
        sampleType: form.sampleType,
        collectedBy: form.collectedBy || null,
        collectedAt: form.collectedAt || null,
        sentToLabAt: form.sentToLabAt || null,
        receivedAt: form.receivedAt || null,
        analysisStatus: form.analysisStatus,
        remarks: form.remarks || null,
      };
      if (editTarget) {
        await labSampleRecordsApi.update(editTarget.id, payload);
        setDialogOpen(false);
      } else {
        const res = await labSampleRecordsApi.create(payload);
        setCreatedSampleId(res.data.sampleId);
      }
      fetchRecords();
      fetchHistory();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setSaveError(msg ?? 'Failed to save sample record.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await labSampleRecordsApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchRecords();
      fetchHistory();
    } catch {
      setRecordsError('Failed to delete sample record.');
    } finally {
      setDeleting(false);
    }
  };

  const filteredHistory = historyStatusFilter ? history.filter((h) => h.analysisStatus === historyStatusFilter) : history;
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
        title="Sample Records"
        subtitle="Laboratory sample collection and tracking"
        breadcrumbs={[{ label: 'Chemical Lab' }, { label: 'Sample Records' }]}
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
                  Add Sample
                </Button>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {recordsError && <Alert severity="error" onClose={() => setRecordsError(null)} sx={{ mb: 2 }}>{recordsError}</Alert>}

      {showEmptyState ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <ContentPaste sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">Select a plant to load records.</Typography>
        </Box>
      ) : (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            {loadingRecords ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>
            ) : records.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <ContentPaste sx={{ fontSize: '2.5rem', color: 'text.disabled', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">No sample records for this date.</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Sample ID</TableCell>
                      <TableCell>Sample Point</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Collected By</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Analysis</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {records.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell><Chip label={row.sampleId} size="small" variant="outlined" sx={{ fontFamily: 'monospace' }} /></TableCell>
                        <TableCell>{row.samplePoint}</TableCell>
                        <TableCell>{row.sampleType}</TableCell>
                        <TableCell>{row.collectedBy ?? '—'}</TableCell>
                        <TableCell><Chip label={row.analysisStatus} size="small" color={STATUS_COLORS[row.analysisStatus] ?? 'default'} /></TableCell>
                        <TableCell>
                          {row.linkedAnalysisCount > 0 ? (
                            <Chip
                              label={`${row.linkedAnalysisCount} ${row.linkedAnalysisCount === 1 ? 'Analysis' : 'Analyses'}`}
                              size="small"
                              onClick={() => setAnalysisModal(row)}
                              sx={{
                                cursor: 'pointer',
                                backgroundColor: '#E3F2FD',
                                color: '#1565C0',
                                fontWeight: 600,
                                fontSize: 11,
                                '&:hover': { backgroundColor: '#BBDEFB' },
                              }}
                            />
                          ) : (
                            <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                              Not linked
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {canEdit && (
                            <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(row)}><Edit fontSize="small" /></IconButton></Tooltip>
                          )}
                          {canDelete && (
                            <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setDeleteTarget(row)}><Delete fontSize="small" /></IconButton></Tooltip>
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
              <Chip label={history.length} size="small" variant="outlined" />
            </Stack>
            <IconButton size="small">{historyCollapsed ? <ExpandMore fontSize="small" /> : <ExpandLess fontSize="small" />}</IconButton>
          </Box>
          <Collapse in={!historyCollapsed} timeout="auto" unmountOnExit>
            <CardContent>
              <FormControl size="small" sx={{ mb: 2, minWidth: 160 }}>
                <InputLabel>Status Filter</InputLabel>
                <Select label="Status Filter" value={historyStatusFilter} onChange={(e) => setHistoryStatusFilter(e.target.value)}>
                  <MenuItem value="">All</MenuItem>
                  {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
              {loadingHistory ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>
              ) : filteredHistory.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No sample records for this plant yet.</Typography>
              ) : (
                <TableContainer sx={{ maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Sample ID</TableCell>
                        <TableCell>Sample Point</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredHistory.map((h) => (
                        <TableRow key={h.id} hover selected={h.logDate.split('T')[0] === selectedDate}
                          sx={{ cursor: 'pointer' }} onClick={() => setSelectedDate(h.logDate.split('T')[0])}>
                          <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{dayjs(h.logDate).format('DD MMM YYYY')}</Typography></TableCell>
                          <TableCell>{h.sampleId}</TableCell>
                          <TableCell>{h.samplePoint}</TableCell>
                          <TableCell><Chip label={h.analysisStatus} size="small" color={STATUS_COLORS[h.analysisStatus] ?? 'default'} /></TableCell>
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
        <DialogTitle sx={{ fontWeight: 700 }}>{editTarget ? 'Edit Sample' : 'New Sample'}</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2.5 }}>
          {saveError && <Alert severity="error" onClose={() => setSaveError(null)} sx={{ mb: 2 }}>{saveError}</Alert>}
          {createdSampleId && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Sample created with ID <strong>{createdSampleId}</strong>.
            </Alert>
          )}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl size="small" fullWidth required>
                <InputLabel>Sample Point</InputLabel>
                <Select
                  value={form.samplePoint}
                  label="Sample Point"
                  onChange={(e) => {
                    const sp = samplePoints.find((s) => s.samplePointName === e.target.value);
                    setForm((prev) => ({
                      ...prev,
                      samplePoint: e.target.value,
                      sampleType: sp?.sampleType ?? prev.sampleType,
                    }));
                  }}
                >
                  {samplePoints.map((sp) => (
                    <MenuItem key={sp.id} value={sp.samplePointName}>
                      <Stack>
                        <Typography variant="body2">{sp.samplePointName}</Typography>
                        <Typography variant="caption" color="text.secondary">{sp.sampleType}</Typography>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Sample Type" size="small" fullWidth disabled value={form.sampleType} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <PersonAutocomplete label="Collected By" plantCode={selectedPlant}
                value={form.collectedBy} onChange={(v) => setForm((p) => ({ ...p, collectedBy: v }))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Analysis Status</InputLabel>
                <Select label="Analysis Status" value={form.analysisStatus} onChange={(e) => setForm((p) => ({ ...p, analysisStatus: e.target.value }))}>
                  {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Collected At" type="time" size="small" fullWidth
                value={form.collectedAt} onChange={(e) => setForm((p) => ({ ...p, collectedAt: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Sent To Lab At" type="time" size="small" fullWidth
                value={form.sentToLabAt} onChange={(e) => setForm((p) => ({ ...p, sentToLabAt: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Received At" type="time" size="small" fullWidth
                value={form.receivedAt} onChange={(e) => setForm((p) => ({ ...p, receivedAt: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField label="Remarks" size="small" fullWidth multiline rows={2}
                value={form.remarks} onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button variant="outlined" onClick={() => setDialogOpen(false)} disabled={saving}>Close</Button>
          <Button variant="contained" sx={{ backgroundColor: ACCENT }} onClick={handleSave}
            disabled={saving || !form.samplePoint.trim()}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <Save />}>
            {saving ? 'Saving...' : editTarget ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} title="Delete Sample Record"
        message={`Delete sample "${deleteTarget?.sampleId}" (${deleteTarget?.samplePoint})? This cannot be undone.`}
        confirmLabel="Delete" loading={deleting} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />

      <Dialog
        open={!!analysisModal}
        onClose={() => setAnalysisModal(null)}
        maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Linked Analyses — {analysisModal?.sampleId}
        </DialogTitle>
        <Divider />
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Sample Point: {analysisModal?.samplePoint} ({analysisModal?.sampleType})
          </Typography>
          {analysisModal?.linkedLabRefNumbers.length === 0 ? (
            <Typography variant="body2" color="text.disabled">No analyses linked.</Typography>
          ) : (
            <Stack spacing={1}>
              {analysisModal?.linkedLabRefNumbers.map((ref, i) => (
                <Chip key={i} label={ref} size="small"
                  sx={{ fontFamily: 'monospace', backgroundColor: '#E8F5E9',
                    color: '#1B5E20', fontWeight: 600, alignSelf: 'flex-start' }} />
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAnalysisModal(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

import {
  Box, Card, CardContent, TextField, Button, CircularProgress, Alert, Typography,
  MenuItem, FormControl, InputLabel, Select, Grid, Divider, Chip, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  Switch, FormControlLabel, Tabs, Tab,
} from '@mui/material';
import {
  AdminPanelSettings, Science, Biotech, Tune, Add, Edit, Delete, Save,
  CheckCircle, FiberManualRecord,
} from '@mui/icons-material';
import { useEffect, useState, useCallback, type SyntheticEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { labSamplePointsApi } from '../../api/lab/labSamplePointsApi';
import type { PowerPlant } from '../../types/masterData';
import type { LabSamplePoint, LabSamplePointParameter } from '../../types/lab';
import { useSectionPermissions, usePlantFilter } from '../../hooks/usePermission';
import { usePlantTypeGuard } from '../../hooks/usePlantTypeGuard';

const ACCENT = '#00695C';

const SAMPLE_TYPES = [
  'Raw Water', 'Treated Water', 'Steam', 'Condensate', 'Cooling Water', 'Sea Water', 'Demineralized Water',
];

const QUICK_PARAMS: { name: string; unit: string }[] = [
  { name: 'pH', unit: '' },
  { name: 'Conductivity', unit: 'µS/cm' },
  { name: 'Silica', unit: 'mg/L' },
  { name: 'Sodium', unit: 'mg/L' },
  { name: 'Iron', unit: 'mg/L' },
  { name: 'Phosphate', unit: 'mg/L' },
  { name: 'Dissolved Oxygen', unit: 'mg/L' },
  { name: 'Chlorine Free', unit: 'mg/L' },
  { name: 'Chlorine Total', unit: 'mg/L' },
  { name: 'Turbidity', unit: 'NTU' },
  { name: 'Temperature', unit: '°C' },
];

const TABS = [
  { label: 'Sample Points', icon: <Science fontSize="small" /> },
  { label: 'Parameters', icon: <Biotech fontSize="small" /> },
  { label: 'Control Limits', icon: <Tune fontSize="small" /> },
];

interface SamplePointForm {
  samplePointName: string; sampleType: string; description: string; isActive: boolean;
}
const emptySamplePointForm: SamplePointForm = { samplePointName: '', sampleType: SAMPLE_TYPES[0], description: '', isActive: true };

interface ParameterForm { parameterName: string; unit: string; }
const emptyParameterForm: ParameterForm = { parameterName: '', unit: '' };

interface LimitRowForm { minValue: string; maxValue: string; isActive: boolean; }

export default function LabAdminPage() {
  const { canCreate, canEdit, canDelete } = useSectionPermissions('lab.control_limits');
  const isWrongPlantType = usePlantTypeGuard('thermal');
  const navigate = useNavigate();

  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const { availablePlants, plantLocked, autoPlantCode } = usePlantFilter(plants);
  const [selectedPlant, setSelectedPlant] = useState('');
  const [tabIndex, setTabIndex] = useState(0);

  const [samplePoints, setSamplePoints] = useState<LabSamplePoint[]>([]);
  const [loadingSamplePoints, setLoadingSamplePoints] = useState(false);
  const [spError, setSpError] = useState<string | null>(null);

  useEffect(() => {
    powerPlantApi.getAll().then((res) =>
      setPlants(res.data.filter((p) => p.classificationType?.toLowerCase() === 'thermal'))
    );
  }, []);

  useEffect(() => {
    if (autoPlantCode) setSelectedPlant(autoPlantCode);
  }, [autoPlantCode]);

  const loadSamplePoints = useCallback(async () => {
    if (!selectedPlant) { setSamplePoints([]); return; }
    setLoadingSamplePoints(true); setSpError(null);
    try {
      const res = await labSamplePointsApi.getAll(selectedPlant);
      setSamplePoints(res.data);
    } catch {
      setSpError('Failed to load sample points.');
    } finally {
      setLoadingSamplePoints(false);
    }
  }, [selectedPlant]);

  useEffect(() => { loadSamplePoints(); }, [loadSamplePoints]);

  // ── Tab 1: Sample Points ───────────────────────────────────────────────────
  const [spDialogOpen, setSpDialogOpen] = useState(false);
  const [spEditTarget, setSpEditTarget] = useState<LabSamplePoint | null>(null);
  const [spForm, setSpForm] = useState<SamplePointForm>(emptySamplePointForm);
  const [spSaving, setSpSaving] = useState(false);
  const [spSaveError, setSpSaveError] = useState<string | null>(null);
  const [spDeleteTarget, setSpDeleteTarget] = useState<LabSamplePoint | null>(null);
  const [spDeleting, setSpDeleting] = useState(false);

  const openCreateSp = () => {
    setSpEditTarget(null);
    setSpForm(emptySamplePointForm);
    setSpSaveError(null);
    setSpDialogOpen(true);
  };

  const openEditSp = (row: LabSamplePoint) => {
    setSpEditTarget(row);
    setSpForm({
      samplePointName: row.samplePointName,
      sampleType: row.sampleType,
      description: row.description ?? '',
      isActive: row.isActive,
    });
    setSpSaveError(null);
    setSpDialogOpen(true);
  };

  const handleSaveSp = async () => {
    if (!selectedPlant || !spForm.samplePointName.trim()) return;
    setSpSaving(true); setSpSaveError(null);
    try {
      const payload = {
        plantCode: selectedPlant,
        samplePointName: spForm.samplePointName,
        sampleType: spForm.sampleType,
        description: spForm.description || null,
        isActive: spForm.isActive,
      };
      if (spEditTarget) {
        await labSamplePointsApi.update(spEditTarget.id, payload);
      } else {
        await labSamplePointsApi.create(payload);
      }
      setSpDialogOpen(false);
      loadSamplePoints();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setSpSaveError(msg ?? 'Failed to save sample point.');
    } finally {
      setSpSaving(false);
    }
  };

  const handleToggleSpActive = async (row: LabSamplePoint) => {
    if (!canEdit) return;
    try {
      await labSamplePointsApi.update(row.id, {
        plantCode: row.plantCode,
        samplePointName: row.samplePointName,
        sampleType: row.sampleType,
        description: row.description ?? null,
        isActive: !row.isActive,
      });
      loadSamplePoints();
    } catch {
      setSpError('Failed to update sample point.');
    }
  };

  const handleDeleteSp = async () => {
    if (!spDeleteTarget) return;
    setSpDeleting(true);
    try {
      await labSamplePointsApi.update(spDeleteTarget.id, {
        plantCode: spDeleteTarget.plantCode,
        samplePointName: spDeleteTarget.samplePointName,
        sampleType: spDeleteTarget.sampleType,
        description: spDeleteTarget.description ?? null,
        isActive: false,
      });
      setSpDeleteTarget(null);
      loadSamplePoints();
    } catch {
      setSpError('Failed to delete sample point.');
    } finally {
      setSpDeleting(false);
    }
  };

  // ── Tab 2: Parameters ──────────────────────────────────────────────────────
  const [paramsSpId, setParamsSpId] = useState('');
  const [paramDialogOpen, setParamDialogOpen] = useState(false);
  const [paramEditTarget, setParamEditTarget] = useState<LabSamplePointParameter | null>(null);
  const [paramForm, setParamForm] = useState<ParameterForm>(emptyParameterForm);
  const [paramSaving, setParamSaving] = useState(false);
  const [paramSaveError, setParamSaveError] = useState<string | null>(null);
  const [paramDeleteTarget, setParamDeleteTarget] = useState<LabSamplePointParameter | null>(null);
  const [paramDeleting, setParamDeleting] = useState(false);

  const paramsSamplePoint = samplePoints.find((sp) => sp.id === paramsSpId) ?? null;

  const openCreateParam = () => {
    setParamEditTarget(null);
    setParamForm(emptyParameterForm);
    setParamSaveError(null);
    setParamDialogOpen(true);
  };

  const openEditParam = (p: LabSamplePointParameter) => {
    setParamEditTarget(p);
    setParamForm({ parameterName: p.parameterName, unit: p.unit ?? '' });
    setParamSaveError(null);
    setParamDialogOpen(true);
  };

  const handleSaveParam = async () => {
    if (!paramsSpId || !paramForm.parameterName.trim()) return;
    setParamSaving(true); setParamSaveError(null);
    try {
      const payload = { parameterName: paramForm.parameterName, unit: paramForm.unit || null };
      if (paramEditTarget) {
        await labSamplePointsApi.updateParameter(paramsSpId, paramEditTarget.id, payload);
      } else {
        await labSamplePointsApi.addParameter(paramsSpId, payload);
      }
      setParamDialogOpen(false);
      loadSamplePoints();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setParamSaveError(msg ?? 'Failed to save parameter.');
    } finally {
      setParamSaving(false);
    }
  };

  const handleDeleteParam = async () => {
    if (!paramsSpId || !paramDeleteTarget) return;
    setParamDeleting(true);
    try {
      await labSamplePointsApi.updateParameter(paramsSpId, paramDeleteTarget.id, {
        parameterName: paramDeleteTarget.parameterName,
        unit: paramDeleteTarget.unit ?? null,
        isActive: false,
      });
      setParamDeleteTarget(null);
      loadSamplePoints();
    } catch {
      setParamSaveError('Failed to delete parameter.');
    } finally {
      setParamDeleting(false);
    }
  };

  // ── Tab 3: Control Limits ──────────────────────────────────────────────────
  const [limitsSpId, setLimitsSpId] = useState('');
  const [limitForms, setLimitForms] = useState<Record<string, LimitRowForm>>({});
  const [limitSaving, setLimitSaving] = useState<Record<string, boolean>>({});
  const [limitError, setLimitError] = useState<string | null>(null);
  const [limitSuccess, setLimitSuccess] = useState<string | null>(null);

  const limitsSamplePoint = samplePoints.find((sp) => sp.id === limitsSpId) ?? null;

  useEffect(() => {
    if (!limitsSamplePoint) { setLimitForms({}); return; }
    const forms: Record<string, LimitRowForm> = {};
    limitsSamplePoint.parameters.forEach((p) => {
      forms[p.id] = {
        minValue: p.controlLimit?.minValue != null ? String(p.controlLimit.minValue) : '',
        maxValue: p.controlLimit?.maxValue != null ? String(p.controlLimit.maxValue) : '',
        isActive: p.controlLimit?.isActive ?? true,
      };
    });
    setLimitForms(forms);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limitsSpId, samplePoints]);

  const updateLimitValue = (paramId: string, field: 'minValue' | 'maxValue', value: string) => {
    setLimitForms((prev) => ({ ...prev, [paramId]: { ...prev[paramId], [field]: value } }));
  };

  const updateLimitActive = (paramId: string, isActive: boolean) => {
    setLimitForms((prev) => ({ ...prev, [paramId]: { ...prev[paramId], isActive } }));
  };

  const handleSaveLimit = async (param: LabSamplePointParameter) => {
    if (!limitsSpId) return;
    const f = limitForms[param.id];
    if (!f) return;
    setLimitSaving((prev) => ({ ...prev, [param.id]: true }));
    setLimitError(null);
    setLimitSuccess(null);
    try {
      await labSamplePointsApi.setLimit(limitsSpId, param.id, {
        minValue: f.minValue !== '' ? Number(f.minValue) : null,
        maxValue: f.maxValue !== '' ? Number(f.maxValue) : null,
        isActive: f.isActive,
      });
      const recomputeRes = await labSamplePointsApi.recomputeStatus(limitsSpId, param.id);
      setLimitSuccess(`Control limit saved and ${recomputeRes.data.updatedCount} analysis records updated.`);
      loadSamplePoints();
    } catch {
      setLimitError('Failed to save control limit.');
    } finally {
      setLimitSaving((prev) => ({ ...prev, [param.id]: false }));
    }
  };

  const renderSamplePointsTab = () => (
    <Card>
      <Box sx={{
        px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: `${ACCENT}14`, borderBottom: '1px solid', borderColor: 'divider',
      }}>
        <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: ACCENT }}>
          Sample Points
        </Typography>
        {canCreate && (
          <Button size="small" variant="contained" sx={{ backgroundColor: ACCENT }} startIcon={<Add />} onClick={openCreateSp}>
            Add Sample Point
          </Button>
        )}
      </Box>
      <CardContent>
        {loadingSamplePoints ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>
        ) : samplePoints.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Science sx={{ fontSize: '2.5rem', color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">No sample points yet. Click Add Sample Point to get started.</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Sample Point Name</TableCell>
                  <TableCell>Sample Type</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Active</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {samplePoints.map((sp) => (
                  <TableRow key={sp.id} hover>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{sp.samplePointName}</Typography></TableCell>
                    <TableCell>{sp.sampleType}</TableCell>
                    <TableCell>{sp.description || '—'}</TableCell>
                    <TableCell>
                      <Chip label={sp.isActive ? 'Active' : 'Inactive'} size="small"
                        color={sp.isActive ? 'success' : 'default'} variant={sp.isActive ? 'filled' : 'outlined'}
                        onClick={canEdit ? () => handleToggleSpActive(sp) : undefined}
                        sx={canEdit ? { cursor: 'pointer' } : undefined} />
                    </TableCell>
                    <TableCell align="right">
                      {canEdit && (
                        <Tooltip title="Edit"><IconButton size="small" onClick={() => openEditSp(sp)}><Edit fontSize="small" /></IconButton></Tooltip>
                      )}
                      {canDelete && (
                        <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setSpDeleteTarget(sp)}><Delete fontSize="small" /></IconButton></Tooltip>
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
  );

  const renderParametersTab = () => (
    <Card>
      <Box sx={{ px: 2.5, py: 1.5, backgroundColor: `${ACCENT}14`, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: ACCENT }}>
          Parameters
        </Typography>
      </Box>
      <CardContent>
        <FormControl size="small" sx={{ minWidth: 280, mb: 2.5 }}>
          <InputLabel>Sample Point</InputLabel>
          <Select label="Sample Point" value={paramsSpId} onChange={(e) => setParamsSpId(e.target.value)}>
            <MenuItem value="">Select sample point…</MenuItem>
            {samplePoints.map((sp) => <MenuItem key={sp.id} value={sp.id}>{sp.samplePointName} ({sp.sampleType})</MenuItem>)}
          </Select>
        </FormControl>

        {!paramsSamplePoint ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Biotech sx={{ fontSize: '2.5rem', color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">Select a sample point to manage its parameters.</Typography>
          </Box>
        ) : (
          <>
            {paramSaveError && <Alert severity="error" onClose={() => setParamSaveError(null)} sx={{ mb: 2 }}>{paramSaveError}</Alert>}
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="body2" color="text.secondary">
                {paramsSamplePoint.parameters.length} parameter(s)
              </Typography>
              {canCreate && (
                <Button size="small" variant="contained" sx={{ backgroundColor: ACCENT }} startIcon={<Add />} onClick={openCreateParam}>
                  Add Parameter
                </Button>
              )}
            </Stack>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Parameter Name</TableCell>
                    <TableCell>Unit</TableCell>
                    <TableCell>Active</TableCell>
                    <TableCell>Has Control Limit</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paramsSamplePoint.parameters.length === 0 ? (
                    <TableRow><TableCell colSpan={5}><Typography variant="caption" color="text.secondary">No parameters yet.</Typography></TableCell></TableRow>
                  ) : paramsSamplePoint.parameters.map((p) => (
                    <TableRow key={p.id} hover>
                      <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{p.parameterName}</Typography></TableCell>
                      <TableCell>{p.unit || '—'}</TableCell>
                      <TableCell>
                        <Chip label={p.isActive ? 'Active' : 'Inactive'} size="small"
                          color={p.isActive ? 'success' : 'default'} variant={p.isActive ? 'filled' : 'outlined'} />
                      </TableCell>
                      <TableCell>
                        {p.controlLimit?.isActive
                          ? <CheckCircle sx={{ fontSize: 18, color: '#1B5E20' }} />
                          : <FiberManualRecord sx={{ fontSize: 12, color: '#BDBDBD' }} />}
                      </TableCell>
                      <TableCell align="right">
                        {canEdit && (
                          <Tooltip title="Edit"><IconButton size="small" onClick={() => openEditParam(p)}><Edit fontSize="small" /></IconButton></Tooltip>
                        )}
                        {canDelete && (
                          <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setParamDeleteTarget(p)}><Delete fontSize="small" /></IconButton></Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </CardContent>
    </Card>
  );

  const renderLimitsTab = () => (
    <Card>
      <Box sx={{ px: 2.5, py: 1.5, backgroundColor: `${ACCENT}14`, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: ACCENT }}>
          Control Limits
        </Typography>
      </Box>
      <CardContent>
        <FormControl size="small" sx={{ minWidth: 280, mb: 2.5 }}>
          <InputLabel>Sample Point</InputLabel>
          <Select label="Sample Point" value={limitsSpId} onChange={(e) => setLimitsSpId(e.target.value)}>
            <MenuItem value="">Select sample point…</MenuItem>
            {samplePoints.map((sp) => <MenuItem key={sp.id} value={sp.id}>{sp.samplePointName} ({sp.sampleType})</MenuItem>)}
          </Select>
        </FormControl>

        {limitError && <Alert severity="error" onClose={() => setLimitError(null)} sx={{ mb: 2 }}>{limitError}</Alert>}
        {limitSuccess && <Alert severity="success" onClose={() => setLimitSuccess(null)} sx={{ mb: 2 }}>{limitSuccess}</Alert>}

        {!limitsSamplePoint ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Tune sx={{ fontSize: '2.5rem', color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">Select a sample point to manage its control limits.</Typography>
          </Box>
        ) : limitsSamplePoint.parameters.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            This sample point has no parameters yet — add parameters in the Parameters tab first.
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Parameter</TableCell>
                  <TableCell>Unit</TableCell>
                  <TableCell>Min Value</TableCell>
                  <TableCell>Max Value</TableCell>
                  <TableCell>Active</TableCell>
                  <TableCell align="right">Save</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {limitsSamplePoint.parameters.map((p) => {
                  const f = limitForms[p.id] ?? { minValue: '', maxValue: '', isActive: true };
                  return (
                    <TableRow key={p.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{p.parameterName}</Typography>
                        {!p.controlLimit && (
                          <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic', display: 'block' }}>No limit set</Typography>
                        )}
                      </TableCell>
                      <TableCell>{p.unit || '—'}</TableCell>
                      <TableCell sx={{ width: 130 }}>
                        <TextField size="small" type="number" fullWidth value={f.minValue} disabled={!canEdit}
                          onChange={(e) => updateLimitValue(p.id, 'minValue', e.target.value)} />
                      </TableCell>
                      <TableCell sx={{ width: 130 }}>
                        <TextField size="small" type="number" fullWidth value={f.maxValue} disabled={!canEdit}
                          onChange={(e) => updateLimitValue(p.id, 'maxValue', e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <Switch size="small" checked={f.isActive} disabled={!canEdit}
                          onChange={(e) => updateLimitActive(p.id, e.target.checked)} />
                      </TableCell>
                      <TableCell align="right">
                        {canEdit && (
                          <Button size="small" variant="contained" sx={{ backgroundColor: ACCENT }}
                            onClick={() => handleSaveLimit(p)}
                            disabled={!!limitSaving[p.id]}
                            startIcon={limitSaving[p.id] ? <CircularProgress size={12} color="inherit" /> : <Save fontSize="small" />}>
                            Save
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );

  if (isWrongPlantType) return (
    <Alert severity="warning" sx={{ m: 3 }}>
      This section is only available for thermal plants.
      <Button size="small" onClick={() => navigate(-1)} sx={{ ml: 2 }}>Go Back</Button>
    </Alert>
  );

  return (
    <Box>
      <PageHeader
        title="Lab Admin"
        subtitle="Manage sample points, parameters and control limits"
        breadcrumbs={[{ label: 'Chemical Lab' }, { label: 'Lab Admin' }]}
      />

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth required disabled={plantLocked}>
                <InputLabel>Power Plant</InputLabel>
                <Select label="Power Plant" value={selectedPlant} onChange={(e) => setSelectedPlant(e.target.value)}>
                  {availablePlants.map((p: PowerPlant) => (
                    <MenuItem key={p.id} value={p.plantCode}>{p.plantName} ({p.plantCode})</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {loadingSamplePoints && (
              <Grid size={{ xs: 12, sm: 2 }}>
                <CircularProgress size={20} />
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {spError && <Alert severity="error" onClose={() => setSpError(null)} sx={{ mb: 2 }}>{spError}</Alert>}

      {!selectedPlant ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <AdminPanelSettings sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">Select a plant to manage lab admin data.</Typography>
        </Box>
      ) : (
        <>
          <Card sx={{ mb: 3 }}>
            <Tabs
              value={tabIndex}
              onChange={(_: SyntheticEvent, v: number) => setTabIndex(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                px: 1.5, py: 1,
                minHeight: 0,
                '& .MuiTabs-indicator': { display: 'none' },
                '& .MuiTabs-flexContainer': { gap: 1 },
                '& .MuiTab-root': {
                  minHeight: 40, textTransform: 'none', fontWeight: 600,
                  borderRadius: '20px', px: 2.5, color: 'text.secondary',
                },
                '& .MuiTab-root.Mui-selected': { backgroundColor: ACCENT, color: '#fff' },
              }}
            >
              {TABS.map((t) => <Tab key={t.label} label={t.label} icon={t.icon} iconPosition="start" />)}
            </Tabs>
          </Card>

          {tabIndex === 0 && renderSamplePointsTab()}
          {tabIndex === 1 && renderParametersTab()}
          {tabIndex === 2 && renderLimitsTab()}
        </>
      )}

      <Dialog open={spDialogOpen} onClose={() => setSpDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{spEditTarget ? 'Edit Sample Point' : 'New Sample Point'}</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2.5 }}>
          {spSaveError && <Alert severity="error" onClose={() => setSpSaveError(null)} sx={{ mb: 2 }}>{spSaveError}</Alert>}
          <Stack spacing={2.5}>
            <TextField label="Sample Point Name" size="small" fullWidth required
              value={spForm.samplePointName} onChange={(e) => setSpForm((p) => ({ ...p, samplePointName: e.target.value }))} />
            <FormControl fullWidth size="small">
              <InputLabel>Sample Type</InputLabel>
              <Select label="Sample Type" value={spForm.sampleType} onChange={(e) => setSpForm((p) => ({ ...p, sampleType: e.target.value }))}>
                {SAMPLE_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Description" size="small" fullWidth multiline rows={2}
              value={spForm.description} onChange={(e) => setSpForm((p) => ({ ...p, description: e.target.value }))} />
            <FormControlLabel
              control={
                <Switch checked={spForm.isActive}
                  onChange={(e) => setSpForm((p) => ({ ...p, isActive: e.target.checked }))}
                  color="success" />
              }
              label={<Typography variant="body2">{spForm.isActive ? 'Active' : 'Inactive'}</Typography>}
            />
          </Stack>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button variant="outlined" onClick={() => setSpDialogOpen(false)} disabled={spSaving}>Cancel</Button>
          <Button variant="contained" sx={{ backgroundColor: ACCENT }} onClick={handleSaveSp}
            disabled={spSaving || !spForm.samplePointName.trim()}
            startIcon={spSaving ? <CircularProgress size={14} color="inherit" /> : <Save />}>
            {spSaving ? 'Saving...' : spEditTarget ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={paramDialogOpen} onClose={() => setParamDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{paramEditTarget ? 'Edit Parameter' : 'New Parameter'}</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2.5 }}>
          {paramSaveError && <Alert severity="error" onClose={() => setParamSaveError(null)} sx={{ mb: 2 }}>{paramSaveError}</Alert>}
          {!paramEditTarget && (
            <Stack direction="row" spacing={0.75} sx={{ mb: 2, flexWrap: 'wrap' }} useFlexGap>
              {QUICK_PARAMS.map((qp) => (
                <Chip key={qp.name} label={qp.unit ? `${qp.name} (${qp.unit})` : qp.name} size="small" variant="outlined"
                  onClick={() => setParamForm({ parameterName: qp.name, unit: qp.unit })}
                  sx={{ cursor: 'pointer' }} />
              ))}
            </Stack>
          )}
          <Stack spacing={2.5}>
            <TextField label="Parameter Name" size="small" fullWidth required
              value={paramForm.parameterName} onChange={(e) => setParamForm((p) => ({ ...p, parameterName: e.target.value }))} />
            <TextField label="Unit" size="small" fullWidth placeholder="e.g. µS/cm, mg/L, °C, NTU"
              value={paramForm.unit} onChange={(e) => setParamForm((p) => ({ ...p, unit: e.target.value }))} />
          </Stack>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button variant="outlined" onClick={() => setParamDialogOpen(false)} disabled={paramSaving}>Cancel</Button>
          <Button variant="contained" sx={{ backgroundColor: ACCENT }} onClick={handleSaveParam}
            disabled={paramSaving || !paramForm.parameterName.trim()}
            startIcon={paramSaving ? <CircularProgress size={14} color="inherit" /> : <Save />}>
            {paramSaving ? 'Saving...' : paramEditTarget ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog open={!!spDeleteTarget} title="Delete Sample Point"
        message={`Delete "${spDeleteTarget?.samplePointName}"? This sets it inactive; existing analysis records are preserved.`}
        confirmLabel="Delete" loading={spDeleting} onConfirm={handleDeleteSp} onCancel={() => setSpDeleteTarget(null)} />

      <ConfirmDialog open={!!paramDeleteTarget} title="Delete Parameter"
        message={`Delete "${paramDeleteTarget?.parameterName}"? This sets it inactive; existing analysis records are preserved.`}
        confirmLabel="Delete" loading={paramDeleting} onConfirm={handleDeleteParam} onCancel={() => setParamDeleteTarget(null)} />
    </Box>
  );
}

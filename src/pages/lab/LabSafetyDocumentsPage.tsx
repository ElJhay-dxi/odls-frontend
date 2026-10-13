import { useSearchDeepLink } from '../../hooks/useSearchDeepLink';
import {
  Box, Card, CardContent, TextField, Button, CircularProgress, Alert, Typography,
  MenuItem, FormControl, InputLabel, Select, Grid, Divider, Chip, Stack, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Tooltip, Collapse, Dialog, DialogTitle, DialogContent, DialogActions,
  Checkbox, FormControlLabel, LinearProgress,
} from '@mui/material';
import {
  Save, Add, Edit, Delete, LocalFireDepartment, Air, History, ExpandMore, ExpandLess, Visibility,
} from '@mui/icons-material';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import SuggestAutocomplete from '../../components/lab/SuggestAutocomplete';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { labHotWorkApi, labGasFreeApi } from '../../api/lab/labSafetyDocsApi';
import type { PowerPlant } from '../../types/masterData';
import type { HotWorkPermit, GasFreeCertificate } from '../../types/lab';
import { useSectionPermissions, usePlantFilter } from '../../hooks/usePermission';
import { usePlantTypeGuard } from '../../hooks/usePlantTypeGuard';
import {
  HOT_WORK_CHECKLIST, CHECKLIST_TOTAL, splitChecklist, joinChecklist, SECTION_DEFAULTS, GAS_LOCATION_DEFAULTS,
} from './safetyDocsConfig';

const ACCENT = '#00695C';

type Form = Record<string, string>;

// ── Field lists (drive form <-> payload conversion) ──────────────────────────
const HW_TEXT = [
  'issuedTime', 'permitNumber', 'workArea', 'workToBeDone', 'hotWorkOperator', 'sectionUnit',
  'seniorAuthorisedPerson', 'nominatedSupervisor', 'expiresTime', 'supervisorSignedBy', 'supervisorSignedTime',
  'operatorSignedBy', 'timeStarted', 'timeCompleted', 'fireWatchName', 'gasOthers', 'gasTesterName',
  'finalCheckSupervisor', 'finalCheckFireOfficer', 'finalCheckSafetyOfficer', 'checklistCompletedBy', 'remarks',
];
const HW_DATE = [
  'expiresDate', 'supervisorSignedDate', 'finalCheckSupervisorDate', 'finalCheckFireOfficerDate',
  'finalCheckSafetyOfficerDate', 'checklistCompletedDate',
];
const HW_NUM = ['gasO2', 'gasCh4', 'gasCo', 'gasH2s'];
const HW_BOOL = ['canBeDoneElsewhere', 'fireWatchRequired', 'gasTestRequired'];

const GF_TEXT = [
  'certificateNo', 'safetyDocumentNo', 'location', 'plantApparatus', 'confinedSpace', 'hazardsAnticipated',
  'testsCarriedOut', 'precautions', 'validUntilTime', 'issuedByName', 'issuedTime', 'receivedByName', 'receivedTime', 'remarks',
];
const GF_DATE = ['validUntilDate', 'receivedDate'];

const now = () => new Date().toTimeString().slice(0, 5);
const dateOnly = (v?: string | null) => (v ? v.split('T')[0] : '');
const boolToStr = (v?: boolean | null) => (v === true ? 'yes' : v === false ? 'no' : '');
const fmtDate = (v?: string | null) => (v ? dayjs(v).format('DD MMM YYYY') : '—');
const errMsg = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

function buildForm(src: Record<string, unknown> | null, text: string[], dates: string[], nums: string[] = [], bools: string[] = []): Form {
  const f: Form = {};
  text.forEach((k) => { f[k] = String(src?.[k] ?? ''); });
  dates.forEach((k) => { f[k] = dateOnly(src?.[k] as string | null | undefined); });
  nums.forEach((k) => { f[k] = src?.[k] != null ? String(src[k]) : ''; });
  bools.forEach((k) => { f[k] = boolToStr(src?.[k] as boolean | null | undefined); });
  return f;
}

function buildPayload(f: Form, text: string[], dates: string[], nums: string[] = [], bools: string[] = []): Record<string, unknown> {
  const p: Record<string, unknown> = {};
  text.forEach((k) => { p[k] = f[k]?.trim() ? f[k].trim() : null; });
  dates.forEach((k) => { p[k] = f[k] || null; });
  nums.forEach((k) => { p[k] = f[k] !== '' && f[k] != null ? Number(f[k]) : null; });
  bools.forEach((k) => { p[k] = f[k] === 'yes' ? true : f[k] === 'no' ? false : null; });
  return p;
}

type Status = { label: string; color: 'success' | 'warning' | 'default' | 'error' | 'info' };

const expired = (date?: string | null, time?: string | null) => {
  if (!date) return false;
  const t = dayjs(`${dateOnly(date)}T${(time || '23:59').slice(0, 5)}`);
  return t.isValid() && t.isBefore(dayjs());
};

const hotWorkStatus = (r: HotWorkPermit): Status => {
  if (r.finalCheckSupervisor && r.finalCheckFireOfficer && r.finalCheckSafetyOfficer) return { label: 'Closed', color: 'default' };
  if (expired(r.expiresDate, r.expiresTime)) return { label: 'Expired', color: 'error' };
  if (!r.expiresDate && !r.expiresTime) return { label: 'Draft', color: 'info' };
  return { label: 'Active', color: 'success' };
};

const gasFreeStatus = (r: GasFreeCertificate): Status => {
  if (expired(r.validUntilDate, r.validUntilTime)) return { label: 'Expired', color: 'error' };
  if (!r.validUntilDate && !r.validUntilTime) return { label: 'Draft', color: 'info' };
  return { label: 'Valid', color: 'success' };
};

const SectionTitle = ({ children }: { children: string }) => (
  <Grid size={{ xs: 12 }}>
    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: ACCENT }}>
      {children}
    </Typography>
    <Divider sx={{ mt: 0.5 }} />
  </Grid>
);

const Detail = ({ label, value }: { label: string; value?: string | number | null }) => (
  <Grid size={{ xs: 12, sm: 6, md: 4 }}>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{value === undefined || value === null || value === '' ? '—' : value}</Typography>
  </Grid>
);

export default function LabSafetyDocumentsPage() {
  const { canCreate, canEdit, canDelete } = useSectionPermissions('lab.safetydocs');
  const isWrongPlantType = usePlantTypeGuard('thermal');
  const navigate = useNavigate();
  const deepLink = useSearchDeepLink();

  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const { availablePlants, plantLocked, autoPlantCode } = usePlantFilter(plants);
  const [selectedPlant, setSelectedPlant] = useState(deepLink.plant ?? '');
  const [selectedDate, setSelectedDate] = useState(deepLink.date ?? new Date().toISOString().split('T')[0]);
  const [tab, setTab] = useState(0); // 0 = Hot Work Permits, 1 = Gas Free Certificates

  const [permits, setPermits] = useState<HotWorkPermit[]>([]);
  const [certs, setCerts] = useState<GasFreeCertificate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [hwHistory, setHwHistory] = useState<HotWorkPermit[]>([]);
  const [gfHistory, setGfHistory] = useState<GasFreeCertificate[]>([]);
  const [historyCollapsed, setHistoryCollapsed] = useState(true);

  const [learnedAreas, setLearnedAreas] = useState<string[]>([]);
  const [learnedSections, setLearnedSections] = useState<string[]>([]);
  const [learnedLocations, setLearnedLocations] = useState<string[]>([]);

  // dialogs
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>({});
  const [checks, setChecks] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [viewPermit, setViewPermit] = useState<HotWorkPermit | null>(null);
  const [viewCert, setViewCert] = useState<GasFreeCertificate | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{ kind: 'hw' | 'gf'; id: string; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    powerPlantApi.getAll().then((res) =>
      setPlants(res.data.filter((p) => p.classificationType?.toLowerCase() === 'thermal')));
  }, []);
  useEffect(() => { if (autoPlantCode) setSelectedPlant(autoPlantCode); }, [autoPlantCode]);

  const loadSuggestions = useCallback(() => {
    labHotWorkApi.getSuggestions().then((r) => { setLearnedAreas(r.data.workAreas ?? []); setLearnedSections(r.data.sections ?? []); }).catch(() => undefined);
    labGasFreeApi.getSuggestions().then((r) => setLearnedLocations(r.data.locations ?? [])).catch(() => undefined);
  }, []);
  useEffect(() => { loadSuggestions(); }, [loadSuggestions]);

  const fetchDocs = useCallback(async () => {
    if (!selectedPlant || !selectedDate) { setPermits([]); setCerts([]); return; }
    setLoading(true); setError(null);
    try {
      const [a, b] = await Promise.all([
        labHotWorkApi.getAll({ plantCode: selectedPlant, date: selectedDate }),
        labGasFreeApi.getAll({ plantCode: selectedPlant, date: selectedDate }),
      ]);
      setPermits([...a.data].sort((x, y) => (x.issuedTime ?? '').localeCompare(y.issuedTime ?? '')));
      setCerts([...b.data].sort((x, y) => (x.issuedTime ?? '').localeCompare(y.issuedTime ?? '')));
    } catch {
      setError('Failed to load safety documents.');
    } finally {
      setLoading(false);
    }
  }, [selectedPlant, selectedDate]);
  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  // A search result for a certificate opens the Gas Free tab
  useEffect(() => {
    if (deepLink.record && certs.some((c) => c.id === deepLink.record) && !permits.some((p) => p.id === deepLink.record)) setTab(1);
  }, [certs, permits, deepLink.record]);

  const fetchHistory = useCallback(async () => {
    if (!selectedPlant) { setHwHistory([]); setGfHistory([]); return; }
    try {
      const [a, b] = await Promise.all([
        labHotWorkApi.getAll({ plantCode: selectedPlant }),
        labGasFreeApi.getAll({ plantCode: selectedPlant }),
      ]);
      setHwHistory(a.data); setGfHistory(b.data);
    } catch {
      setHwHistory([]); setGfHistory([]);
    }
  }, [selectedPlant]);
  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const historyGroups = useMemo(() => {
    const map = new Map<string, { hw: number; gf: number }>();
    hwHistory.forEach((r) => { const d = dateOnly(r.logDate); const g = map.get(d) ?? { hw: 0, gf: 0 }; g.hw++; map.set(d, g); });
    gfHistory.forEach((r) => { const d = dateOnly(r.logDate); const g = map.get(d) ?? { hw: 0, gf: 0 }; g.gf++; map.set(d, g); });
    return Array.from(map.entries()).map(([logDate, c]) => ({ logDate, ...c })).sort((a, b) => b.logDate.localeCompare(a.logDate));
  }, [hwHistory, gfHistory]);

  // ── Form helpers ──
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const txt = (k: string, label: string, opts: { type?: 'time' | 'date' | 'number'; rows?: number; size?: number } = {}) => (
    <Grid size={{ xs: 12, sm: opts.size ?? 6, md: opts.size ? opts.size : opts.rows ? 12 : 4 }}>
      <TextField label={label} size="small" fullWidth type={opts.type ?? 'text'}
        multiline={!!opts.rows} minRows={opts.rows}
        value={form[k] ?? ''} onChange={(e) => set(k, e.target.value)}
        slotProps={opts.type === 'time' || opts.type === 'date' ? { inputLabel: { shrink: true } } : undefined} />
    </Grid>
  );
  const yn = (k: string, label: string) => (
    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
      <TextField select label={label} size="small" fullWidth value={form[k] ?? ''} onChange={(e) => set(k, e.target.value)}>
        <MenuItem value=""><em>—</em></MenuItem>
        <MenuItem value="yes">Yes</MenuItem>
        <MenuItem value="no">No</MenuItem>
      </TextField>
    </Grid>
  );

  const openCreate = () => {
    setEditId(null); setSaveError(null);
    if (tab === 0) {
      setForm({ ...buildForm(null, HW_TEXT, HW_DATE, HW_NUM, HW_BOOL), issuedTime: now() });
      setChecks(new Set());
    } else {
      setForm({ ...buildForm(null, GF_TEXT, GF_DATE), issuedTime: now(), validUntilDate: selectedDate });
    }
    setDialogOpen(true);
  };

  const openEdit = (row: HotWorkPermit | GasFreeCertificate) => {
    setEditId(row.id); setSaveError(null);
    if (tab === 0) {
      setForm(buildForm(row as unknown as Record<string, unknown>, HW_TEXT, HW_DATE, HW_NUM, HW_BOOL));
      setChecks(splitChecklist((row as HotWorkPermit).checklistItems));
    } else {
      setForm(buildForm(row as unknown as Record<string, unknown>, GF_TEXT, GF_DATE));
    }
    setDialogOpen(true);
  };

  const toggleCheck = (key: string) =>
    setChecks((prev) => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });

  const handleSave = async () => {
    if (tab === 0 && !form.permitNumber?.trim()) { setSaveError('Enter the permit number.'); return; }
    if (tab === 1 && !form.certificateNo?.trim()) { setSaveError('Enter the certificate number.'); return; }
    setSaving(true); setSaveError(null);
    try {
      if (tab === 0) {
        const payload = { ...buildPayload(form, HW_TEXT, HW_DATE, HW_NUM, HW_BOOL), checklistItems: joinChecklist(checks), plantCode: selectedPlant, logDate: selectedDate };
        if (editId) await labHotWorkApi.update(editId, payload); else await labHotWorkApi.create(payload);
      } else {
        const payload = { ...buildPayload(form, GF_TEXT, GF_DATE), plantCode: selectedPlant, logDate: selectedDate };
        if (editId) await labGasFreeApi.update(editId, payload); else await labGasFreeApi.create(payload);
      }
      setDialogOpen(false);
      fetchDocs(); fetchHistory(); loadSuggestions();
    } catch (err: unknown) {
      setSaveError(errMsg(err, 'Failed to save.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.kind === 'hw') await labHotWorkApi.delete(deleteTarget.id); else await labGasFreeApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchDocs(); fetchHistory();
    } catch {
      setError('Failed to delete.');
    } finally {
      setDeleting(false);
    }
  };

  if (isWrongPlantType) return (
    <Alert severity="warning" sx={{ m: 3 }}>
      This section is only available for thermal plants.
      <Button size="small" onClick={() => navigate(-1)} sx={{ ml: 2 }}>Go Back</Button>
    </Alert>
  );

  const actions = (kind: 'hw' | 'gf', row: HotWorkPermit | GasFreeCertificate, label: string) => (
    <>
      <Tooltip title="View"><IconButton size="small" onClick={() => (kind === 'hw' ? setViewPermit(row as HotWorkPermit) : setViewCert(row as GasFreeCertificate))}><Visibility fontSize="small" /></IconButton></Tooltip>
      {canEdit && <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(row)}><Edit fontSize="small" /></IconButton></Tooltip>}
      {canDelete && <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setDeleteTarget({ kind, id: row.id, label })}><Delete fontSize="small" /></IconButton></Tooltip>}
    </>
  );

  const checklistCount = (r: HotWorkPermit) => splitChecklist(r.checklistItems).size;

  return (
    <Box>
      <PageHeader
        title="Safety Documents"
        subtitle="Hot Work Permits and Gas Free Certificates"
        breadcrumbs={[{ label: 'Chemical Lab' }, { label: 'Safety Documents' }]}
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
              <TextField label="Issue Date" type="date" fullWidth required
                value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 5 }} sx={{ textAlign: { sm: 'right' } }}>
              {canCreate && selectedPlant && (
                <Button variant="contained" sx={{ backgroundColor: ACCENT }} startIcon={<Add />} onClick={openCreate}>
                  {tab === 0 ? 'New Hot Work Permit' : 'New Gas Free Certificate'}
                </Button>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 1 }}
          slotProps={{ indicator: { sx: { backgroundColor: ACCENT } } }}>
          <Tab icon={<LocalFireDepartment fontSize="small" />} iconPosition="start" label={`Hot Work Permits (${permits.length})`} />
          <Tab icon={<Air fontSize="small" />} iconPosition="start" label={`Gas Free Certificates (${certs.length})`} />
        </Tabs>
        <CardContent>
          {!selectedPlant ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="body1" color="text.secondary">Select a plant to load records.</Typography>
            </Box>
          ) : loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>
          ) : tab === 0 ? (
            permits.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>No hot work permits issued on this date.</Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Permit No.</TableCell><TableCell>Issued</TableCell><TableCell>Work Area</TableCell>
                      <TableCell>Work to be done</TableCell><TableCell>Operator</TableCell><TableCell>Expires</TableCell>
                      <TableCell>Checklist</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {permits.map((r) => {
                      const st = hotWorkStatus(r);
                      return (
                        <TableRow key={r.id} data-record-id={r.id} hover>
                          <TableCell sx={{ fontWeight: 600 }}>{r.permitNumber ?? '—'}</TableCell>
                          <TableCell>{r.issuedTime?.slice(0, 5) ?? '—'}</TableCell>
                          <TableCell>{r.workArea ?? '—'}</TableCell>
                          <TableCell sx={{ maxWidth: 260 }}><Typography variant="body2" noWrap title={r.workToBeDone}>{r.workToBeDone ?? '—'}</Typography></TableCell>
                          <TableCell>{r.hotWorkOperator ?? '—'}</TableCell>
                          <TableCell>{r.expiresDate ? `${fmtDate(r.expiresDate)} ${r.expiresTime?.slice(0, 5) ?? ''}` : '—'}</TableCell>
                          <TableCell sx={{ minWidth: 90 }}>
                            <Typography variant="caption">{checklistCount(r)}/{CHECKLIST_TOTAL}</Typography>
                            <LinearProgress variant="determinate" value={(checklistCount(r) / CHECKLIST_TOTAL) * 100}
                              sx={{ height: 5, borderRadius: 3, '& .MuiLinearProgress-bar': { backgroundColor: ACCENT } }} />
                          </TableCell>
                          <TableCell><Chip size="small" label={st.label} color={st.color} /></TableCell>
                          <TableCell align="right">{actions('hw', r, `hot work permit ${r.permitNumber ?? ''}`)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )
          ) : certs.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>No gas free certificates issued on this date.</Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Certificate No.</TableCell><TableCell>Safety Doc. No.</TableCell><TableCell>Location</TableCell>
                    <TableCell>Confined Space</TableCell><TableCell>Issued</TableCell><TableCell>Valid until</TableCell>
                    <TableCell>Issued by (AGT)</TableCell><TableCell>Received by</TableCell><TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {certs.map((r) => {
                    const st = gasFreeStatus(r);
                    return (
                      <TableRow key={r.id} data-record-id={r.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{r.certificateNo ?? '—'}</TableCell>
                        <TableCell>{r.safetyDocumentNo ?? '—'}</TableCell>
                        <TableCell>{r.location ?? '—'}</TableCell>
                        <TableCell>{r.confinedSpace ?? '—'}</TableCell>
                        <TableCell>{r.issuedTime?.slice(0, 5) ?? '—'}</TableCell>
                        <TableCell>{r.validUntilDate ? `${fmtDate(r.validUntilDate)} ${r.validUntilTime?.slice(0, 5) ?? ''}` : '—'}</TableCell>
                        <TableCell>{r.issuedByName ?? '—'}</TableCell>
                        <TableCell>{r.receivedByName ?? <Typography variant="caption" color="text.secondary">Pending</Typography>}</TableCell>
                        <TableCell><Chip size="small" label={st.label} color={st.color} /></TableCell>
                        <TableCell align="right">{actions('gf', r, `gas free certificate ${r.certificateNo ?? ''}`)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {selectedPlant && (
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
              {historyGroups.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No safety documents recorded for this plant yet.</Typography>
              ) : (
                <TableContainer sx={{ maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow><TableCell>Date</TableCell><TableCell>Hot Work Permits</TableCell><TableCell>Gas Free Certificates</TableCell></TableRow>
                    </TableHead>
                    <TableBody>
                      {historyGroups.map((g) => (
                        <TableRow key={g.logDate} hover selected={g.logDate === selectedDate} sx={{ cursor: 'pointer' }}
                          onClick={() => setSelectedDate(g.logDate)}>
                          <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{dayjs(g.logDate).format('DD MMM YYYY')}</Typography></TableCell>
                          <TableCell>{g.hw}</TableCell>
                          <TableCell>{g.gf}</TableCell>
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

      {/* ── Create / edit dialog ── */}
      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} maxWidth="md" fullWidth scroll="paper">
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editId ? 'Edit' : 'New'} {tab === 0 ? 'Hot Work Permit' : 'Gas Free Certificate'}
          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
            {tab === 0 ? 'TC-SF-SAF-010 · Ver 2.00' : 'TC-SF-SAF-061 · Ver 1.00'} — signatures are recorded as the signatory&apos;s typed name
          </Typography>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2.5 }}>
          {saveError && <Alert severity="error" onClose={() => setSaveError(null)} sx={{ mb: 2 }}>{saveError}</Alert>}

          {tab === 0 ? (
            <Grid container spacing={2}>
              <SectionTitle>Instructions</SectionTitle>
              {yn('canBeDoneElsewhere', 'Can the work be done another way or in the Workshop?')}
              <Grid size={{ xs: 12, sm: 6, md: 8 }}>
                <Typography variant="caption" color="text.secondary">
                  If NO, the Part C precautions checklist must be followed. Once issued, the permit must be displayed in the work area.
                </Typography>
              </Grid>

              <SectionTitle>Part A — Issue</SectionTitle>
              {txt('permitNumber', 'Permit Number *')}
              {txt('issuedTime', 'Issued Time', { type: 'time' })}
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <SuggestAutocomplete label="Section / Unit" value={form.sectionUnit ?? ''} onChange={(v) => set('sectionUnit', v)}
                  defaults={SECTION_DEFAULTS} learned={learnedSections} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <SuggestAutocomplete label="Work Area" value={form.workArea ?? ''} onChange={(v) => set('workArea', v)}
                  defaults={[]} learned={learnedAreas} />
              </Grid>
              {txt('hotWorkOperator', 'Hot Work Operator', { size: 6 })}
              {txt('workToBeDone', 'Work to be done', { rows: 2 })}
              {txt('seniorAuthorisedPerson', 'Senior Authorised Person (name / signature)', { size: 6 })}
              {txt('nominatedSupervisor', 'Nominated Supervisor (name / signature)', { size: 6 })}

              <SectionTitle>Part B — Authorisation</SectionTitle>
              <Grid size={{ xs: 12 }}>
                <Typography variant="caption" color="text.secondary">
                  Nominated Supervisor verifies the work area has been examined and the Part C precautions have been taken to prevent FIRE. Certificate expires after no more than one shift.
                </Typography>
              </Grid>
              {txt('expiresTime', 'Certificate Expires — Time', { type: 'time' })}
              {txt('expiresDate', 'Certificate Expires — Date', { type: 'date' })}
              <Grid size={{ md: 4 }} sx={{ display: { xs: 'none', md: 'block' } }} />
              {txt('supervisorSignedBy', 'Nominated Supervisor — Signed')}
              {txt('supervisorSignedTime', 'Signed Time', { type: 'time' })}
              {txt('supervisorSignedDate', 'Signed Date', { type: 'date' })}
              {txt('operatorSignedBy', 'Hot Work Operator — Signed')}
              {txt('timeStarted', 'Time Started', { type: 'time' })}
              {txt('timeCompleted', 'Time Completed', { type: 'time' })}
              {yn('fireWatchRequired', 'Is Fire Watch required?')}
              {txt('fireWatchName', 'Fire Watch (if assigned) — Name / Signature', { size: 6 })}
              <Grid size={{ md: 2 }} sx={{ display: { xs: 'none', md: 'block' } }} />
              {yn('gasTestRequired', 'Flammable gas indicator test needed?')}
              {txt('gasTesterName', 'Gas test — Name / Signature', { size: 6 })}
              <Grid size={{ md: 2 }} sx={{ display: { xs: 'none', md: 'block' } }} />
              {txt('gasO2', 'Lab Test: O₂', { type: 'number', size: 3 })}
              {txt('gasCh4', 'CH₄', { type: 'number', size: 3 })}
              {txt('gasCo', 'CO', { type: 'number', size: 3 })}
              {txt('gasH2s', 'H₂S', { type: 'number', size: 3 })}
              {txt('gasOthers', 'Others', { size: 12 })}

              <SectionTitle>Part C — Precautions Checklist</SectionTitle>
              {HOT_WORK_CHECKLIST.map((g) => (
                <Grid key={g.title} size={{ xs: 12 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>{g.title}</Typography>
                  {g.items.map((it) => (
                    <FormControlLabel key={it.key} sx={{ display: 'flex', ml: 0.5 }}
                      control={<Checkbox size="small" checked={checks.has(it.key)} onChange={() => toggleCheck(it.key)} sx={{ '&.Mui-checked': { color: ACCENT } }} />}
                      label={<Typography variant="body2">{it.label}</Typography>} />
                  ))}
                </Grid>
              ))}
              {txt('checklistCompletedBy', 'Checklist completed — Nominated Supervisor', { size: 6 })}
              {txt('checklistCompletedDate', 'Date', { type: 'date', size: 6 })}

              <SectionTitle>Final Check</SectionTitle>
              <Grid size={{ xs: 12 }}>
                <Typography variant="caption" color="text.secondary">
                  Fire Watch period elapsed; work area inspected 30 minutes after completion and found Fire Safe. A permit with all three signatures is shown as Closed.
                </Typography>
              </Grid>
              {txt('finalCheckSupervisor', 'Nominated Supervisor — Signature', { size: 6 })}
              {txt('finalCheckSupervisorDate', 'Date', { type: 'date', size: 6 })}
              {txt('finalCheckFireOfficer', 'Fire Officer — Signature', { size: 6 })}
              {txt('finalCheckFireOfficerDate', 'Date', { type: 'date', size: 6 })}
              {txt('finalCheckSafetyOfficer', 'Safety Officer — Signature', { size: 6 })}
              {txt('finalCheckSafetyOfficerDate', 'Date', { type: 'date', size: 6 })}
              {txt('remarks', 'Remarks', { rows: 2 })}
            </Grid>
          ) : (
            <Grid container spacing={2}>
              <SectionTitle>Certificate</SectionTitle>
              {txt('certificateNo', 'Certificate No. *')}
              {txt('safetyDocumentNo', 'Safety Document No.')}
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <SuggestAutocomplete label="(i) Location" value={form.location ?? ''} onChange={(v) => set('location', v)}
                  defaults={GAS_LOCATION_DEFAULTS} learned={learnedLocations} />
              </Grid>
              {txt('plantApparatus', '(ii) Plant / Apparatus Identification', { size: 6 })}
              {txt('confinedSpace', '(iii) Confined Space', { size: 6 })}
              {txt('hazardsAnticipated', '(i) Hazards Anticipated', { rows: 2 })}
              {txt('testsCarriedOut', '(ii) Tests Carried Out', { rows: 2 })}
              {txt('precautions', 'Precautions to be taken', { rows: 2 })}

              <SectionTitle>Issue — Authorised Gas Tester (AGT)</SectionTitle>
              <Grid size={{ xs: 12 }}>
                <Typography variant="caption" color="text.secondary">
                  I certify that I have personally examined and tested the above-mentioned plant/apparatus/confined space and that it is gas free.
                </Typography>
              </Grid>
              {txt('validUntilTime', 'Valid until — Time', { type: 'time' })}
              {txt('validUntilDate', 'Valid until — Date', { type: 'date' })}
              <Grid size={{ md: 4 }} sx={{ display: { xs: 'none', md: 'block' } }} />
              {txt('issuedByName', 'Name / Signed (AGT)')}
              {txt('issuedTime', 'Issued Time', { type: 'time' })}
              <Grid size={{ md: 4 }} sx={{ display: { xs: 'none', md: 'block' } }} />

              <SectionTitle>Receipt — Authorised Entrant / Standby Person (AESP)</SectionTitle>
              <Grid size={{ xs: 12 }}>
                <Typography variant="caption" color="text.secondary">
                  I accept this certificate and have understood the precautions to be taken.
                </Typography>
              </Grid>
              {txt('receivedByName', 'Name / Signed (AESP)')}
              {txt('receivedTime', 'Time', { type: 'time' })}
              {txt('receivedDate', 'Date', { type: 'date' })}
              {txt('remarks', 'Remarks', { rows: 2 })}
            </Grid>
          )}
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button variant="outlined" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" sx={{ backgroundColor: ACCENT }} onClick={handleSave} disabled={saving}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <Save />}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── View: Hot Work Permit ── */}
      <Dialog open={!!viewPermit} onClose={() => setViewPermit(null)} maxWidth="md" fullWidth scroll="paper">
        {viewPermit && (
          <>
            <DialogTitle sx={{ fontWeight: 700 }}>
              Hot Work Permit {viewPermit.permitNumber}
              <Chip size="small" sx={{ ml: 1.5 }} label={hotWorkStatus(viewPermit).label} color={hotWorkStatus(viewPermit).color} />
            </DialogTitle>
            <Divider />
            <DialogContent>
              <Grid container spacing={2}>
                <SectionTitle>Part A</SectionTitle>
                <Detail label="Plant" value={viewPermit.plantName} />
                <Detail label="Issued" value={`${fmtDate(viewPermit.logDate)} ${viewPermit.issuedTime?.slice(0, 5) ?? ''}`} />
                <Detail label="Can be done another way / in workshop" value={viewPermit.canBeDoneElsewhere == null ? undefined : viewPermit.canBeDoneElsewhere ? 'Yes' : 'No'} />
                <Detail label="Work Area" value={viewPermit.workArea} />
                <Detail label="Section / Unit" value={viewPermit.sectionUnit} />
                <Detail label="Hot Work Operator" value={viewPermit.hotWorkOperator} />
                <Detail label="Work to be done" value={viewPermit.workToBeDone} />
                <Detail label="Senior Authorised Person" value={viewPermit.seniorAuthorisedPerson} />
                <Detail label="Nominated Supervisor" value={viewPermit.nominatedSupervisor} />
                <SectionTitle>Part B</SectionTitle>
                <Detail label="Expires" value={viewPermit.expiresDate ? `${fmtDate(viewPermit.expiresDate)} ${viewPermit.expiresTime?.slice(0, 5) ?? ''}` : undefined} />
                <Detail label="Supervisor signed" value={viewPermit.supervisorSignedBy ? `${viewPermit.supervisorSignedBy} · ${viewPermit.supervisorSignedTime?.slice(0, 5) ?? ''} ${viewPermit.supervisorSignedDate ? fmtDate(viewPermit.supervisorSignedDate) : ''}` : undefined} />
                <Detail label="Operator signed" value={viewPermit.operatorSignedBy} />
                <Detail label="Time started" value={viewPermit.timeStarted?.slice(0, 5)} />
                <Detail label="Time completed" value={viewPermit.timeCompleted?.slice(0, 5)} />
                <Detail label="Fire Watch required" value={viewPermit.fireWatchRequired == null ? undefined : viewPermit.fireWatchRequired ? `Yes${viewPermit.fireWatchName ? ` — ${viewPermit.fireWatchName}` : ''}` : 'No'} />
                <Detail label="Gas indicator test" value={viewPermit.gasTestRequired == null ? undefined : viewPermit.gasTestRequired ? 'Required' : 'Not required'} />
                <Detail label="Lab result" value={[
                  viewPermit.gasO2 != null ? `O₂=${viewPermit.gasO2}` : '', viewPermit.gasCh4 != null ? `CH₄=${viewPermit.gasCh4}` : '',
                  viewPermit.gasCo != null ? `CO=${viewPermit.gasCo}` : '', viewPermit.gasH2s != null ? `H₂S=${viewPermit.gasH2s}` : '',
                  viewPermit.gasOthers ? `Others=${viewPermit.gasOthers}` : '',
                ].filter(Boolean).join(', ') || undefined} />
                <Detail label="Gas tester" value={viewPermit.gasTesterName} />
                <SectionTitle>Part C — Checklist</SectionTitle>
                <Grid size={{ xs: 12 }}>
                  {HOT_WORK_CHECKLIST.map((g) => {
                    const ticked = splitChecklist(viewPermit.checklistItems);
                    return (
                      <Box key={g.title} sx={{ mb: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{g.title}</Typography>
                        {g.items.map((it) => (
                          <Typography key={it.key} variant="body2" color={ticked.has(it.key) ? 'text.primary' : 'text.disabled'}>
                            {ticked.has(it.key) ? '☑' : '☐'} {it.label}
                          </Typography>
                        ))}
                      </Box>
                    );
                  })}
                  <Typography variant="caption" color="text.secondary">
                    Completed by {viewPermit.checklistCompletedBy || '—'} · {fmtDate(viewPermit.checklistCompletedDate)}
                  </Typography>
                </Grid>
                <SectionTitle>Final Check</SectionTitle>
                <Detail label="Nominated Supervisor" value={viewPermit.finalCheckSupervisor ? `${viewPermit.finalCheckSupervisor} · ${fmtDate(viewPermit.finalCheckSupervisorDate)}` : undefined} />
                <Detail label="Fire Officer" value={viewPermit.finalCheckFireOfficer ? `${viewPermit.finalCheckFireOfficer} · ${fmtDate(viewPermit.finalCheckFireOfficerDate)}` : undefined} />
                <Detail label="Safety Officer" value={viewPermit.finalCheckSafetyOfficer ? `${viewPermit.finalCheckSafetyOfficer} · ${fmtDate(viewPermit.finalCheckSafetyOfficerDate)}` : undefined} />
                <Detail label="Remarks" value={viewPermit.remarks} />
                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary">
                    Recorded by {viewPermit.createdByName}{viewPermit.updatedByName ? ` · last updated by ${viewPermit.updatedByName}` : ''}
                  </Typography>
                </Grid>
              </Grid>
            </DialogContent>
            <Divider />
            <DialogActions sx={{ px: 3, py: 1.5 }}><Button onClick={() => setViewPermit(null)}>Close</Button></DialogActions>
          </>
        )}
      </Dialog>

      {/* ── View: Gas Free Certificate ── */}
      <Dialog open={!!viewCert} onClose={() => setViewCert(null)} maxWidth="md" fullWidth scroll="paper">
        {viewCert && (
          <>
            <DialogTitle sx={{ fontWeight: 700 }}>
              Gas Free Certificate {viewCert.certificateNo}
              <Chip size="small" sx={{ ml: 1.5 }} label={gasFreeStatus(viewCert).label} color={gasFreeStatus(viewCert).color} />
            </DialogTitle>
            <Divider />
            <DialogContent>
              <Grid container spacing={2}>
                <Detail label="Plant" value={viewCert.plantName} />
                <Detail label="Safety Document No." value={viewCert.safetyDocumentNo} />
                <Detail label="Location" value={viewCert.location} />
                <Detail label="Plant / Apparatus" value={viewCert.plantApparatus} />
                <Detail label="Confined Space" value={viewCert.confinedSpace} />
                <Grid size={{ xs: 12, md: 4 }} />
                <Detail label="Hazards Anticipated" value={viewCert.hazardsAnticipated} />
                <Detail label="Tests Carried Out" value={viewCert.testsCarriedOut} />
                <Detail label="Precautions to be taken" value={viewCert.precautions} />
                <SectionTitle>Issue (AGT)</SectionTitle>
                <Detail label="Issued by" value={viewCert.issuedByName} />
                <Detail label="Issued" value={`${fmtDate(viewCert.logDate)} ${viewCert.issuedTime?.slice(0, 5) ?? ''}`} />
                <Detail label="Valid until" value={viewCert.validUntilDate ? `${fmtDate(viewCert.validUntilDate)} ${viewCert.validUntilTime?.slice(0, 5) ?? ''}` : undefined} />
                <SectionTitle>Receipt (AESP)</SectionTitle>
                <Detail label="Received by" value={viewCert.receivedByName} />
                <Detail label="Time" value={viewCert.receivedTime?.slice(0, 5)} />
                <Detail label="Date" value={viewCert.receivedDate ? fmtDate(viewCert.receivedDate) : undefined} />
                <Detail label="Remarks" value={viewCert.remarks} />
                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary">
                    Recorded by {viewCert.createdByName}{viewCert.updatedByName ? ` · last updated by ${viewCert.updatedByName}` : ''}
                  </Typography>
                </Grid>
              </Grid>
            </DialogContent>
            <Divider />
            <DialogActions sx={{ px: 3, py: 1.5 }}><Button onClick={() => setViewCert(null)}>Close</Button></DialogActions>
          </>
        )}
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} title="Delete Document"
        message={`Delete ${deleteTarget?.label ?? 'this document'}? This cannot be undone.`}
        confirmLabel="Delete" loading={deleting} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </Box>
  );
}

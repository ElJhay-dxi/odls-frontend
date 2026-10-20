import {
  Box, Card, CardContent, CardHeader, TextField, Button,
  CircularProgress, Alert, Typography, Divider, Chip, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, IconButton, Tooltip, FormControl, InputLabel,
  Select, MenuItem, Switch, FormControlLabel, Dialog, DialogTitle,
  DialogContent, DialogActions, InputAdornment, Autocomplete, Grid, ListSubheader,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import { Add, Edit, Delete, PlaylistAdd, Search } from '@mui/icons-material';
import { useEffect, useState, useCallback, useMemo } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { hourlyExtraFieldApi } from '../../api/masterData/hourlyExtraFieldApi';
import type { PowerPlant } from '../../types/masterData';
import type {
  HourlyExtraField, ExtraFieldType, ExtraFieldLogType, LookupSource, LookupSourceInfo,
} from '../../types/hourlyExtraField';
import { useSectionPermissions } from '../../hooks/usePermission';

/** Sections already on each hourly form — picking one places the field inside that section. */
const BUILT_IN_SECTIONS: Record<ExtraFieldLogType, string[]> = {
  thermal: ['Generator', 'Compressor', 'Turbine', 'EX2000', 'Steam Turbine Generator (STG)'],
  hydro: ['Generator', 'Turbine', 'Transformer'],
};
const DEFAULT_EXTRA_SECTION = 'Additional Readings';
const LOG_LABELS: Record<ExtraFieldLogType, string> = { thermal: 'Thermal', hydro: 'Hydro' };
const TYPE_LABELS: Record<ExtraFieldType, string> = { number: 'Number', text: 'Text', select: 'Dropdown', lookup: 'Pick from master data' };

interface FormState {
  logType: ExtraFieldLogType;
  allPlants: boolean;
  plantCodes: string[];
  section: string;
  label: string;
  measureUnit: string;
  fieldType: ExtraFieldType;
  options: string[];
  lookupSource: LookupSource | '';
  isRequired: boolean;
  minValue: string;
  maxValue: string;
  displayOrder: string;
  isActive: boolean;
}

const emptyForm = (logType: ExtraFieldLogType): FormState => ({
  logType, allPlants: false, plantCodes: [],
  section: DEFAULT_EXTRA_SECTION, label: '', measureUnit: '',
  fieldType: 'number', options: [], lookupSource: '', isRequired: false,
  minValue: '', maxValue: '', displayOrder: '0', isActive: true,
});

const toNum = (v: string) => (v.trim() === '' || isNaN(Number(v)) ? null : Number(v));

export default function HourlyExtraFieldsPage() {
  const { canCreate, canEdit, canDelete } = useSectionPermissions('hourly.extra_fields');

  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const [lookupSources, setLookupSources] = useState<LookupSourceInfo[]>([]);
  const [records, setRecords] = useState<HourlyExtraField[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [logType, setLogType] = useState<ExtraFieldLogType>('thermal');
  const [filterText, setFilterText] = useState('');
  const [filterPlant, setFilterPlant] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<HourlyExtraField | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm('thermal'));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<HourlyExtraField | null>(null);
  const [deleting, setDeleting] = useState(false);

  const sourceLabel = (s?: string | null) => lookupSources.find((x) => x.key === s)?.label ?? s ?? '';
  const plantsOf = useCallback(
    (type: ExtraFieldLogType) => plants.filter((p) => p.classificationType?.toLowerCase() === type),
    [plants],
  );

  useEffect(() => {
    powerPlantApi.getAll()
      .then((res) => setPlants(res.data))
      .catch(() => setError('Failed to load plants.'));
    hourlyExtraFieldApi.getLookupSources()
      .then((res) => setLookupSources(res.data))
      .catch(() => setLookupSources([]));
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await hourlyExtraFieldApi.getAll();
      setRecords(res.data);
    } catch {
      setError('Failed to load hourly extra fields.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  // Section suggestions: the log's built-in sections plus any custom section already used on that log
  const sectionOptions = useMemo(() => {
    const used = records.filter((r) => r.logType === form.logType).map((r) => r.section);
    return Array.from(new Set([DEFAULT_EXTRA_SECTION, ...BUILT_IN_SECTIONS[form.logType], ...used]));
  }, [records, form.logType]);

  const openCreate = () => {
    setEditTarget(null);
    setForm({ ...emptyForm(logType), plantCodes: filterPlant ? [filterPlant] : [] });
    setSaveError(null);
    setDialogOpen(true);
  };

  const openEdit = (row: HourlyExtraField) => {
    setEditTarget(row);
    setForm({
      logType: row.logType,
      allPlants: row.allPlants,
      plantCodes: row.plants.map((p) => p.plantCode),
      section: row.section,
      label: row.label,
      measureUnit: row.measureUnit ?? '',
      fieldType: row.fieldType,
      options: row.options ?? [],
      lookupSource: row.lookupSource ?? '',
      isRequired: row.isRequired,
      minValue: row.minValue != null ? String(row.minValue) : '',
      maxValue: row.maxValue != null ? String(row.maxValue) : '',
      displayOrder: String(row.displayOrder ?? 0),
      isActive: row.isActive,
    });
    setSaveError(null);
    setDialogOpen(true);
  };

  const formError = (): string | null => {
    if (!form.allPlants && form.plantCodes.length === 0) return 'Choose the plants, or switch on all plants.';
    if (!form.label.trim()) return 'Enter a label.';
    if (!form.section.trim()) return 'Enter a section.';
    if (form.fieldType === 'select' && form.options.length === 0) return 'Add at least one dropdown option.';
    if (form.fieldType === 'lookup' && !form.lookupSource) return 'Choose what the field picks from.';
    const min = toNum(form.minValue), max = toNum(form.maxValue);
    if (min != null && max != null && min > max) return 'Minimum cannot be greater than maximum.';
    return null;
  };

  const handleSave = async () => {
    const problem = formError();
    if (problem) { setSaveError(problem); return; }
    setSaving(true);
    setSaveError(null);
    try {
      const isNumber = form.fieldType === 'number';
      const payload = {
        allPlants: form.allPlants,
        plantCodes: form.allPlants ? [] : form.plantCodes,
        section: form.section.trim(),
        label: form.label.trim(),
        measureUnit: form.measureUnit.trim() || null,
        fieldType: form.fieldType,
        options: form.fieldType === 'select' ? form.options : [],
        lookupSource: form.fieldType === 'lookup' && form.lookupSource ? form.lookupSource : null,
        isRequired: form.isRequired,
        minValue: isNumber ? toNum(form.minValue) : null,
        maxValue: isNumber ? toNum(form.maxValue) : null,
        displayOrder: Number(form.displayOrder) || 0,
        isActive: form.isActive,
      };
      if (editTarget) {
        await hourlyExtraFieldApi.update(editTarget.id, payload);
      } else {
        await hourlyExtraFieldApi.create({ ...payload, logType: form.logType });
      }
      setDialogOpen(false);
      fetchRecords();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setSaveError(msg ?? 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await hourlyExtraFieldApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchRecords();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Failed to delete field.');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const filtered = records.filter((r) => {
    if (r.logType !== logType) return false;
    const q = filterText.toLowerCase();
    const matchText = !q || r.label.toLowerCase().includes(q) || r.section.toLowerCase().includes(q);
    const matchPlant = !filterPlant || r.allPlants || r.plants.some((p) => p.plantCode === filterPlant);
    const matchActive = filterActive === 'all' ? true : filterActive === 'active' ? r.isActive : !r.isActive;
    return matchText && matchPlant && matchActive;
  });

  const rangeText = (r: HourlyExtraField) => {
    if (r.fieldType !== 'number' || (r.minValue == null && r.maxValue == null)) return '—';
    if (r.minValue != null && r.maxValue != null) return `${r.minValue} – ${r.maxValue}`;
    return r.minValue != null ? `≥ ${r.minValue}` : `≤ ${r.maxValue}`;
  };

  const typeLocked = !!editTarget?.hasValues;
  const formPlants = plantsOf(form.logType);
  const typeName = LOG_LABELS[form.logType].toLowerCase();

  return (
    <Box>
      <PageHeader
        title="Hourly Extra Fields"
        subtitle="Extra readings on the hourly logs, for every plant of a type or for chosen plants."
        breadcrumbs={[{ label: 'Hourly Readings' }, { label: 'Hourly Extra Fields' }]}
      />

      <Card>
        <CardHeader
          title={
            <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap' }} spacing={1.5} useFlexGap>
              <PlaylistAdd sx={{ color: 'text.secondary' }} />
              <Typography sx={{ fontWeight: 700 }}>Hourly Extra Fields</Typography>
              <ToggleButtonGroup size="small" exclusive value={logType}
                onChange={(_, v: ExtraFieldLogType | null) => { if (v) { setLogType(v); setFilterPlant(''); } }}>
                <ToggleButton value="thermal">Thermal hourly</ToggleButton>
                <ToggleButton value="hydro">Hydro hourly</ToggleButton>
              </ToggleButtonGroup>
              <Chip label={`${filtered.length}`} size="small" variant="outlined" />
            </Stack>
          }
          action={
            canCreate && (
              <Button variant="contained" startIcon={<Add />} onClick={openCreate} size="small">
                Add Field
              </Button>
            )
          }
        />
        <Divider />
        <CardContent>
          {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

          <Stack direction="row" spacing={1.5} sx={{ mb: 2.5, flexWrap: 'wrap' }} useFlexGap>
            <TextField
              size="small" placeholder="Search label or section…"
              value={filterText} onChange={(e) => setFilterText(e.target.value)}
              sx={{ minWidth: 240 }}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment> } }}
            />
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Plant</InputLabel>
              <Select label="Plant" value={filterPlant} onChange={(e) => setFilterPlant(e.target.value)}>
                <MenuItem value="">All {LOG_LABELS[logType]} Plants</MenuItem>
                {plantsOf(logType).map((p) => <MenuItem key={p.id} value={p.plantCode}>{p.plantName} ({p.plantCode})</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Status</InputLabel>
              <Select label="Status" value={filterActive} onChange={(e) => setFilterActive(e.target.value as typeof filterActive)}>
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          {loading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress size={28} /></Box>
          ) : filtered.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <PlaylistAdd sx={{ fontSize: '2.5rem', color: 'text.disabled', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                {records.filter((r) => r.logType === logType).length === 0
                  ? `No ${LOG_LABELS[logType].toLowerCase()} extra fields yet. Click Add Field to get started.`
                  : 'No results match your filters.'}
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Applies to</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Section</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Field</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Range</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 70 }}>Order</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 90 }}>Status</TableCell>
                    <TableCell align="right" sx={{ width: 90 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((row) => (
                    <TableRow key={row.id} data-record-id={row.id} hover>
                      <TableCell>
                        {row.allPlants ? (
                          <Chip label={`All ${LOG_LABELS[row.logType].toLowerCase()} plants`} size="small" color="primary" />
                        ) : (
                          <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', maxWidth: 220 }} useFlexGap>
                            {row.plants.map((p) => (
                              <Tooltip key={p.plantCode} title={p.plantName}>
                                <Chip label={p.plantCode} size="small" color="primary" variant="outlined"
                                  sx={{ fontWeight: 700, fontFamily: 'monospace' }} />
                              </Tooltip>
                            ))}
                          </Stack>
                        )}
                      </TableCell>
                      <TableCell><Typography variant="body2">{row.section}</Typography></TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {row.label}{row.measureUnit ? ` (${row.measureUnit})` : ''}
                        </Typography>
                        {row.isRequired && <Typography variant="caption" color="error.main">Required</Typography>}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{TYPE_LABELS[row.fieldType] ?? row.fieldType}</Typography>
                        {(row.fieldType === 'select' || row.fieldType === 'lookup') && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 220 }}>
                            {row.fieldType === 'select' ? row.options.join(', ') : sourceLabel(row.lookupSource)}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell><Typography variant="body2">{rangeText(row)}</Typography></TableCell>
                      <TableCell><Typography variant="body2">{row.displayOrder}</Typography></TableCell>
                      <TableCell>
                        <Chip
                          label={row.isActive ? 'Active' : 'Inactive'} size="small"
                          color={row.isActive ? 'success' : 'default'}
                          variant={row.isActive ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {canEdit && (
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => openEdit(row)}>
                              <Edit sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                        {canDelete && (
                          <Tooltip title={row.hasValues ? 'Has saved readings. Edit and switch it to Inactive instead.' : 'Delete'}>
                            <span>
                              <IconButton size="small" color="error" disabled={row.hasValues} onClick={() => setDeleteTarget(row)}>
                                <Delete sx={{ fontSize: 16 }} />
                              </IconButton>
                            </span>
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

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editTarget ? 'Edit Hourly Extra Field' : 'New Hourly Extra Field'}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2.5 }}>
          {saveError && <Alert severity="error" onClose={() => setSaveError(null)} sx={{ mb: 2 }}>{saveError}</Alert>}
          <Stack spacing={2.5}>
            <FormControl fullWidth size="small" disabled={!!editTarget}>
              <InputLabel>Hourly log</InputLabel>
              <Select label="Hourly log" value={form.logType}
                onChange={(e) => {
                  const lt = e.target.value as ExtraFieldLogType;
                  setForm((p) => ({ ...p, logType: lt, plantCodes: [], section: DEFAULT_EXTRA_SECTION }));
                }}>
                <MenuItem value="thermal">Thermal hourly readings</MenuItem>
                <MenuItem value="hydro">Hydro hourly readings</MenuItem>
              </Select>
              {editTarget && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1.5 }}>
                  The log can't be changed. Add a new field for the other log instead.
                </Typography>
              )}
            </FormControl>

            <Box>
              <FormControlLabel
                control={<Switch checked={form.allPlants} onChange={(e) => setForm((p) => ({ ...p, allPlants: e.target.checked }))} />}
                label={<Typography variant="body2">All {typeName} plants, including ones added later</Typography>}
              />
              {!form.allPlants && (
                <Autocomplete
                  multiple size="small" disableCloseOnSelect sx={{ mt: 1 }}
                  options={formPlants.map((p) => p.plantCode)}
                  getOptionLabel={(code) => {
                    const p = formPlants.find((x) => x.plantCode === code);
                    return p ? `${p.plantName} (${p.plantCode})` : code;
                  }}
                  value={form.plantCodes}
                  onChange={(_, v) => setForm((p) => ({ ...p, plantCodes: v }))}
                  renderInput={(params) => (
                    <TextField {...params} required label="Plants"
                      placeholder={form.plantCodes.length ? '' : `Choose ${typeName} plants`}
                      helperText={editTarget ? 'Removing a plant hides the field there; readings already saved keep their values.' : undefined} />
                  )}
                />
              )}
            </Box>

            <Autocomplete
              freeSolo size="small" options={sectionOptions}
              value={form.section} inputValue={form.section}
              onChange={(_, v) => setForm((p) => ({ ...p, section: v ?? '' }))}
              onInputChange={(_, v) => setForm((p) => ({ ...p, section: v }))}
              renderInput={(params) => (
                <TextField {...params} required label="Section"
                  helperText="Pick an existing section to place the field inside it, or type a new heading." />
              )}
            />

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField label="Label" required size="small" fullWidth
                  value={form.label} placeholder="e.g. Max Bearing Temp"
                  onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField label="Unit" size="small" fullWidth
                  value={form.measureUnit} placeholder="e.g. °C"
                  onChange={(e) => setForm((p) => ({ ...p, measureUnit: e.target.value }))} />
              </Grid>
            </Grid>

            <FormControl fullWidth size="small" disabled={typeLocked}>
              <InputLabel>Type</InputLabel>
              <Select label="Type" value={form.fieldType}
                onChange={(e) => setForm((p) => ({ ...p, fieldType: e.target.value as ExtraFieldType }))}>
                <MenuItem value="number">Number</MenuItem>
                <MenuItem value="text">Text</MenuItem>
                <MenuItem value="select">Dropdown (own options)</MenuItem>
                <MenuItem value="lookup">Pick from master data</MenuItem>
              </Select>
              {typeLocked && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1.5 }}>
                  This field already has saved readings, so its type{form.fieldType === 'lookup' ? ' and source are' : ' is'} locked.
                </Typography>
              )}
            </FormControl>

            {form.fieldType === 'lookup' && (
              <FormControl fullWidth size="small" required disabled={typeLocked}>
                <InputLabel>Picks from</InputLabel>
                <Select label="Picks from" value={form.lookupSource}
                  onChange={(e) => setForm((p) => ({ ...p, lookupSource: e.target.value as LookupSource }))}>
                  {lookupSources.some((s) => s.scope === 'plant') && <ListSubheader>For the plant</ListSubheader>}
                  {lookupSources.filter((s) => s.scope === 'plant').map((s) => <MenuItem key={s.key} value={s.key}>{s.label}</MenuItem>)}
                  {lookupSources.some((s) => s.scope === 'unit') && <ListSubheader>For the unit on the hourly form</ListSubheader>}
                  {lookupSources.filter((s) => s.scope === 'unit').map((s) => <MenuItem key={s.key} value={s.key}>{s.label}</MenuItem>)}
                </Select>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1.5 }}>
                  Each plant's hourly form lists what's already set up for it (or its unit) in Master Data, so nothing is typed twice.
                </Typography>
              </FormControl>
            )}

            {form.fieldType === 'select' && (
              <Autocomplete
                multiple freeSolo size="small" options={[]}
                value={form.options}
                onChange={(_, v) => setForm((p) => ({ ...p, options: (v as string[]).map((o) => o.trim()).filter(Boolean) }))}
                renderInput={(params) => (
                  <TextField {...params} required label="Dropdown options"
                    placeholder={form.options.length ? '' : 'Type an option and press Enter'} />
                )}
              />
            )}

            {form.fieldType === 'number' && (
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <TextField label="Minimum" type="number" size="small" fullWidth
                    value={form.minValue} helperText="Optional"
                    onChange={(e) => setForm((p) => ({ ...p, minValue: e.target.value }))} />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField label="Maximum" type="number" size="small" fullWidth
                    value={form.maxValue} helperText="Optional"
                    onChange={(e) => setForm((p) => ({ ...p, maxValue: e.target.value }))} />
                </Grid>
              </Grid>
            )}

            <TextField label="Display order" type="number" size="small" sx={{ maxWidth: 160 }}
              value={form.displayOrder} helperText="Lower shows first"
              onChange={(e) => setForm((p) => ({ ...p, displayOrder: e.target.value }))} />

            <FormControlLabel
              control={<Switch checked={form.isRequired} onChange={(e) => setForm((p) => ({ ...p, isRequired: e.target.checked }))} />}
              label={<Typography variant="body2">Required while the unit is running</Typography>}
            />
            <FormControlLabel
              control={<Switch checked={form.isActive} color="success" onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} />}
              label={
                <Typography variant="body2">
                  {form.isActive ? 'Active: shown on the hourly form' : 'Inactive: hidden from new readings, past values kept'}
                </Typography>
              }
            />
          </Stack>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button variant="outlined" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}>
            {saving ? 'Saving...' : editTarget ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Hourly Extra Field"
        message={`Delete "${deleteTarget?.label}"? This cannot be undone.`}
        confirmLabel="Delete" loading={deleting}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
